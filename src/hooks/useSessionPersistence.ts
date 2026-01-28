/* eslint-disable @typescript-eslint/no-explicit-any */
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
  ended_at: string | null;
}

interface PersistenceState {
  isSaving: boolean;
  lastSaved: Date | null;
  error: string | null;
  isLoading: boolean;
}

const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
const DEBOUNCE_DELAY = 2000; // 2 seconds debounce for rapid changes

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

  // Generate a hash of current state for comparison
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

  // Save session to Supabase
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
      // Using 'as any' because tables may not be in generated types yet
      const db = supabase as any;

      // Upsert session
      const { error: sessionError } = await db
        .from('sessions')
        .upsert({
          id: currentSession.id,
          user_id: user.id,
          status: currentSession.status,
          metadata: currentSession.metadata || {},
          created_at: currentSession.createdAt,
          updated_at: new Date().toISOString(),
          ended_at: currentSession.endedAt || null,
        }, { onConflict: 'id' });

      if (sessionError) throw sessionError;

      // Save entities (batch upsert)
      if (currentSession.entities.length > 0) {
        const entityRecords = currentSession.entities.map(e => ({
          id: e.id,
          session_id: currentSession.id,
          type: e.type,
          label: e.label,
          position: e.position || null,
          metadata: e.metadata || {},
          created_at: e.createdAt,
          updated_at: e.updatedAt,
        }));

        const { error: entityError } = await db
          .from('entities')
          .upsert(entityRecords, { onConflict: 'id' });

        if (entityError) throw entityError;
      }

      // Save connections
      if (currentSession.connections.length > 0) {
        const connectionRecords = currentSession.connections.map(c => ({
          id: c.id,
          session_id: currentSession.id,
          from_entity_id: c.fromEntityId,
          to_entity_id: c.toEntityId,
          type: c.type,
          strength: c.strength || 0.5,
        }));

        const { error: connectionError } = await db
          .from('connections')
          .upsert(connectionRecords, { onConflict: 'id' });

        if (connectionError) throw connectionError;
      }

      // Save friction points
      if (currentSession.frictionPoints.length > 0) {
        const frictionRecords = currentSession.frictionPoints.map(f => ({
          id: f.id,
          session_id: currentSession.id,
          entity_ids: f.entityIds,
          intensity: f.intensity || 0.5,
          description: f.description || null,
          discovered: f.discovered || false,
        }));

        const { error: frictionError } = await db
          .from('friction_points')
          .upsert(frictionRecords, { onConflict: 'id' });

        if (frictionError) throw frictionError;
      }

      // Save messages
      if (messages.length > 0) {
        const messageRecords = messages.map(m => ({
          id: m.id,
          session_id: currentSession.id,
          role: m.role,
          content: m.content,
          metadata: m.metadata || {},
          created_at: m.timestamp,
        }));

        const { error: messageError } = await db
          .from('messages')
          .upsert(messageRecords, { onConflict: 'id' });

        if (messageError) throw messageError;
      }

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

  // Debounced save
  const debouncedSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveSession();
    }, DEBOUNCE_DELAY);
  }, [saveSession]);

  // Auto-save interval
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

  // Save on session changes (debounced)
  useEffect(() => {
    if (user && currentSession) {
      debouncedSave();
    }
  }, [currentSession?.entities.length, currentSession?.connections.length, messages.length, debouncedSave]);

  // Save on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user && currentSession) {
        // Use sendBeacon for reliable unload saving
        const payload = JSON.stringify({
          sessionId: currentSession.id,
          userId: user.id,
          status: 'paused',
        });

        navigator.sendBeacon?.(
          `${import.meta.env.VITE_SUPABASE_URL || 'https://eqtwatyodujxofrdznen.supabase.co'}/rest/v1/rpc/save_session_status`,
          payload
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user, currentSession]);

  // Load user's sessions
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

  // Load a specific session with all related data
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

      // Load entities
      const { data: entities } = await db
        .from('entities')
        .select('*')
        .eq('session_id', sessionId);

      // Load connections
      const { data: connections } = await db
        .from('connections')
        .select('*')
        .eq('session_id', sessionId);

      // Load friction points
      const { data: frictionPoints } = await db
        .from('friction_points')
        .select('*')
        .eq('session_id', sessionId);

      // Load messages
      const { data: messagesData } = await db
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      setState(prev => ({ ...prev, isLoading: false }));

      // Transform to Session type
      const session: Session = {
        id: sessionData.id,
        userId: sessionData.user_id,
        status: sessionData.status,
        metadata: sessionData.metadata,
        createdAt: new Date(sessionData.created_at),
        updatedAt: new Date(sessionData.updated_at),
        endedAt: sessionData.ended_at ? new Date(sessionData.ended_at) : undefined,
        entities: (entities || []).map((e: any) => ({
          id: e.id,
          type: e.type,
          label: e.label,
          position: e.position,
          metadata: e.metadata,
          createdAt: new Date(e.created_at),
          updatedAt: new Date(e.updated_at),
        })),
        connections: (connections || []).map((c: any) => ({
          id: c.id,
          fromEntityId: c.from_entity_id,
          toEntityId: c.to_entity_id,
          type: c.type,
          strength: c.strength,
        })),
        frictionPoints: (frictionPoints || []).map((f: any) => ({
          id: f.id,
          entityIds: f.entity_ids,
          intensity: f.intensity,
          description: f.description,
          discovered: f.discovered,
        })),
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

  // Save a breakthrough
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
          friction,
          grease,
          insight,
          achieved_at: new Date().toISOString(),
        });

      if (error) throw error;
      logger.info('Breakthrough saved');

    } catch (error: any) {
      logger.error('Failed to save breakthrough', error);
    }
  }, [user]);

  // Delete a session
  const deleteSession = useCallback(async (sessionId: string) => {
    if (!user) return;

    try {
      const db = supabase as any;
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

  // Manual save trigger
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
