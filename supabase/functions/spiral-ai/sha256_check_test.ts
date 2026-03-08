import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { loadAspiralMindcore, __internal } from "./aspiralMindcoreLoader.ts";

Deno.test("compute actual SHA256 of prompt block", async () => {
  const root = Deno.env.get("ASPIRAL_MINDCORE_DIR") || 
    new URL("../../../.claude/skills/aspiral-mindcore", import.meta.url).pathname;
  
  const content = await Deno.readTextFile(`${root}/UNIVERSAL_PROMPT.md`);
  const block = __internal.extractSystemPromptBlock(content);
  
  const bytes = new TextEncoder().encode(block);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const sha = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  
  const expectedSha = (await Deno.readTextFile(`${root}/SHA256`)).trim().toLowerCase();
  
  console.log("Computed SHA256:", sha);
  console.log("Expected SHA256:", expectedSha);
  console.log("Match:", sha === expectedSha);
  console.log("Block length:", block.length);
  console.log("Block first 100 chars:", JSON.stringify(block.slice(0, 100)));
  console.log("Block last 100 chars:", JSON.stringify(block.slice(-100)));
  
  // This will show us the actual vs expected
  assertEquals(sha, expectedSha, `SHA mismatch! Actual: ${sha}, Expected: ${expectedSha}`);
});
