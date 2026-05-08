 
import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useSessionStore } from '@/stores/sessionStore';
import { createLogger } from '@/lib/logger';
import type { Session, Message, Entity, Connection, FrictionPoint } from '@/lib/types';

const logger = createLogger('SessionPersistence');

interface BreakthroughRecord {
  id: string;
  session_id: string;
  friction: string;
  grease: string;
  insight: string;
  achieved_at: string;
}

interface SessionRecord {
  id: string;
  user_id: string;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface PersistenceState {
  isSaving: boolean;
  lastSaved: Date | null;
  error: string | null;
  isLoading: boolean;
}

const AUTO_SAVE_INTERVAL = 30000;
const DEBOUNCE_DELAY = 2000;

import { saveSessionData } from '@/lib/sessionPersistence';

export function useSessionPersistence() {
  const { user } = useAuth();
  const { currentSession, messages } = useSessionStore();
  const [state, setState] = useState<PersistenceState>({
    isSaving: false,
    lastSaved: null,
    error: null,
    isLoading: false,
  });

  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedDataRef = useRef<string>('');
  const autoSaveIntervalRef = useRef<NodeJS.Timeout>();

  const getStateHash = useCallback(() => {
    if (!currentSession) return '';
    return JSON.stringify({
      entities: currentSession.entities,
      connections: currentSession.connections,
      frictionPoints: currentSession.frictionPoints,
      status: currentSession.status,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });
  }, [currentSession, messages]);

  const saveSession = useCallback(async (force = false) => {
    if (!user || !currentSession) {
      logger.debug('Skip save: no user or session');
      return;
    }

    const currentHash = getStateHash();
    if (!force && currentHash === lastSavedDataRef.current) {
      logger.debug('Skip save: no changes');
      return;
    }

    setState(prev => ({ ...prev, isSaving: true, error: null }));
    logger.info('Saving session...', { sessionId: currentSession.id });

    try {
      const db = supabase as any;
      await saveSessionData(db, user, currentSession, messages);

      lastSavedDataRef.current = currentHash;
      setState(prev => ({
        ...prev,
        isSaving: false,
        lastSaved: new Date(),
      }));
      logger.info('Session saved successfully');

    } catch (error: any) {
      logger.error('Failed to save session', error);
      setState(prev => ({
        ...prev,
        isSaving: false,
        error: error.message || 'Failed to save session',
      }));
    }
  }, [user, currentSession, messages, getStateHash]);

  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveSession();
    }, DEBOUNCE_DELAY);
  }, [saveSession]);

  useEffect(() => {
    if (user && currentSession) {
      autoSaveIntervalRef.current = setInterval(() => {
        saveSession();
      }, AUTO_SAVE_INTERVAL);

      return () => {
        if (autoSaveIntervalRef.current) {
          clearInterval(autoSaveIntervalRef.current);
        }
      };
    }
  }, [user, currentSession, saveSession]);

  useEffect(() => {
    if (user && currentSession) {
      debouncedSave();
    }
  }, [currentSession?.entities.length, currentSession?.connections.length, messages.length, debouncedSave, user, currentSession]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user && currentSession) {
        const payload = JSON.stringify({
          sessionId: currentSession.id,
          userId: user.id,
          status: 'paused',
        });

        if (import.meta.env.VITE_SUPABASE_URL) {
          navigator.sendBeacon?.(
            `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/rpc/save_session_status`,
            payload
          );
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, currentSession?.id]);

  // Load user's sessions with entity counts and breakthrough data
  const loadSessions = useCallback(async (): Promise<SessionRecord[]> => {
    if (!user) return [];

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const db = supabase as any;
      const { data, error } = await db
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setState(prev => ({ ...prev, isLoading: false }));
      return data || [];

    } catch (error: any) {
      logger.error('Failed to load sessions', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message,
      }));
      return [];
    }
  }, [user]);

  // Load a specific session with entities and connections
  const loadSession = useCallback(async (sessionId: string): Promise<Session | null> => {
    if (!user) return null;

    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const db = supabase as any;

      // Load session
      const { data: sessionData, error: sessionError } = await db
        .from('sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single();

      if (sessionError) throw sessionError;
      if (!sessionData) return null;

      // Load entities and connections in parallel
      const [entitiesResult, connectionsResult] = await Promise.all([
        db.from('session_entities').select('*').eq('session_id', sessionId),
        db.from('session_connections').select('*').eq('session_id', sessionId),
      ]);

      setState(prev => ({ ...prev, isLoading: false }));

      const session: Session = {
        id: sessionData.id,
        userId: sessionData.user_id,
        status: sessionData.status,
        metadata: sessionData.metadata,
        createdAt: new Date(sessionData.created_at),
        updatedAt: new Date(sessionData.updated_at),
        entities: (entitiesResult.data || []).map((e: any) => ({
          id: e.id,
          type: e.type,
          label: e.label,
          metadata: e.metadata,
          createdAt: new Date(e.created_at),
          updatedAt: new Date(e.updated_at),
        })),
        connections: (connectionsResult.data || []).map((c: any) => ({
          id: c.id,
          fromEntityId: c.from_entity_id,
          toEntityId: c.to_entity_id,
          type: c.type,
          strength: c.strength,
        })),
        frictionPoints: [],
      };

      return session;

    } catch (error: any) {
      logger.error('Failed to load session', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message,
      }));
      return null;
    }
  }, [user]);

  // Load breakthroughs for a session
  const loadBreakthroughs = useCallback(async (sessionId: string): Promise<BreakthroughRecord[]> => {
    if (!user) return [];

    try {
      const db = supabase as any;
      const { data, error } = await db
        .from('breakthroughs')
        .select('*')
        .eq('session_id', sessionId)
        .order('achieved_at', { ascending: false });

      if (error) throw error;
      return data || [];

    } catch (error: any) {
      logger.error('Failed to load breakthroughs', error);
      return [];
    }
  }, [user]);

  // Save a breakthrough and update streak
  const saveBreakthrough = useCallback(async (
    sessionId: string,
    friction: string,
    grease: string,
    insight: string
  ) => {
    if (!user) return;

    try {
      const db = supabase as any;
      const { error } = await db
        .from('breakthroughs')
        .insert({
          session_id: sessionId,
          user_id: user.id,
          friction,
          grease,
          insight,
          achieved_at: new Date().toISOString(),
        });

      if (error) throw error;
      logger.info('Breakthrough saved');

      // Update streak on profile
      try {
        const { data: profile } = await db
          .from('profiles')
          .select('streak_days, last_session_at')
          .eq('id', user.id)
          .single();

        const now = new Date();
        const today = now.toISOString().split('T')[0];
        let newStreak = 1;

        if (profile?.last_session_at) {
          const lastDate = new Date(profile.last_session_at).toISOString().split('T')[0];
          if (lastDate === today) {
            // Already counted today
            newStreak = profile.streak_days || 1;
          } else {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];
            if (lastDate === yesterdayStr) {
              newStreak = (profile.streak_days || 0) + 1;
            }
          }
        }

        await db
          .from('profiles')
          .update({
            streak_days: newStreak,
            last_session_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq('id', user.id);

        logger.info('Streak updated', { newStreak });
      } catch (streakErr: any) {
        logger.error('Failed to update streak', streakErr);
      }

    } catch (error: any) {
      logger.error('Failed to save breakthrough', error);
    }
  }, [user]);

  // Delete a session and related data
  const deleteSession = useCallback(async (sessionId: string) => {
    if (!user) return;

    try {
      const db = supabase as any;
      
      // Delete related data first (connections, entities, breakthroughs)
      await Promise.all([
        db.from('session_connections').delete().eq('session_id', sessionId),
        db.from('session_entities').delete().eq('session_id', sessionId),
        db.from('breakthroughs').delete().eq('session_id', sessionId),
      ]);

      // Then delete the session
      const { error } = await db
        .from('sessions')
        .delete()
        .eq('id', sessionId)
        .eq('user_id', user.id);

      if (error) throw error;
      logger.info('Session deleted', { sessionId });

    } catch (error: any) {
      logger.error('Failed to delete session', error);
      throw error;
    }
  }, [user]);

  const save = useCallback(() => {
    return saveSession(true);
  }, [saveSession]);

  return {
    ...state,
    save,
    loadSessions,
    loadSession,
    loadBreakthroughs,
    saveBreakthrough,
    deleteSession,
  };
}
