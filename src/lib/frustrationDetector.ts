/**
 * Frustration Detection - Stop immediately when user is annoyed
 */

const FRUSTRATION_PATTERNS = [
  /annoying/i,
  /stop/i,
  /enough/i,
  /just tell me/i,
  /wtf/i,
  /ffs/i,
  /jesus/i,
  /come on/i,
  /seriously/i,
  /get to the point/i,
  /cut the (crap|bullshit|shit)/i,
  /shut up/i,
  /whatever/i,
  /skip/i,
  /answer/i,
  /what is it/i,
  /i don't care/i,
  /boring/i,
  /repetitive/i,
  /same thing/i,
  /you're not helping/i,
  /this isn't working/i,
];

const SKIP_PATTERNS = [
  /just tell me/i,
  /skip/i,
  /answer/i,
  /what is it/i,
  /get to the point/i,
  /what's the answer/i,
  /give me the answer/i,
];

export function isUserFrustrated(transcript: string): boolean {
  return FRUSTRATION_PATTERNS.some((pattern) => pattern.test(transcript));
}

export function wantsToSkip(transcript: string): boolean {
  return SKIP_PATTERNS.some((pattern) => pattern.test(transcript));
}

export function detectFrustrationLevel(transcript: string): "none" | "mild" | "high" {
  const frustrationCount = FRUSTRATION_PATTERNS.filter((p) => p.test(transcript)).length;
  
  if (frustrationCount === 0) return "none";
  if (frustrationCount === 1) return "mild";
  return "high";
}
