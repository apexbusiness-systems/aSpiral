import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
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
  _entityLookup?: Record<string, boolean>;
  _connectionLookup?: Record<string, boolean>;
  messages: Message[];
  
  // Visualization state
  activeFriction: FrictionVisualization | null;
  isApplyingGrease: boolean;
  greaseIsCorrect: boolean;
  isBreakthroughActive: boolean;
  isBreakthroughImminent: boolean;
  
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
  
  // Internal lookup management
  _entityLookup: Set<string>;
  _connectionLookup: Set<string>;
  _rebuildLookups: () => void;

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
      _entityLookup: {},
      _connectionLookup: {},
      messages: [],
      activeFriction: null,
      isApplyingGrease: false,
      greaseIsCorrect: false,
      isBreakthroughActive: false,
      isBreakthroughImminent: false,
      isRecording: false,
      isProcessing: false,
      isConnected: false,
      error: null,
      _entityLookup: new Set(),
      _connectionLookup: new Set(),

      _rebuildLookups: () => {
        const { currentSession } = get();
        if (!currentSession) {
          set({ _entityLookup: new Set(), _connectionLookup: new Set() });
          return;
        }

        const entityLookup = new Set(
          currentSession.entities.map(e => `${e.type}:${e.label.toLowerCase().trim()}`)
        );
        const connectionLookup = new Set(
          currentSession.connections.map(c => `${c.fromEntityId}:${c.toEntityId}:${c.type}`)
        );

        set({ _entityLookup: entityLookup, _connectionLookup: connectionLookup });
      },

      createSession: (userId: string) => {
        const existing = get().currentSession;
        
        // Idempotent: return existing active session
        if (existing && existing.userId === userId && existing.status === "active") {
          logger.info("Returning existing active session", { sessionId: existing.id });
          get()._rebuildLookups();
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
          _entityLookup: {},
          _connectionLookup: {},
          messages: [],
          error: null,
          _entityLookup: new Set(),
          _connectionLookup: new Set(),
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

        const key = `${entity.type}:${entity.label.toLowerCase().trim()}`;

        if (get()._entityLookup.has(key)) {
          logger.debug("Entity already exists", { label: entity.label });
          // We still need to find it if we want to return the existing one,
          // but the state doesn't change so returning the input-based one is fine for idempotency
          // if the caller only cares if it's there.
          // Actually, current implementation returns the NEW entity object even if it's not added.
          // Wait, addEntity returns the new entity object. If it already exists, it doesn't add it.
          // Let's keep that behavior but optimized.
          return entity;
        }

        set((state) => {
          if (!state.currentSession) return state;
          
          const newLookup = new Set(state._entityLookup);
          newLookup.add(key);

          logger.info("Entity added", { type: entity.type, label: entity.label });

          return {
            _entityLookup: newLookup,
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

        const key = `${connection.fromEntityId}:${connection.toEntityId}:${connection.type}`;

        if (get()._connectionLookup.has(key)) {
          return connection;
        }

        set((state) => {
          if (!state.currentSession) return state;

          const newLookup = new Set(state._connectionLookup);
          newLookup.add(key);

          return {
            _connectionLookup: newLookup,
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
          _entityLookup: {},
          _connectionLookup: {},
          messages: [],
          isRecording: false,
          isProcessing: false,
          error: null,
          _entityLookup: new Set(),
          _connectionLookup: new Set(),
        });
      },
    }),
    {
      name: "aspiral-session",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        currentSession: state.currentSession,
        messages: state.messages,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state._rebuildLookups();
        }
      },
    }
  )
);
