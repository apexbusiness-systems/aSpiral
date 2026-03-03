import { __internal } from "./supabase/functions/spiral-ai/aspiralMindcoreLoader.ts";

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

try {
  const root = "./.claude/skills/aspiral-mindcore";
  const promptPath = root + "/UNIVERSAL_PROMPT.md";
  const shaPath = root + "/SHA256";
  const snapshotPath = "./supabase/functions/spiral-ai/__snapshots__/aspiral-mindcore.prompt.snapshot.txt";
  
  // @ts-ignore
  const rawPromptFile = await Deno.readTextFile(promptPath);
  const systemPrompt = __internal.extractSystemPromptBlock(rawPromptFile);
  const sha256 = await sha256Hex(systemPrompt);
  
  // @ts-ignore
  await Deno.writeTextFile(shaPath, sha256 + "\n");
  // @ts-ignore
  await Deno.writeTextFile(snapshotPath, systemPrompt);
  
  console.log("UPDATED SHA256 AND SNAPSHOT");
} catch (e) {
  console.error(e);
}
