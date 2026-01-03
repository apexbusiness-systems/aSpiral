// Supabase client with defensive initialization for Capacitor compatibility
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Support both build-time (Vite) and runtime (window.ENV) environment variables
// This allows the app to work even if build-time variables are missing
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  (typeof window !== 'undefined' ? (window as any).ENV?.SUPABASE_URL : undefined);

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  (typeof window !== 'undefined' ? (window as any).ENV?.SUPABASE_PUBLISHABLE_KEY : undefined);

/**
 * Creates a mock Supabase client that logs errors on usage.
 * This allows the app to boot to the UI even if Supabase keys are missing,
 * so the error boundary can display meaningful error messages.
 */
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
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
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
              unsubscribe: () => {},
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

  // Create the real client
  try {
    return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        storage: localStorage,
        persistSession: true,
        autoRefreshToken: true,
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
