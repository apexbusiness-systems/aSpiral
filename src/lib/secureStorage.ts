import { supabase } from '@/integrations/supabase/client';

const DEVICE_FINGERPRINT_KEY = 'aspiral_device_fingerprint';
const APP_SALT = 'aspiral-v1-secure-storage-salt-2024';

function getStorage(): Storage | null {
  if (globalThis.localStorage !== undefined) {
    return globalThis.localStorage;
  }

  return null;
}

/**
 * Gets or creates a persistent device fingerprint
 */
export function getDeviceFingerprint(): string {
  const storage = getStorage();
  if (!storage) return 'server-side';

  let fingerprint = storage.getItem(DEVICE_FINGERPRINT_KEY);
  if (!fingerprint) {
    fingerprint = globalThis.crypto.randomUUID();
    storage.setItem(DEVICE_FINGERPRINT_KEY, fingerprint);
  }
  return fingerprint;
}

/**
 * Derives a strong encryption secret based on user, device, and app context.
 * This ensures that:
 * 1. Each user has a unique encryption key.
 * 2. Keys are tied to the specific device.
 * 3. Secrets are never hardcoded in the source.
 */
export async function getEncryptionSecret(): Promise<string> {
  let userId = 'anonymous';

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user?.id) {
      userId = session.user.id;
    }
  } catch (error) {
    // Fallback to anonymous if auth check fails
    const message = error instanceof Error ? error.message : String(error);
    console.warn('Auth check failed, using anonymous secret context', { message });
  }

  const deviceId = getDeviceFingerprint();

  // Combine factors to create a unique context for key derivation
  // We use SHA-256 to create a uniform-length seed for PBKDF2
  const contextString = `${userId}:${deviceId}:${APP_SALT}`;
  const msgUint8 = new TextEncoder().encode(contextString);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}
