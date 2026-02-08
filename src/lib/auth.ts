import { supabase } from '@/integrations/supabase/client';

export async function signOut(): Promise<{ error: Error | null }> {
    try {
        // Clear local storage
        localStorage.removeItem('aspiral_session');
        localStorage.removeItem('aspiral_user');
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
