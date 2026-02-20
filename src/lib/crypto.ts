/**
 * aSpiral Crypto Utilities
 *
 * Provides asynchronous encryption/decryption for local storage using Web Crypto API.
 * Uses AES-GCM for authenticated encryption and PBKDF2 for key derivation.
 */

const ALGORITHM = 'AES-GCM';
const KEY_DERIVATION_ALGORITHM = 'PBKDF2';
const ITERATIONS = 100000;
const SALT_SIZE = 16;
const IV_SIZE = 12;

/**
 * Derives a CryptoKey from a password string
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    KEY_DERIVATION_ALGORITHM,
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: KEY_DERIVATION_ALGORITHM,
      salt,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: ALGORITHM, length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a string using AES-GCM
 * @returns A base64 string containing salt + iv + ciphertext
 */
export async function encrypt(text: string, secret: string): Promise<string> {
  if (!text) return text;
  if (!secret) throw new Error("Encryption secret is required");

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const salt = crypto.getRandomValues(new Uint8Array(SALT_SIZE));
    const iv = crypto.getRandomValues(new Uint8Array(IV_SIZE));

    const key = await deriveKey(secret, salt);
    const encrypted = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );

    const encryptedArray = new Uint8Array(encrypted);
    const result = new Uint8Array(salt.length + iv.length + encryptedArray.length);
    result.set(salt, 0);
    result.set(iv, salt.length);
    result.set(encryptedArray, salt.length + iv.length);

    // Convert to Base64
    let binary = '';
    for (let i = 0; i < result.length; i++) {
      binary += String.fromCharCode(result[i]);
    }
    return btoa(binary);
  } catch (error) {
    console.error("Encryption failed:", error);
    // FAIL-SAFE: Throw error instead of returning plaintext
    throw new Error("Encryption failed");
  }
}

/**
 * Decrypts a base64 string produced by encrypt()
 */
export async function decrypt(encoded: string, secret: string): Promise<string> {
  if (!encoded) return encoded;
  if (!secret) throw new Error("Decryption secret is required");

  try {
    const binary = atob(encoded);
    const data = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      data[i] = binary.charCodeAt(i);
    }

    if (data.length < SALT_SIZE + IV_SIZE) {
      throw new Error("Invalid encrypted data format");
    }

    const salt = data.slice(0, SALT_SIZE);
    const iv = data.slice(SALT_SIZE, SALT_SIZE + IV_SIZE);
    const ciphertext = data.slice(SALT_SIZE + IV_SIZE);

    const key = await deriveKey(secret, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error("Decryption failed:", error);
    throw new Error("Decryption failed");
  }
}

/**
 * Generates a cryptographically secure random string of specified length.
 * Uses rejection sampling to eliminate modulo bias.
 */
export function generateSecureToken(length: number = 40): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charCount = chars.length;
  const maxValidByte = 256 - (256 % charCount); // 256 - 8 = 248
  let result = '';
  const batchSize = length * 2; // Fetch more bytes than needed to reduce calls
  const randomBytes = new Uint8Array(batchSize);

  while (result.length < length) {
    crypto.getRandomValues(randomBytes);
    for (let i = 0; i < randomBytes.length && result.length < length; i++) {
      // Rejection sampling: discard values that would cause modulo bias
      if (randomBytes[i] < maxValidByte) {
        result += chars.charAt(randomBytes[i] % charCount);
      }
    }
  }

  return result;
}
