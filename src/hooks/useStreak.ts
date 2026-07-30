import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { createLogger } from '@/lib/logger';
import { getErrorMessage } from '@/lib/normalizeError';

const logger = createLogger('useStreak');

export function useStreak(userId: string | undefined) {
  const [streakDays, setStreakDays] = useState(0);

  const loadStreak = useCallback(async () => {
    if (!userId) return;
    try {
       
      const db = supabase as any;
      const { data } = await db
        .from('profiles')
        .select('streak_days')
        .eq('id', userId)
        .single();
      if (data) setStreakDays(data.streak_days || 0);
    } catch (error) {
      logger.warn('Failed to load streak', { error: getErrorMessage(error) });
    }
  }, [userId]);

  useEffect(() => {
    loadStreak();
  }, [loadStreak]);

  return { streakDays, loadStreak };
}
