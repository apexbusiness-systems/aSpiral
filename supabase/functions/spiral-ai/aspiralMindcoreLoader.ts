import { dirname, fromFileUrl, join, resolve } from "https://deno.land/std@0.168.0/path/mod.ts";
import { MINDCORE_SYSTEM_PROMPT, MINDCORE_SHA256, MINDCORE_VERSION } from "./mindcoreEmbed.ts";

const START_MARKER = "# ▶▶ SYSTEM PROMPT START ◀◀";
const END_MARKER = "# ▶▶ SYSTEM PROMPT END ◀◀";
const MAX_FILE_SIZE_BYTES = 200 * 1024;
const MAX_PROMPT_SIZE_BYTES = 120 * 1024;
const EXPECTED_VERSION = "1.1.2";

export interface AspiralMindcorePrompt {
  systemPrompt: string;
  version: "1.1.2";
  sha256: string;
}

function trimSurroundingNewlines(value: string): string {
  let start = 0;
  let end = value.length;

  while (start < end && value[start] === "\n") {
    start += 1;
  }

  while (end > start && value[end - 1] === "\n") {
    end -= 1;
  }

  return value.slice(start, end);
}

function extractSystemPromptBlock(content: string): string {
  const startIndex = content.indexOf(START_MARKER);
  const endIndex = content.indexOf(END_MARKER);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error("MindCore prompt markers missing or invalid");
  }

  // Normalize CRLF→LF for cross-platform SHA256 consistency
  const rawBlock = content.slice(startIndex + START_MARKER.length, endIndex).replaceAll("\r", "");
  const block = `${trimSurroundingNewlines(rawBlock)}\n`;

  const promptSize = new TextEncoder().encode(block).byteLength;
  if (promptSize > MAX_PROMPT_SIZE_BYTES) {
    throw new Error(`MindCore prompt exceeds size cap (${promptSize} > ${MAX_PROMPT_SIZE_BYTES})`);
  }

  return block;
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Load MindCore prompt.
 * 
 * Strategy:
 * 1. Primary: Use embedded TypeScript constant (works in deployed edge functions)
 * 2. Fallback: Read from filesystem (works in local dev with ASPIRAL_MINDCORE_DIR override)
 * 
 * Both paths verify SHA256 integrity.
 */
export async function loadAspiralMindcore(): Promise<AspiralMindcorePrompt> {
  // Try embedded module first (always available in deployed edge functions)
  if (MINDCORE_VERSION === EXPECTED_VERSION) {
    const sha256 = await sha256Hex(MINDCORE_SYSTEM_PROMPT);
    if (sha256 === MINDCORE_SHA256) {
      console.log("[MINDCORE] Loaded from embedded module");
      return {
        systemPrompt: MINDCORE_SYSTEM_PROMPT,
        version: EXPECTED_VERSION,
        sha256,
      };
    }
    console.warn("[MINDCORE] Embedded SHA256 mismatch, falling back to filesystem");
  }

  // Fallback: filesystem (local dev / tests / override)
  const override = Deno.env.get("ASPIRAL_MINDCORE_DIR");
  const root = override
    ? resolve(override)
    : resolve(join(dirname(fromFileUrl(import.meta.url)), "../../../.claude/skills/aspiral-mindcore"));

  const promptPath = join(root, "UNIVERSAL_PROMPT.md");
  const shaPath = join(root, "SHA256");
  const versionPath = join(root, "VERSION");

  let promptStat: Deno.FileInfo;
  try {
    promptStat = await Deno.stat(promptPath);
  } catch {
    throw new Error("aSpiral MindCore unavailable: cannot read UNIVERSAL_PROMPT.md");
  }

  if (promptStat.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`MindCore prompt file exceeds size cap (${promptStat.size} > ${MAX_FILE_SIZE_BYTES})`);
  }

  const [rawPromptFile, expectedShaRaw, versionRaw] = await Promise.all([
    Deno.readTextFile(promptPath),
    Deno.readTextFile(shaPath),
    Deno.readTextFile(versionPath),
  ]);

  const version = versionRaw.trim();
  if (version !== EXPECTED_VERSION) {
    throw new Error(`MindCore version mismatch: expected ${EXPECTED_VERSION}, found ${version || "<empty>"}`);
  }

  const systemPrompt = extractSystemPromptBlock(rawPromptFile);
  const sha256 = await sha256Hex(systemPrompt);
  const expectedSha = expectedShaRaw.trim().toLowerCase();

  if (!expectedSha || sha256 !== expectedSha) {
    throw new Error("MindCore SHA256 mismatch");
  }

  return {
    systemPrompt,
    version: EXPECTED_VERSION,
    sha256,
  };
}

export const __internal = {
  START_MARKER,
  END_MARKER,
  extractSystemPromptBlock,
};
