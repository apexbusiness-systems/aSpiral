import type { SupabaseClient } from '@supabase/supabase-js';
import { createLogger } from '@/lib/logger';
import type { Database } from '@/integrations/supabase/types';
import { getErrorMessage } from '@/lib/normalizeError';

const logger = createLogger('ProfileStreak');

export async function fetchUserStreakDays(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<number> {
  try {
    const { data, error } = await client
      .from('profiles')
      .select('streak_days')
      .eq('id', userId)
      .single();

    if (error) {
      throw error;
    }

    return data?.streak_days ?? 0;
  } catch (error) {
    logger.warn('Failed to load streak', {
      userId,
      error: getErrorMessage(error),
    });
    return 0;
  }
}
