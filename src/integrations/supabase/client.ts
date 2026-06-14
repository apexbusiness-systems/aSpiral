// Supabase client with defensive initialization for Capacitor compatibility
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

declare global {
  interface Window {
    ENV?: {
      SUPABASE_URL?: string;
      SUPABASE_PUBLISHABLE_KEY?: string;
    };
  }
}

// Support both build-time (Vite) and runtime (window.ENV) environment variables
// This allows the app to work even if build-time variables are missing
const getGlobalEnv = () => {
  if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
    return (globalThis as unknown as Window).ENV;
  }
  return undefined;
};

// NOTE: window.ENV is populated synchronously by /config.js (loaded in index.html
// before this module initializes). This is safe because the synchronous XHR approach
// in index.html ensures window.ENV is available at module initialization time.
const globalEnv = getGlobalEnv();

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  globalEnv?.SUPABASE_URL ||
  undefined;

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  globalEnv?.SUPABASE_PUBLISHABLE_KEY ||
  undefined;

/**
 * Creates a mock Supabase client that logs errors on usage.
 * This allows the app to boot to the UI even if Supabase keys are missing,
 * so the error boundary can display meaningful error messages.
 */

function printInitError(message: string, details: string[] = []) {
  console.error('═══════════════════════════════════════════════════════════════');
  console.error('  SUPABASE INITIALIZATION FAILED' + (message.includes('PLACEHOLDER') ? ' — PLACEHOLDER URL DETECTED' : ''));
  console.error('═══════════════════════════════════════════════════════════════');
  if (message) console.error(`  ${message}`);
  details.forEach(d => console.error(`  ${d}`));
  console.error('═══════════════════════════════════════════════════════════════');
}

function createMockClient(): SupabaseClient<Database> {
  const errorMessage = '[Supabase] Client not initialized - missing environment variables';

  const throwError = () => {
    console.error(errorMessage);
    throw new Error('Supabase client is not configured. Please check your environment variables.');
  };

  // Create a proxy that logs errors for any method call
  const createProxy = <T extends object>(target: T): T => {
    return new Proxy(target, {
      get(obj, prop) {
        // Allow access to certain properties that might be checked
        if (prop === 'auth' || prop === 'from' || prop === 'storage' || prop === 'functions' || prop === 'realtime') {
          return createProxy({
            // Auth methods
            getSession: () => Promise.resolve({ data: { session: null }, error: new Error(errorMessage) }),
            getUser: () => Promise.resolve({ data: { user: null }, error: new Error(errorMessage) }),
            signIn: throwError,
            signInWithPassword: throwError,
            signInWithOtp: throwError,
            signUp: throwError,
            signOut: () => Promise.resolve({ error: new Error(errorMessage) }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
            // Database methods
            select: () => createProxy({ data: null, error: new Error(errorMessage) }),
            insert: throwError,
            update: throwError,
            delete: throwError,
            upsert: throwError,
            // Storage methods
            upload: throwError,
            download: throwError,
            // Functions methods
            invoke: throwError,
            // Realtime methods
            channel: () => createProxy({
              on: () => createProxy({}),
              subscribe: () => createProxy({}),
              unsubscribe: () => { },
            }),
          } as unknown as T);
        }

        // For other properties, return a function that throws
        if (typeof prop === 'string') {
          return (..._args: unknown[]) => {
            console.error(`${errorMessage} - attempted to call: ${prop}`);
            return Promise.resolve({ data: null, error: new Error(errorMessage) });
          };
        }

        return Reflect.get(obj, prop);
      },
    });
  };

  return createProxy({} as SupabaseClient<Database>);
}

/**
 * Initialize Supabase client with defensive checks.
 * Returns a working client if properly configured, or a mock client that
 * fails gracefully if environment variables are missing.
 */
function initializeSupabaseClient(): SupabaseClient<Database> {
  // Check for missing environment variables
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('  SUPABASE INITIALIZATION FAILED');
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('  Missing required environment variables:');
    if (!SUPABASE_URL) {
      console.error('    ✗ VITE_SUPABASE_URL is not defined');
    }
    if (!SUPABASE_PUBLISHABLE_KEY) {
      console.error('    ✗ VITE_SUPABASE_PUBLISHABLE_KEY is not defined');
    }
    console.error('');
    console.error('  The app will boot with a mock client. Authentication and');
    console.error('  database features will not work until these are configured.');
    console.error('═══════════════════════════════════════════════════════════════');

    return createMockClient();
  }

  // Validate URL format
  try {
    new URL(SUPABASE_URL);
  } catch {
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('  SUPABASE INITIALIZATION FAILED');
    console.error('═══════════════════════════════════════════════════════════════');
    console.error(`  VITE_SUPABASE_URL is not a valid URL: ${SUPABASE_URL}`);
    console.error('═══════════════════════════════════════════════════════════════');

    return createMockClient();
  }


  // Guard against known-bad placeholder values that indicate provisioning hasn't occurred
  const KNOWN_BAD_REFS = ['egtwatyodujxofrdznen', 'your-project-id', 'YOUR_ACTUAL_PROJECT'];
  const isBadUrl = KNOWN_BAD_REFS.some(bad => SUPABASE_URL.includes(bad));
  if (isBadUrl) {
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('  SUPABASE INITIALIZATION FAILED — PLACEHOLDER URL DETECTED');
    console.error('═══════════════════════════════════════════════════════════════');
    console.error(`  VITE_SUPABASE_URL contains a known placeholder: ${SUPABASE_URL}`);
    console.error('  The Supabase project has not been provisioned yet, or the');
    console.error('  credentials have not been updated after provisioning.');
    console.error('  See SUPABASE_SETUP.md for setup instructions.');
    console.error('═══════════════════════════════════════════════════════════════');
    // Set a global flag that the app UI can check to show a config error screen
    if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
      const w = globalThis.window as Window & { __SUPABASE_MISCONFIGURED__?: boolean };
      w.__SUPABASE_MISCONFIGURED__ = true;
    }
    return createMockClient();
  }

  const KNOWN_BAD_KEYS = ['REPLACE_WITH_REAL_ANON_KEY', 'your-anon-key-here'];
  const isBadKey = KNOWN_BAD_KEYS.some(bad => SUPABASE_PUBLISHABLE_KEY?.includes(bad));
  if (isBadKey) {
    console.error('  VITE_SUPABASE_PUBLISHABLE_KEY is a placeholder — not a real anon key');
    if (typeof globalThis !== 'undefined' && 'window' in globalThis) {
      const w = globalThis.window as Window & { __SUPABASE_MISCONFIGURED__?: boolean };
      w.__SUPABASE_MISCONFIGURED__ = true;
    }
    return createMockClient();
  }

  // Create the real client
  try {
    return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        // FIX: Use localStorage (not sessionStorage) to persist auth sessions
        // across tab closes, PWA backgrounding, and page reloads on mobile.
        // sessionStorage was causing users to be logged out constantly on iOS/Android.
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        persistSession: true,
        autoRefreshToken: true,
        storageKey: 'aspiral-auth-token', // Namespaced to avoid conflicts
      },
    });
  } catch (error) {
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('  SUPABASE INITIALIZATION FAILED');
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('  Error creating Supabase client:', error);
    console.error('═══════════════════════════════════════════════════════════════');

    return createMockClient();
  }
}

// Export the supabase client (real or mock depending on configuration)
export const supabase = initializeSupabaseClient();
