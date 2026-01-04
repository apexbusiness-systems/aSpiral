export type BreadcrumbType =
  | 'voice'
  | 'settings'
  | 'director'
  | 'audio'
  | 'cinematic'
  | 'system';

export interface Breadcrumb {
  type: BreadcrumbType;
  message: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

export interface FatalErrorSnapshot {
  message: string;
  stack?: string;
  timestamp: number;
}

interface DebugState {
  breadcrumbs: Breadcrumb[];
  fatalError: FatalErrorSnapshot | null;
}

const MAX_BREADCRUMBS = 50;

let state: DebugState = {
  breadcrumbs: [],
  fatalError: null,
};

const listeners = new Set<(next: DebugState) => void>();

function notify() {
  listeners.forEach((listener) => listener(state));
}

export function subscribeDebugOverlay(listener: (next: DebugState) => void) {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

export function getDebugOverlayState(): DebugState {
  return state;
}

export function addBreadcrumb(entry: Omit<Breadcrumb, 'timestamp'>) {
  const breadcrumb: Breadcrumb = {
    ...entry,
    timestamp: Date.now(),
  };
  state = {
    ...state,
    breadcrumbs: [...state.breadcrumbs.slice(-(MAX_BREADCRUMBS - 1)), breadcrumb],
  };
  notify();
}

export function setFatalErrorSnapshot(snapshot: Omit<FatalErrorSnapshot, 'timestamp'>) {
  state = {
    ...state,
    fatalError: {
      ...snapshot,
      timestamp: Date.now(),
    },
  };
  notify();
}

export function clearFatalErrorSnapshot() {
  state = {
    ...state,
    fatalError: null,
  };
  notify();
}
