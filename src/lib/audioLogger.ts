import { createLogger } from './logger';

const isDebugEnabled = import.meta.env.VITE_AUDIO_DEBUG === 'true';

const logger = createLogger('AudioDebug');

export interface AudioDebugEvent {
  type:
  | 'mic_permission'
  | 'session_start'
  | 'session_end'
  | 'recognizer_start'
  | 'recognizer_stop'
  | 'recognizer_error'
  | 'stt_interim'
  | 'stt_final'
  | 'stt_dedupe'
  | 'watchdog_restart'
  | 'watchdog_restart_failed'
  | 'tts_enqueue'
  | 'tts_start'
  | 'tts_end'
  | 'tts_error'
  | 'audio_route_change'
  | 'app_state_change';
  payload: unknown;
  timestamp: number;
}

export const audioDebug = {
  log: (type: AudioDebugEvent['type'], payload: unknown) => {
    if (!isDebugEnabled) return;

    const event: AudioDebugEvent = {
      type,
      payload,
      timestamp: Date.now(),
    };

    // Log to console with distinct styling
    console.groupCollapsed(`%c[Audio] ${type}`, 'color: #8b5cf6; font-weight: bold;');
    console.log('Payload:', payload);
    console.log('Timestamp:', new Date(event.timestamp).toISOString());
    console.groupEnd();

    // In a real scenario, we might want to persist this or send it to a server
    // For now, it stays in console/memory
  },

  error: (type: AudioDebugEvent['type'], error: unknown) => {
    if (!isDebugEnabled) return;
    console.error(`%c[Audio Error] ${type}`, 'color: #ef4444; font-weight: bold;', error);
  }
};
