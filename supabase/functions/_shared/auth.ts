import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function validateAuth(req: Request, supabase: SupabaseClient): Promise<string | null> {
    const apiKey = req.headers.get('x-api-key');
    const authHeader = req.headers.get('authorization');

    if (apiKey) {
        const keyHash = await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(apiKey)
        );
        const hashHex = Array.from(new Uint8Array(keyHash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');

        const { data: keyData } = await supabase
            .from('api_keys')
            .select('user_id')
            .eq('key_hash', hashHex)
            .maybeSingle();

        if (keyData) {
            await supabase
                .from('api_keys')
                .update({ last_used_at: new Date().toISOString() })
                .eq('key_hash', hashHex);
            return keyData.user_id;
        }
    } else if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user) return user.id;
    }

    return null;
}
