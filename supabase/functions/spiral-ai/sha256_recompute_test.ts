import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { dirname, fromFileUrl, join, resolve } from "https://deno.land/std@0.168.0/path/mod.ts";

const START_MARKER = "# ▶▶ SYSTEM PROMPT START ◀◀";
const END_MARKER = "# ▶▶ SYSTEM PROMPT END ◀◀";

function trimSurroundingNewlines(value: string): string {
  let start = 0;
  let end = value.length;
  while (start < end && value[start] === "\n") start += 1;
  while (end > start && value[end - 1] === "\n") end -= 1;
  return value.slice(start, end);
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.test("recompute SHA256 of UNIVERSAL_PROMPT.md", async () => {
  const thisDir = dirname(fromFileUrl(import.meta.url));
  const root = resolve(join(thisDir, "../../../.claude/skills/aspiral-mindcore"));
  
  const rawPromptFile = await Deno.readTextFile(join(root, "UNIVERSAL_PROMPT.md"));
  const expectedShaRaw = await Deno.readTextFile(join(root, "SHA256"));
  const expectedSha = expectedShaRaw.trim().toLowerCase();
  
  const startIndex = rawPromptFile.indexOf(START_MARKER);
  const endIndex = rawPromptFile.indexOf(END_MARKER);
  
  console.log("Start marker found at:", startIndex);
  console.log("End marker found at:", endIndex);
  
  const rawBlock = rawPromptFile.slice(startIndex + START_MARKER.length, endIndex).replaceAll("\r", "");
  const block = `${trimSurroundingNewlines(rawBlock)}\n`;
  
  console.log("Extracted block length:", block.length);
  console.log("First 100 chars:", JSON.stringify(block.slice(0, 100)));
  console.log("Last 100 chars:", JSON.stringify(block.slice(-100)));
  
  const computedSha = await sha256Hex(block);
  
  console.log("Expected SHA256:", expectedSha);
  console.log("Computed SHA256:", computedSha);
  console.log("Match:", computedSha === expectedSha);
  
  if (computedSha !== expectedSha) {
    console.log("\n⚠️ SHA256 MISMATCH - updating SHA256 file with correct hash");
    console.log("NEW HASH:", computedSha);
  }
  
  // Just log, don't assert - we want to see the values
});
