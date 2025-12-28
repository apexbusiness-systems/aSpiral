import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Session, Message, Entity, Connection, FrictionPoint, SessionStatus } from "@/lib/types";
import { createLogger } from "@/lib/logger";
import { generateIdempotencyKey } from "@/lib/idempotent";

const logger = createLogger("SessionStore");

interface FrictionVisualization {
  topLabel: string;
  bottomLabel: string;
  intensity: number;
  entityIds: [string, string];
}

interface SessionState {
  // Current session
  currentSession: Session | null;
  messages: Message[];
  
  // Visualization state
  activeFriction: FrictionVisualization | null;
  isApplyingGrease: boolean;
  greaseIsCorrect: boolean;
  isBreakthroughActive: boolean;
  
  // UI State
  isRecording: boolean;
  isProcessing: boolean;
  isConnected: boolean;
  error: string | null;
  
  // Actions
  createSession: (userId: string) => Session;
  updateSession: (updates: Partial<Session>) => void;
  endSession: () => void;
  
  addMessage: (message: Omit<Message, "id" | "timestamp">) => Message;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  clearMessages: () => void;
  
  addEntity: (entity: Omit<Entity, "id" | "createdAt" | "updatedAt">) => Entity;
  addConnection: (connection: Omit<Connection, "id">) => Connection;
  addFrictionPoint: (friction: Omit<FrictionPoint, "id">) => FrictionPoint;
  
  // Visualization actions
  showFriction: (topLabel: string, bottomLabel: string, intensity: number, entityIds: [string, string]) => void;
  hideFriction: () => void;
  applyGrease: (isCorrect: boolean) => void;
  triggerBreakthrough: () => void;
  clearBreakthrough: () => void;
  
  setRecording: (recording: boolean) => void;
  setProcessing: (processing: boolean) => void;
  setConnected: (connected: boolean) => void;
  setError: (error: string | null) => void;
  
  reset: () => void;
}

const generateId = () => crypto.randomUUID();

const initialSession = (): Session => ({
  id: generateId(),
  userId: "",
  status: "active",
  entities: [],
  connections: [],
  frictionPoints: [],
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      currentSession: null,
      messages: [],
      activeFriction: null,
      isApplyingGrease: false,
      greaseIsCorrect: false,
      isBreakthroughActive: false,
      isRecording: false,
      isProcessing: false,
      isConnected: false,
      error: null,

      createSession: (userId: string) => {
        const existing = get().currentSession;
        
        // Idempotent: return existing active session
        if (existing && existing.userId === userId && existing.status === "active") {
          logger.info("Returning existing active session", { sessionId: existing.id });
          return existing;
        }

        const session: Session = {
          ...initialSession(),
          userId,
          metadata: {
            idempotencyKey: generateIdempotencyKey("session", userId),
          },
        };

        logger.info("Creating new session", { sessionId: session.id, userId });

        set({
          currentSession: session,
          messages: [],
          error: null,
        });

        return session;
      },

      updateSession: (updates) => {
        set((state) => {
          if (!state.currentSession) return state;
          
          const updated: Session = {
            ...state.currentSession,
            ...updates,
            updatedAt: new Date(),
          };
          
          logger.debug("Session updated", { sessionId: updated.id, updates });
          
          return { currentSession: updated };
        });
      },

      endSession: () => {
        set((state) => {
          if (!state.currentSession) return state;
          
          logger.info("Session ended", { sessionId: state.currentSession.id });
          
          return {
            currentSession: {
              ...state.currentSession,
              status: "completed" as SessionStatus,
              endedAt: new Date(),
              updatedAt: new Date(),
            },
          };
        });
      },

      addMessage: (message) => {
        const newMessage: Message = {
          ...message,
          id: generateId(),
          timestamp: new Date(),
        };

        set((state) => ({
          messages: [...state.messages, newMessage],
        }));

        return newMessage;
      },

      updateMessage: (id, updates) => {
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        }));
      },

      clearMessages: () => {
        set({ messages: [] });
      },

      addEntity: (entityInput) => {
        const entity: Entity = {
          ...entityInput,
          id: generateId(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => {
          if (!state.currentSession) return state;
          
          // Idempotent: check for existing entity with same label
          const normalized = entity.label.toLowerCase().trim();
          const existing = state.currentSession.entities.find(
            (e) => e.label.toLowerCase().trim() === normalized && e.type === entity.type
          );
          
          if (existing) {
            logger.debug("Entity already exists", { label: entity.label });
            return state;
          }

          logger.info("Entity added", { type: entity.type, label: entity.label });

          return {
            currentSession: {
              ...state.currentSession,
              entities: [...state.currentSession.entities, entity],
              updatedAt: new Date(),
            },
          };
        });

        return entity;
      },

      addConnection: (connectionInput) => {
        const connection: Connection = {
          ...connectionInput,
          id: generateId(),
        };

        set((state) => {
          if (!state.currentSession) return state;

          // Idempotent: check for existing connection
          const existing = state.currentSession.connections.find(
            (c) =>
              c.fromEntityId === connection.fromEntityId &&
              c.toEntityId === connection.toEntityId &&
              c.type === connection.type
          );

          if (existing) return state;

          return {
            currentSession: {
              ...state.currentSession,
              connections: [...state.currentSession.connections, connection],
              updatedAt: new Date(),
            },
          };
        });

        return connection;
      },

      addFrictionPoint: (frictionInput) => {
        const friction: FrictionPoint = {
          ...frictionInput,
          id: generateId(),
        };

        set((state) => {
          if (!state.currentSession) return state;

          return {
            currentSession: {
              ...state.currentSession,
              frictionPoints: [...state.currentSession.frictionPoints, friction],
              status: "friction" as SessionStatus,
              updatedAt: new Date(),
            },
          };
        });

        return friction;
      },

      // Visualization actions
      showFriction: (topLabel, bottomLabel, intensity, entityIds) => {
        logger.info("Showing friction", { topLabel, bottomLabel, intensity });
        set({
          activeFriction: { topLabel, bottomLabel, intensity, entityIds },
        });
      },

      hideFriction: () => {
        set({ activeFriction: null });
      },

      applyGrease: (isCorrect) => {
        logger.info("Applying grease", { isCorrect });
        set({ isApplyingGrease: true, greaseIsCorrect: isCorrect });
        
        // Auto-hide after animation
        setTimeout(() => {
          set({ isApplyingGrease: false });
          if (isCorrect) {
            // Trigger breakthrough after successful grease
            set({ activeFriction: null });
          }
        }, 2000);
      },

      triggerBreakthrough: () => {
        logger.info("Breakthrough triggered!");
        set({ 
          isBreakthroughActive: true,
          activeFriction: null,
        });
        
        // Update session status
        set((state) => {
          if (!state.currentSession) return state;
          return {
            currentSession: {
              ...state.currentSession,
              status: "breakthrough" as SessionStatus,
              updatedAt: new Date(),
            },
          };
        });
      },

      clearBreakthrough: () => {
        set({ isBreakthroughActive: false });
      },

      setRecording: (recording) => set({ isRecording: recording }),
      setProcessing: (processing) => set({ isProcessing: processing }),
      setConnected: (connected) => set({ isConnected: connected }),
      setError: (error) => set({ error }),

      reset: () => {
        logger.info("Store reset");
        set({
          currentSession: null,
          messages: [],
          isRecording: false,
          isProcessing: false,
          error: null,
        });
      },
    }),
    {
      name: "aspiral-session",
      partialize: (state) => ({
        currentSession: state.currentSession,
        messages: state.messages,
      }),
    }
  )
);
