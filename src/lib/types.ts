/**
 * Core type definitions for aSpiral
 */

export type EntityType = "problem" | "emotion" | "value" | "action" | "friction" | "grease";

export type EntityRole = 
  | "external_irritant" 
  | "internal_conflict" 
  | "desire" 
  | "fear" 
  | "constraint" 
  | "solution";

export type ConnectionType = "causes" | "blocks" | "enables" | "resolves" | "opposes";

export interface EntityMetadata {
  role?: EntityRole;
  valence?: number;      // -1 (negative) to +1 (positive)
  importance?: number;   // 0 (minor) to 1 (critical)
  positionHint?: string;
  [key: string]: unknown;
}

export interface Position {
  x: number;
  y: number;
  z?: number;
}

export interface Entity {
  id: string;
  type: EntityType;
  label: string;
  position?: [number, number, number] | Position;
  metadata?: EntityMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface Connection {
  id: string;
  fromEntityId: string;
  toEntityId: string;
  type: ConnectionType;
  strength: number; // 0-1
}

export interface FrictionPoint {
  id: string;
  entityIds: string[];
  intensity: number; // 0-1
  description: string;
  discovered?: boolean;
}

export type SessionStatus = "active" | "exploring" | "friction" | "processing" | "breakthrough" | "completed";

export interface Session {
  id: string;
  userId: string;
  status: SessionStatus;
  entities: Entity[];
  connections: Connection[];
  frictionPoints: FrictionPoint[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  endedAt?: Date;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  entities?: Entity[];
  isStreaming?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ConversationInput {
  message: string;
  sessionId?: string;
  context?: {
    entities?: Entity[];
    connections?: Connection[];
    previousMessages?: Message[];
  };
}

export interface ConversationOutput {
  message: string;
  entities: Entity[];
  connections: Connection[];
  question: string | null;
  patternDetected: boolean;
  frictionPoint: FrictionPoint | null;
  sessionStatus?: SessionStatus;
}

export type ExportFormat = "3d-link" | "video" | "infographic" | "action-plan";

export interface ExportRequest {
  sessionId: string;
  format: ExportFormat;
}

export interface AppState {
  isConnected: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  currentSession: Session | null;
  messages: Message[];
  error: string | null;
}
