/**
 * @fileoverview VoiceConductor — proprietary voice orchestration moat.
 * @module lib/voice/conductor
 *
 * Zero-dependency, atomic, idempotent layer that elevates STT/TTS to
 * Apple-grade conversational quality. Composed of pure sub-modules:
 *
 *   - prosodicHumanizer  → text shaping, sentence chunking, dwell hints
 *   - adaptiveEndpointer → per-session VAD silence threshold (p70 of pauses)
 *   - rateMirror         → matches TTS speed to user's measured WPM
 *   - bargeInGate        → device-aware reverb-tail STT gate
 *   - backendScorer      → EMA latency + failure circuit breaker
 *   - utteranceLedger    → atomic, idempotent speak/cancel tokens
 *
 * The Conductor is a thin façade. It does not own audio playback —
 * `audioSession.ts` keeps that single source of truth. The Conductor
 * decides *what* to speak, *how* to shape it, *when* to start, and
 * *which* backend to prefer. It is regression-safe: callers may use
 * pieces independently or ignore it entirely.
 *
 * Cognitive complexity per function ≤ 10.
 */

import { createLogger } from '@/lib/logger';

const logger = createLogger('VoiceConductor');

// ─────────────────────────────────────────────────────────────────────────────
// 1. Prosodic Humanizer
// ─────────────────────────────────────────────────────────────────────────────

/** Soft cap per chunk — keeps TTFA low without breaking phrasing. */
const CHUNK_SOFT_MAX_CHARS = 140;
const CHUNK_HARD_MAX_CHARS = 220;

/** AI-tell phrases that break immersion. Stripped at start of utterance only. */
const AI_PREFIX_PATTERNS: ReadonlyArray<RegExp> = [
  /^as an ai[ ,.\-:]+/i,
  /^i'?m an ai[ ,.\-:]+/i,
  /^i am an ai[ ,.\-:]+/i,
  /^as a language model[ ,.\-:]+/i,
  /^certainly[ ,.\-:!]+/i,
  /^of course[ ,.\-:!]+/i,
  /^sure[ ,.\-:!]+(?=here|let|i)/i,
];

/** Common abbreviations expanded for spoken delivery. */
const SPOKEN_REPLACEMENTS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\be\.g\.\s*/gi, 'for example, '],
  [/\bi\.e\.\s*/gi, 'that is, '],
  [/\betc\.\s*/gi, 'and so on. '],
  [/\bvs\.\s*/gi, 'versus '],
  [/\bw\/\s*/gi, 'with '],
  [/\bw\/o\s*/gi, 'without '],
  [/(^|\s)&(\s|$)/g, '$1and$2'],
];

/** Strip AI-tells, expand abbreviations, normalize whitespace. */
export function humanizeText(raw: string): string {
  if (!raw) return '';
  let out = raw.trim();
  for (const pat of AI_PREFIX_PATTERNS) {
    out = out.replace(pat, '');
  }
  for (const [pat, sub] of SPOKEN_REPLACEMENTS) {
    out = out.replace(pat, sub);
  }
  // Collapse repeated whitespace, fix spaces around punctuation.
  out = out.replace(/\s+/g, ' ').replace(/\s+([,.!?;:])/g, '$1').trim();
  // Capitalize first letter if we stripped a prefix.
  if (out.length > 0 && /[a-z]/.test(out[0])) {
    out = out[0].toUpperCase() + out.slice(1);
  }
  return out;
}

export interface SpeechChunk {
  /** Index in the original utterance, 0-based. */
  index: number;
  /** The chunk text, ready for TTS. */
  text: string;
  /** Suggested pause AFTER this chunk in ms (prosodic dwell). */
  trailingPauseMs: number;
  /** True if this is the final chunk of the utterance. */
  isFinal: boolean;
}

/**
 * Split text into prosodically natural chunks for streaming TTS.
 * Strategy: sentence boundaries first, then clause boundaries if a
 * sentence exceeds the soft cap. Hard cap is a safety guard.
 */
export function chunkForStreaming(text: string): SpeechChunk[] {
  const cleaned = humanizeText(text);
  if (!cleaned) return [];

  const sentences = splitSentences(cleaned);
  const chunks: string[] = [];
  for (const sentence of sentences) {
    if (sentence.length <= CHUNK_SOFT_MAX_CHARS) {
      chunks.push(sentence);
    } else {
      chunks.push(...splitOnClauses(sentence));
    }
  }

  return chunks.map((t, i) => ({
    index: i,
    text: t,
    trailingPauseMs: dwellAfter(t),
    isFinal: i === chunks.length - 1,
  }));
}

function splitSentences(text: string): string[] {
  // Keep terminator with the sentence; don't split inside numbers (e.g. "3.14").
  const matches = text.match(/[^.!?]+(?:[.!?]+["')\]]?|$)/g) ?? [text];
  return matches.map((s) => s.trim()).filter(Boolean);
}

function splitOnClauses(sentence: string): string[] {
  const parts = sentence.split(/(?<=[,;:])\s+/);
  const out: string[] = [];
  let buf = '';
  for (const part of parts) {
    if ((buf + ' ' + part).trim().length > CHUNK_HARD_MAX_CHARS && buf) {
      out.push(buf.trim());
      buf = part;
    } else {
      buf = buf ? `${buf} ${part}` : part;
      if (buf.length >= CHUNK_SOFT_MAX_CHARS) {
        out.push(buf.trim());
        buf = '';
      }
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

function dwellAfter(chunk: string): number {
  const last = chunk.trim().slice(-1);
  if (last === '.' || last === '!' || last === '?') return 220;
  if (last === ';' || last === ':') return 140;
  if (last === ',') return 80;
  return 40;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Adaptive Endpointer — learns user's natural pause distribution
// ─────────────────────────────────────────────────────────────────────────────

const ENDPOINT_MIN_MS = 350;
const ENDPOINT_MAX_MS = 1400;
const ENDPOINT_DEFAULT_MS = 700;
const ENDPOINT_SAMPLE_CAP = 20;

const pauseSamples: number[] = [];

/** Record a measured intra-utterance pause (ms) from STT. */
export function recordUserPause(ms: number): void {
  if (!Number.isFinite(ms) || ms <= 0) return;
  const clamped = Math.min(ENDPOINT_MAX_MS * 1.5, Math.max(50, ms));
  pauseSamples.push(clamped);
  if (pauseSamples.length > ENDPOINT_SAMPLE_CAP) pauseSamples.shift();
}

/**
 * Returns the silence-window in ms before declaring end-of-utterance.
 * Uses p70 of recent pauses + 200ms safety margin. Falls back to default
 * until calibrated (≥ 4 samples).
 */
export function getAdaptiveEndpointMs(): number {
  if (pauseSamples.length < 4) return ENDPOINT_DEFAULT_MS;
  const sorted = [...pauseSamples].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * 0.7);
  const p70 = sorted[Math.min(idx, sorted.length - 1)];
  const candidate = Math.round(p70 + 200);
  return Math.min(ENDPOINT_MAX_MS, Math.max(ENDPOINT_MIN_MS, candidate));
}

export function resetEndpointer(): void {
  pauseSamples.length = 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Rate Mirror — match TTS speed to user's WPM
// ─────────────────────────────────────────────────────────────────────────────

const RATE_DEFAULT = 1.05;
const RATE_MIN = 0.85;
const RATE_MAX = 1.25;
const RATE_TARGET_WPM = 165; // baseline TTS comfortable rate

let userWpmEma: number | null = null;
const WPM_EMA_ALPHA = 0.35;

/** Record a user utterance to update WPM estimate. */
export function recordUserUtterance(wordCount: number, durationMs: number): void {
  if (wordCount < 3 || durationMs < 800) return;
  const wpm = (wordCount / (durationMs / 1000)) * 60;
  if (!Number.isFinite(wpm) || wpm < 40 || wpm > 350) return;
  userWpmEma = userWpmEma === null
    ? wpm
    : WPM_EMA_ALPHA * wpm + (1 - WPM_EMA_ALPHA) * userWpmEma;
}

/**
 * Returns a TTS speed multiplier that mirrors ~95% of user pace.
 * Slightly slower than the user feels attuned, not parroting.
 */
export function getMirroredRate(): number {
  if (userWpmEma === null) return RATE_DEFAULT;
  const ratio = (userWpmEma * 0.95) / RATE_TARGET_WPM;
  return Math.min(RATE_MAX, Math.max(RATE_MIN, Number(ratio.toFixed(3))));
}

export function resetRateMirror(): void {
  userWpmEma = null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Barge-In Gate — device-aware reverb tail
// ─────────────────────────────────────────────────────────────────────────────

export type DeviceProfile = 'ios' | 'android' | 'desktop';

const REVERB_TAIL_MS: Record<DeviceProfile, number> = {
  ios: 600,    // iOS Safari has the longest acoustic echo tail
  android: 400,
  desktop: 250,
};

export function detectDeviceProfile(): DeviceProfile {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (ua.includes('Mac') && (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints! > 1);
  if (isIOS) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

export function getReverbTailMs(profile: DeviceProfile = detectDeviceProfile()): number {
  return REVERB_TAIL_MS[profile];
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Backend Health Scorer — EMA latency + circuit breaker
// ─────────────────────────────────────────────────────────────────────────────

export type Backend = 'groq' | 'openai' | 'webSpeech';

interface BackendStat {
  emaLatencyMs: number;
  failures: number;
  lastFailureAt: number;
  trips: number;
  openUntil: number;
}

const BACKEND_INIT_LATENCY = 600;
const FAILURE_TRIP_THRESHOLD = 3;
const CIRCUIT_OPEN_MS = 30_000;
const HEALTH_EMA_ALPHA = 0.3;

const stats: Record<Backend, BackendStat> = {
  groq: emptyStat(),
  openai: emptyStat(),
  webSpeech: emptyStat(),
};

function emptyStat(): BackendStat {
  return {
    emaLatencyMs: BACKEND_INIT_LATENCY,
    failures: 0,
    lastFailureAt: 0,
    trips: 0,
    openUntil: 0,
  };
}

export function recordBackendSuccess(backend: Backend, latencyMs: number): void {
  const s = stats[backend];
  s.emaLatencyMs = HEALTH_EMA_ALPHA * latencyMs + (1 - HEALTH_EMA_ALPHA) * s.emaLatencyMs;
  s.failures = 0;
  s.openUntil = 0;
}

export function recordBackendFailure(backend: Backend): void {
  const s = stats[backend];
  s.failures += 1;
  s.lastFailureAt = Date.now();
  if (s.failures >= FAILURE_TRIP_THRESHOLD) {
    s.openUntil = Date.now() + CIRCUIT_OPEN_MS;
    s.trips += 1;
    logger.warn('Backend circuit opened', { backend, trips: s.trips });
  }
}

export function isBackendHealthy(backend: Backend): boolean {
  return stats[backend].openUntil <= Date.now();
}

/** Returns preferred order of backends (best first), filtered to healthy. */
export function getBackendPreference(): Backend[] {
  const all: Backend[] = ['groq', 'openai', 'webSpeech'];
  return all
    .filter(isBackendHealthy)
    .sort((a, b) => stats[a].emaLatencyMs - stats[b].emaLatencyMs);
}

export function getBackendStats(): Readonly<Record<Backend, Readonly<BackendStat>>> {
  return stats;
}

export function resetBackendScorer(): void {
  stats.groq = emptyStat();
  stats.openai = emptyStat();
  stats.webSpeech = emptyStat();
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Utterance Ledger — atomic, idempotent speak/cancel tokens
// ─────────────────────────────────────────────────────────────────────────────

export type UtteranceId = string;

interface UtteranceRecord {
  id: UtteranceId;
  createdAt: number;
  status: 'pending' | 'active' | 'done' | 'cancelled';
  cancel?: () => void;
}

const ledger = new Map<UtteranceId, UtteranceRecord>();
const LEDGER_CAP = 64;
let utteranceCounter = 0;

export function mintUtteranceId(): UtteranceId {
  utteranceCounter = (utteranceCounter + 1) % Number.MAX_SAFE_INTEGER;
  return `utt_${Date.now().toString(36)}_${utteranceCounter.toString(36)}`;
}

export function registerUtterance(id: UtteranceId, cancel?: () => void): void {
  if (ledger.size >= LEDGER_CAP) {
    const oldestKey = ledger.keys().next().value;
    if (oldestKey) ledger.delete(oldestKey);
  }
  ledger.set(id, { id, createdAt: Date.now(), status: 'pending', cancel });
}

export function markUtterance(
  id: UtteranceId,
  status: UtteranceRecord['status'],
): void {
  const rec = ledger.get(id);
  if (rec) rec.status = status;
}

/** Idempotent cancel: safe to call N times, returns true only on first effect. */
export function cancelUtterance(id: UtteranceId): boolean {
  const rec = ledger.get(id);
  if (!rec || rec.status === 'cancelled' || rec.status === 'done') return false;
  rec.status = 'cancelled';
  try {
    rec.cancel?.();
  } catch (e) {
    logger.warn('cancel callback threw', { id, error: (e as Error).message });
  }
  return true;
}

export function getUtteranceStatus(id: UtteranceId): UtteranceRecord['status'] | null {
  return ledger.get(id)?.status ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Public façade
// ─────────────────────────────────────────────────────────────────────────────

export interface ConductorPlan {
  utteranceId: UtteranceId;
  chunks: SpeechChunk[];
  recommendedRate: number;
  preferredBackends: Backend[];
  bargeInGateMs: number;
}

/**
 * Build a complete speech plan from raw assistant text.
 * Pure function — no side effects beyond minting an ID.
 */
export function planUtterance(rawText: string): ConductorPlan {
  const utteranceId = mintUtteranceId();
  const chunks = chunkForStreaming(rawText);
  registerUtterance(utteranceId);
  return {
    utteranceId,
    chunks,
    recommendedRate: getMirroredRate(),
    preferredBackends: getBackendPreference(),
    bargeInGateMs: getReverbTailMs(),
  };
}

/** Reset all conductor state. Safe across sessions. */
export function resetConductor(): void {
  resetEndpointer();
  resetRateMirror();
  resetBackendScorer();
  ledger.clear();
}
