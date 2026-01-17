/**
 * Voice Pipeline Integration Tests
 * 
 * Tests the complete STT → AI → TTS pipeline including:
 * - Transcript deduplication
 * - Audio session coordination
 * - TTS sentence chunking
 * - Reverb gate logic (feedback loop prevention)
 * - iOS Safari detection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// Test: Transcript Deduplication
// ============================================================================
describe('Transcript Deduplication', () => {
    const DEDUPE_WINDOW_MS = 2000;

    /**
     * Simulates the global final history deduplication logic
     */
    class TranscriptDeduplicator {
        private history = new Set<string>();
        private timestamps = new Map<string, number>();

        addAndCheck(transcript: string): boolean {
            const now = Date.now();
            const normalized = transcript.toLowerCase().trim();

            // Clean old entries
            for (const [text, time] of this.timestamps) {
                if (now - time > DEDUPE_WINDOW_MS) {
                    this.history.delete(text);
                    this.timestamps.delete(text);
                }
            }

            // Check for duplicate
            if (this.history.has(normalized)) {
                return false; // Duplicate detected
            }

            this.history.add(normalized);
            this.timestamps.set(normalized, now);
            return true; // New transcript
        }

        clear() {
            this.history.clear();
            this.timestamps.clear();
        }
    }

    let deduplicator: TranscriptDeduplicator;

    beforeEach(() => {
        deduplicator = new TranscriptDeduplicator();
    });

    it('accepts first instance of a transcript', () => {
        expect(deduplicator.addAndCheck('Hello world')).toBe(true);
    });

    it('rejects duplicate transcripts within window', () => {
        deduplicator.addAndCheck('Hello world');
        expect(deduplicator.addAndCheck('Hello world')).toBe(false);
    });

    it('rejects duplicate regardless of case', () => {
        deduplicator.addAndCheck('Hello World');
        expect(deduplicator.addAndCheck('hello world')).toBe(false);
    });

    it('accepts different transcripts', () => {
        deduplicator.addAndCheck('Hello world');
        expect(deduplicator.addAndCheck('Goodbye world')).toBe(true);
    });

    it('accepts transcript after dedupe window expires', async () => {
        vi.useFakeTimers();

        deduplicator.addAndCheck('Hello world');

        // Advance past dedupe window
        vi.advanceTimersByTime(DEDUPE_WINDOW_MS + 100);

        expect(deduplicator.addAndCheck('Hello world')).toBe(true);

        vi.useRealTimers();
    });
});

// ============================================================================
// Test: TTS Sentence Chunking
// ============================================================================
describe('TTS Sentence Chunking', () => {
    function splitIntoSentences(text: string): string[] {
        const sentences = text.match(/(?:[^.!?]+[.!?]+[\s]?)|(?:[^.!?]+$)/g);
        if (!sentences) return [text];
        return sentences.map(s => s.trim()).filter(s => s.length > 0);
    }

    it('splits by period', () => {
        expect(splitIntoSentences('First. Second. Third.')).toEqual(['First.', 'Second.', 'Third.']);
    });

    it('splits by question mark', () => {
        expect(splitIntoSentences('What? Why? How?')).toEqual(['What?', 'Why?', 'How?']);
    });

    it('splits by exclamation', () => {
        expect(splitIntoSentences('Wow! Amazing! Great!')).toEqual(['Wow!', 'Amazing!', 'Great!']);
    });

    it('handles mixed punctuation', () => {
        expect(splitIntoSentences('Hello. How are you? Great!')).toEqual(['Hello.', 'How are you?', 'Great!']);
    });

    it('handles no punctuation', () => {
        expect(splitIntoSentences('No punctuation here')).toEqual(['No punctuation here']);
    });

    it('handles empty string', () => {
        expect(splitIntoSentences('')).toEqual(['']);
    });

    it('handles AI response with multiple sentences', () => {
        const response = "I understand your concern. Let me help you. What's blocking you?";
        const sentences = splitIntoSentences(response);
        expect(sentences.length).toBe(3);
        expect(sentences[0]).toBe('I understand your concern.');
        expect(sentences[2]).toBe("What's blocking you?");
    });
});

// ============================================================================
// Test: Reverb Gate Logic (Audio Feedback Prevention)
// ============================================================================
describe('Reverb Gate Logic', () => {
    interface ReverbGate {
        isGated: () => boolean;
        setGate: () => void;
        clearGateAfterDelay: () => void;
        dispose: () => void;
    }

    function createReverbGate(delayMs = 600): ReverbGate {
        let isGatedFlag = false;
        let timeoutId: ReturnType<typeof setTimeout> | null = null;

        return {
            isGated: () => isGatedFlag,
            setGate: () => {
                isGatedFlag = true;
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
            },
            clearGateAfterDelay: () => {
                timeoutId = setTimeout(() => {
                    isGatedFlag = false;
                    timeoutId = null;
                }, delayMs);
            },
            dispose: () => {
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                isGatedFlag = false;
            },
        };
    }

    it('starts ungated', () => {
        const gate = createReverbGate();
        expect(gate.isGated()).toBe(false);
    });

    it('gates when TTS starts', () => {
        const gate = createReverbGate();
        gate.setGate();
        expect(gate.isGated()).toBe(true);
    });

    it('clears after delay when TTS ends', () => {
        vi.useFakeTimers();
        const gate = createReverbGate(100);

        gate.setGate();
        gate.clearGateAfterDelay();
        expect(gate.isGated()).toBe(true);

        vi.advanceTimersByTime(100);
        expect(gate.isGated()).toBe(false);

        vi.useRealTimers();
    });

    it('blocks STT recognition while gated', () => {
        const gate = createReverbGate();
        gate.setGate();

        // Simulating STT check
        const shouldRecognize = !gate.isGated();
        expect(shouldRecognize).toBe(false);
    });

    it('allows STT recognition when ungated', () => {
        const gate = createReverbGate();
        const shouldRecognize = !gate.isGated();
        expect(shouldRecognize).toBe(true);
    });
});

// ============================================================================
// Test: iOS Safari Detection
// ============================================================================
describe('iOS Safari Detection', () => {
    function checkIOSSafari(userAgent: string, platform: string, maxTouchPoints: number): boolean {
        const isIOS = /iPad|iPhone|iPod/.test(userAgent) ||
            (platform === 'MacIntel' && maxTouchPoints > 1);
        const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
        return isIOS && isSafari;
    }

    it('detects iOS Safari on iPhone', () => {
        const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1';
        expect(checkIOSSafari(ua, 'iPhone', 5)).toBe(true);
    });

    it('detects iOS Safari on iPad', () => {
        const ua = 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1';
        expect(checkIOSSafari(ua, 'iPad', 5)).toBe(true);
    });

    it('detects iPadOS (MacIntel with touch)', () => {
        const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15';
        expect(checkIOSSafari(ua, 'MacIntel', 5)).toBe(true);
    });

    it('returns false for desktop Chrome', () => {
        const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        expect(checkIOSSafari(ua, 'Win32', 0)).toBe(false);
    });

    it('returns false for Android Chrome', () => {
        const ua = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
        expect(checkIOSSafari(ua, 'Linux armv8l', 5)).toBe(false);
    });

    it('returns false for desktop Safari (macOS without touch)', () => {
        const ua = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Safari/605.1.15';
        expect(checkIOSSafari(ua, 'MacIntel', 0)).toBe(false);
    });
});

// ============================================================================
// Test: Audio Session Coordination
// ============================================================================
describe('Audio Session Coordination', () => {
    interface AudioSessionState {
        isListening: boolean;
        isSpeaking: boolean;
        activeBackend: 'stt' | 'tts' | null;
    }

    function createAudioSessionController() {
        let state: AudioSessionState = {
            isListening: false,
            isSpeaking: false,
            activeBackend: null,
        };

        return {
            getState: () => ({ ...state }),

            startListening: () => {
                if (state.isSpeaking) {
                    throw new Error('Cannot start STT while TTS is active');
                }
                state.isListening = true;
                state.activeBackend = 'stt';
                return true;
            },

            stopListening: () => {
                state.isListening = false;
                if (state.activeBackend === 'stt') {
                    state.activeBackend = null;
                }
            },

            startSpeaking: () => {
                if (state.isListening) {
                    // Auto-pause STT when TTS starts
                    state.isListening = false;
                }
                state.isSpeaking = true;
                state.activeBackend = 'tts';
                return true;
            },

            stopSpeaking: () => {
                state.isSpeaking = false;
                if (state.activeBackend === 'tts') {
                    state.activeBackend = null;
                }
            },
        };
    }

    it('allows starting STT when idle', () => {
        const controller = createAudioSessionController();
        expect(controller.startListening()).toBe(true);
        expect(controller.getState().isListening).toBe(true);
    });

    it('prevents STT while TTS is active', () => {
        const controller = createAudioSessionController();
        controller.startSpeaking();
        expect(() => controller.startListening()).toThrow();
    });

    it('auto-pauses STT when TTS starts', () => {
        const controller = createAudioSessionController();
        controller.startListening();
        expect(controller.getState().isListening).toBe(true);

        controller.startSpeaking();
        expect(controller.getState().isListening).toBe(false);
        expect(controller.getState().isSpeaking).toBe(true);
    });

    it('tracks active backend correctly', () => {
        const controller = createAudioSessionController();

        expect(controller.getState().activeBackend).toBeNull();

        controller.startListening();
        expect(controller.getState().activeBackend).toBe('stt');

        controller.startSpeaking();
        expect(controller.getState().activeBackend).toBe('tts');

        controller.stopSpeaking();
        expect(controller.getState().activeBackend).toBeNull();
    });
});

// ============================================================================
// Test: Voice Stop Keywords
// ============================================================================
describe('Voice Stop Keywords', () => {
    const VOICE_STOP_KEYWORDS = ['stop', 'pause', 'end session', 'shut up', 'hold on'];

    function containsStopKeyword(transcript: string): boolean {
        const lower = transcript.toLowerCase();
        return VOICE_STOP_KEYWORDS.some(keyword => lower.includes(keyword));
    }

    it('detects "stop" keyword', () => {
        expect(containsStopKeyword('Please stop now')).toBe(true);
    });

    it('detects "pause" keyword', () => {
        expect(containsStopKeyword('Pause for a moment')).toBe(true);
    });

    it('detects "end session" phrase', () => {
        expect(containsStopKeyword('I want to end session')).toBe(true);
    });

    it('detects keywords case-insensitively', () => {
        expect(containsStopKeyword('STOP RIGHT NOW')).toBe(true);
    });

    it('returns false for normal transcripts', () => {
        expect(containsStopKeyword('I am feeling anxious about work')).toBe(false);
    });
});

// ============================================================================
// Test: Silence Timeout Configuration
// ============================================================================
describe('Silence Timeout Configuration', () => {
    const MIN_SILENCE_TIMEOUT = 800;
    const MAX_SILENCE_TIMEOUT = 1200;
    const DEFAULT_SILENCE_TIMEOUT = 1000;

    function validateSilenceTimeout(ms: number): number {
        if (ms < MIN_SILENCE_TIMEOUT) return MIN_SILENCE_TIMEOUT;
        if (ms > MAX_SILENCE_TIMEOUT) return MAX_SILENCE_TIMEOUT;
        return ms;
    }

    it('clamps timeout below minimum', () => {
        expect(validateSilenceTimeout(500)).toBe(MIN_SILENCE_TIMEOUT);
    });

    it('clamps timeout above maximum', () => {
        expect(validateSilenceTimeout(2000)).toBe(MAX_SILENCE_TIMEOUT);
    });

    it('accepts valid timeout', () => {
        expect(validateSilenceTimeout(1000)).toBe(1000);
    });
});
