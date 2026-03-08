
import type { Session, Message } from '@/lib/types';

/**
 * Core Supabase save logic extracted for testability.
 * Uses actual table names: session_entities, session_connections
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
      metadata: {
        ...(currentSession.metadata || {}),
        messageCount: messages.length,
        entityCount: currentSession.entities.length,
      },
      created_at: currentSession.createdAt,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (sessionError) throw sessionError;

  // Save entities to session_entities table
  if (currentSession.entities.length > 0) {
    const entityRecords = currentSession.entities.map(e => ({
      id: e.id,
      session_id: currentSession.id,
      type: e.type,
      label: e.label,
      metadata: e.metadata || {},
      created_at: e.createdAt,
      updated_at: e.updatedAt,
    }));

    const { error: entityError } = await db
      .from('session_entities')
      .upsert(entityRecords, { onConflict: 'id' });

    if (entityError) throw entityError;
  }

  // Save connections to session_connections table
  if (currentSession.connections.length > 0) {
    const connectionRecords = currentSession.connections.map(c => ({
      id: c.id,
      session_id: currentSession.id,
      from_entity_id: c.fromEntityId,
      to_entity_id: c.toEntityId,
      type: c.type,
      strength: c.strength || 0.5,
    }));

    const { error: connError } = await db
      .from('session_connections')
      .upsert(connectionRecords, { onConflict: 'id' });

    if (connError) throw connError;
  }
}
