import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertFalse,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { dirname, fromFileUrl, join, resolve } from "https://deno.land/std@0.168.0/path/mod.ts";
import { loadAspiralMindcore } from "./aspiralMindcoreLoader.ts";

const THIS_DIR = dirname(fromFileUrl(import.meta.url));
const REPO_ROOT = resolve(join(THIS_DIR, "../../.."));
const SSOT_DIR = join(REPO_ROOT, ".claude/skills/aspiral-mindcore");

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.test("MindCore loader: golden snapshot matches extracted system prompt exactly", async () => {
  Deno.env.set("ASPIRAL_MINDCORE_DIR", SSOT_DIR);
  const loaded = await loadAspiralMindcore();
  const snapshotPath = join(THIS_DIR, "__snapshots__/aspiral-mindcore.prompt.snapshot.txt");
  const snapshot = await Deno.readTextFile(snapshotPath);

  assertEquals(loaded.systemPrompt, snapshot);
});

Deno.test("MindCore loader: SHA lock matches SSOT SHA256", async () => {
  Deno.env.set("ASPIRAL_MINDCORE_DIR", SSOT_DIR);
  const loaded = await loadAspiralMindcore();
  const expectedSha = (await Deno.readTextFile(join(SSOT_DIR, "SHA256"))).trim().toLowerCase();
  const recomputed = await sha256Hex(loaded.systemPrompt);

  assertEquals(loaded.sha256, recomputed);
  assertEquals(recomputed, expectedSha);
});

Deno.test("MindCore loader: presence test for crisis/safety markers", async () => {
  Deno.env.set("ASPIRAL_MINDCORE_DIR", SSOT_DIR);
  const loaded = await loadAspiralMindcore();

  assertStringIncludes(loaded.systemPrompt, "CRISIS PROTOCOL");
  assertStringIncludes(loaded.systemPrompt, "INSTRUCTION INTEGRITY");
  assertStringIncludes(loaded.systemPrompt, "You are not a therapist");
});

Deno.test("Legacy ban: active aSpiral prompt assembly path excludes legacy directive tokens", async () => {
  const indexPath = join(THIS_DIR, "index.ts");
  const source = await Deno.readTextFile(indexPath);

  assertStringIncludes(source, "loadAspiralMindcore");
  assertFalse(source.includes("You are ASPIRAL's discovery engine"));
  assertFalse(source.includes("Synthesize the breakthrough from this conversation"));
  assertFalse(source.includes("const QUESTION_PATTERNS"));
  assert(source.includes("mindcore.systemPrompt"));
});
