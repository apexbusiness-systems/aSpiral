import { supabase } from '@/integrations/supabase/client';

export async function signOut(): Promise<{ error: Error | null }> {
    try {
        // Clear session storage (sensitive data)
        sessionStorage.removeItem('aspiral-session');
        sessionStorage.removeItem('aspiral_user');

        // Clean up legacy local storage keys (sensitive data cleanup)
        localStorage.removeItem('aspiral-session');
        localStorage.removeItem('aspiral_session');
        localStorage.removeItem('aspiral_user');

        // Clear local storage (non-sensitive preference)
        localStorage.removeItem('aspiral_analytics_enabled');

        // Sign out from Supabase
        const { error } = await supabase.auth.signOut();

        if (error) {
            return { error };
        }

        return { error: null };
    } catch (error) {
        return { error: error as Error };
    }
}
