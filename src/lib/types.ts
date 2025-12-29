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
  valence?: number;
  importance?: number;
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
  strength: number;
}

export interface FrictionPoint {
  id: string;
  entityIds: string[];
  intensity: number;
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

// Engagement types
export type BreakthroughCategory = "career" | "relationship" | "financial" | "creative" | "anxiety" | "life_direction" | "health" | "other";

export interface Breakthrough {
  id: string;
  sessionId: string;
  userId: string;
  friction: string;
  grease: string;
  insight: string;
  category?: BreakthroughCategory;
  createdAt: Date;
  sharedAt?: Date;
  sharedPlatforms?: string[];
}

export interface UserStreak {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastBreakthroughAt: Date;
  streakStartedAt: Date;
  totalBreakthroughs: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
  progress?: number;
  maxProgress?: number;
}

export type AchievementId = "first_breakthrough" | "first_voice" | "speed_run" | "shared_insight" | "invited_friend" | "streak_7" | "streak_30" | "streak_100" | "night_owl" | "early_bird" | "polyglot" | "career_master" | "relationship_guru" | "anxiety_slayer";

export type OnboardingReason = "decision" | "anxiety" | "relationship" | "career" | "creative" | "curious" | "other";

export interface UserPreferences {
  userId: string;
  onboardingReason?: OnboardingReason;
  notificationConsent: boolean;
  theme: "dark" | "light" | "system";
  soundEnabled: boolean;
  hapticEnabled: boolean;
  onboardingCompleted: boolean;
  name?: string;
}
