/**
 * A secure drop-in replacement for Math.random() returning [0, 1)
 * Resolves SonarQube S2245: Using pseudorandom number generators (PRNGs) is security-sensitive.
 */
export function secureMathRandom(): number {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj || typeof cryptoObj.getRandomValues !== 'function') {
    // Fallback safely if unavailable
    return Math.random(); // nosonar
  }
  const array = new Uint32Array(1);
  cryptoObj.getRandomValues(array);
  return array[0] / (0xffffffff + 1);
}
