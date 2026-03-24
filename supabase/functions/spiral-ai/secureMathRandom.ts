/**
 * A secure drop-in replacement for Math.random() returning [0, 1)
 * Resolves SonarQube S2245: Using pseudorandom number generators (PRNGs) is security-sensitive.
 */
export function secureMathRandom(): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] / (0xffffffff + 1);
}
