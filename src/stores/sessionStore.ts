import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Session, Message, Entity, Connection, FrictionPoint, SessionStatus } from "@/lib/types";
import { createLogger } from "@/lib/logger";
import { generateIdempotencyKey } from "@/lib/idempotent";
import { createBreakthroughSlice, type BreakthroughSlice } from "./breakthroughSlice";

const logger = createLogger("SessionStore");

interface SessionState {
  // Current session
  currentSession: Session | null;
  messages: Message[];

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

  setRecording: (recording: boolean) => void;
  setProcessing: (processing: boolean) => void;
  setConnected: (connected: boolean) => void;
  setError: (error: string | null) => void;

  reset: () => void;
}

// Combined Store Type
type StoreState = SessionState & BreakthroughSlice;

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

export const useSessionStore = create<StoreState>()(
  persist(
    (...a) => ({
      // Slice: Session
      currentSession: null,
      messages: [],
      isRecording: false,
      isProcessing: false,
      isConnected: false,
      error: null,

      createSession: (userId: string) => {
        const [set, get] = a;
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
        const [set] = a;
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
        const [set] = a;
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
        const [set] = a;
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
        const [set] = a;
        set((state) => ({
          messages: state.messages.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        }));
      },

      clearMessages: () => {
        const [set] = a;
        set({ messages: [] });
      },

      addEntity: (entityInput) => {
        const [set] = a;
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
        const [set] = a;
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
        const [set] = a;
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

      setRecording: (recording) => {
        const [set] = a;
        set({ isRecording: recording });
      },
      setProcessing: (processing) => {
        const [set] = a;
        set({ isProcessing: processing });
      },
      setConnected: (connected) => {
        const [set] = a;
        set({ isConnected: connected });
      },
      setError: (error) => {
        const [set] = a;
        set({ error });
      },

      reset: () => {
        const [set] = a;
        logger.info("Store reset");
        set({
          currentSession: null,
          messages: [],
          isRecording: false,
          isProcessing: false,
          error: null,
        });
        // Also reset breakthrough state
        a[0]((state) => ({ ...state, ...createBreakthroughSlice(...a) }));
      },

      // Slice: Breakthrough
      ...createBreakthroughSlice(...a),
    }),
    {
      name: "aspiral-session",
      partialize: (state) => ({
        currentSession: state.currentSession,
        messages: state.messages,
        // Persist breakthrough state if desired, or leave out to reset on reload
      }),
    }
  )
);
