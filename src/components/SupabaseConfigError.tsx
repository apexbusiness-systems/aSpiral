/**
 * SupabaseConfigError — Shown when the Supabase client detected a missing or
 * placeholder credential at startup. Prevents users from seeing a broken auth page.
 */
export function useSupabaseConfigError(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as Window & { __SUPABASE_MISCONFIGURED__?: boolean }).__SUPABASE_MISCONFIGURED__;
}

export function SupabaseConfigError() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full rounded-2xl border border-destructive/40 bg-destructive/10 p-8 text-center space-y-4">
        <div className="text-4xl">⚠️</div>
        <h1 className="text-xl font-semibold text-foreground">Service Temporarily Unavailable</h1>
        <p className="text-sm text-muted-foreground">
          We are finishing setting up aSpiral's backend infrastructure.
          Please check back shortly — this will be resolved within minutes.
        </p>
        <p className="text-xs text-muted-foreground/60">
          If you're the developer: set{' '}
          <code className="bg-muted px-1 rounded text-xs">VITE_SUPABASE_URL</code> and{' '}
          <code className="bg-muted px-1 rounded text-xs">VITE_SUPABASE_PUBLISHABLE_KEY</code>{' '}
          in your deployment environment, then redeploy.
        </p>
      </div>
    </div>
  );
}
