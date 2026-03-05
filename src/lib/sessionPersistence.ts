
import { supabase } from '@/integrations/supabase/client';
import type { Session, Message } from '@/lib/types';

/**
 * Core Supabase save logic extracted for testability
 */
export async function saveSessionData(
  db: any,
  user: { id: string },
  currentSession: Session,
  messages: Message[]
) {
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

  // Parallelize dependent records (connections, friction points, messages)
  const upsertTasks = [];

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

    upsertTasks.push(db.from('connections').upsert(connectionRecords, { onConflict: 'id' }));
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

    upsertTasks.push(db.from('friction_points').upsert(frictionRecords, { onConflict: 'id' }));
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

    upsertTasks.push(db.from('messages').upsert(messageRecords, { onConflict: 'id' }));
  }

  if (upsertTasks.length > 0) {
    const results = await Promise.all(upsertTasks);
    const errorResult = results.find(r => r.error);
    if (errorResult?.error) throw errorResult.error;
  }
}
