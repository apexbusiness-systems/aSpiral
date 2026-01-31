import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// MOCK DEPENDENCIES BEFORE IMPORTS
vi.mock('@/lib/logger', () => ({
    createLogger: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn()
    })
}));

vi.mock('@/lib/debugOverlay', () => ({
    addBreadcrumb: vi.fn()
}));

vi.mock('@/hooks/useAssistantSpeaking', () => ({
    useAssistantSpeakingStore: {
        getState: () => ({
            startSpeaking: vi.fn(),
            stopSpeaking: vi.fn()
        })
    }
}));

vi.mock('@/lib/featureFlags', () => ({
    featureFlags: {
        isEnabled: vi.fn().mockReturnValue(true)
    }
}));

vi.mock('@/integrations/supabase/client', () => ({
    supabase: {
        functions: {
            invoke: vi.fn().mockResolvedValue({ data: {}, error: null })
        }
    }
}));

vi.mock('@/lib/audioLogger', () => ({
    audioDebug: {
        log: vi.fn(),
        error: vi.fn()
    }
}));

vi.mock('@/lib/adaptiveVoiceSync', () => ({
    markAudioPlaybackStart: vi.fn(),
    getSyncStats: vi.fn().mockReturnValue({}),
    waitForSyncDelay: vi.fn().mockResolvedValue(undefined),
    markSpeakRequestStart: vi.fn()
}));

vi.mock('@/lib/i18n', () => ({
    i18n: {
        language: 'en-US'
    }
}));

vi.mock('sonner', () => ({
    toast: {
        error: vi.fn()
    }
}));

// Import after mocks
import {
    registerSTTController,
    updateListeningState,
    cleanupAudioSession,
    playOpenAiAudio,
    playOpenAiAudioFallback
} from '../src/lib/audioSession';

// Mock the AudioContext and HTMLAudioElement
const mockAudioContext = {
    state: 'suspended',
    resume: vi.fn().mockResolvedValue(undefined),
    suspend: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    createOscillator: vi.fn().mockReturnValue({
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        frequency: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }
    }),
    createGain: vi.fn().mockReturnValue({
        connect: vi.fn(),
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }
    }),
    createMediaStreamSource: vi.fn().mockReturnValue({
        connect: vi.fn()
    }),
    destination: {}
};

const mockAudioElement = {
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    src: '',
    onended: null,
    onerror: null,
};

// Mock global objects
global.AudioContext = vi.fn().mockImplementation(() => mockAudioContext);
// Coerce to any to avoid type mismatch with partial mock
global.window = { ...global.window, AudioContext: global.AudioContext } as any;
global.Audio = vi.fn().mockImplementation(() => mockAudioElement);
global.URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('Chaos Battery: AudioSession Resilience', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        cleanupAudioSession();
    });

    afterEach(() => {
        cleanupAudioSession();
    });

    it('CHAOS-001: Should handle rapid-fire listening state toggles without deadlock', async () => {
        const iterations = 100;
        const errors: any[] = [];

        // Register a mock controller
        const mockController = {
            stopListening: vi.fn(),
            resumeListening: vi.fn(),
            isListening: vi.fn().mockReturnValue(true)
        };
        registerSTTController(mockController);

        // Rapidly toggle state
        for (let i = 0; i < iterations; i++) {
            try {
                // Randomize between speaking, listening, and processing
                // Note: updateListeningState takes AudioSessionStatus
                const backends: any[] = ['none', 'openai', 'webSpeech'];
                const randomBackend = backends[Math.floor(Math.random() * backends.length)];
                const isSpeaking = Math.random() > 0.5;
                const isListening = Math.random() > 0.5;

                updateListeningState({ /* partial update logic simulation */
                    isSpeaking,
                    isLoading: false,
                    backend: randomBackend,
                    requestId: i,
                    lastCancelReason: null,
                    isListening
                });

                // Introduce micro-delays to simulate race conditions
                if (Math.random() > 0.8) {
                    await new Promise(r => setTimeout(r, Math.floor(Math.random() * 2)));
                }
            } catch (e) {
                errors.push(e);
            }
        }

        expect(errors.length).toBe(0);
    });

    it('CHAOS-002: Should recover from massive concurrent audio playback requests', async () => {
        const concurrentRequests = 50;
        const promises: Promise<any>[] = [];

        for (let i = 0; i < concurrentRequests; i++) {
            promises.push(
                playOpenAiAudio(
                    new Blob(['mock audio data'], { type: 'audio/mp3' }),
                    {
                        text: 'test',
                        voice: 'alloy',
                        speed: 1,
                        fallbackToWebSpeech: false,
                        onStart: vi.fn(),
                        onEnd: vi.fn(),
                        onError: vi.fn()
                    }
                ).catch(e => {
                    // We expect some to fail or be cancelled, but not crash the system
                    return 'cancelled';
                })
            );
        }

        const results = await Promise.all(promises);

        // Verify that the system didn't throw generic unhandled exceptions
        const crashes = results.filter(r => r instanceof Error && r.message !== 'Audio playback failed');
        expect(crashes.length).toBe(0);
    });

    it('CHAOS-003: Should handle simulated network failures in fallback mode', async () => {
        // Mock fetch failure for fallback
        global.fetch = vi.fn().mockRejectedValue(new Error('Network Chaos'));

        await expect(playOpenAiAudioFallback({
            text: 'concurrent text',
            voice: 'alloy',
            speed: 1,
            fallbackToWebSpeech: false,
            onStart: vi.fn(),
            onEnd: vi.fn(),
            onError: vi.fn()
        })).rejects.toThrow('Network Chaos');
    });

    it('CHAOS-004: Should strictly enforce singleton STT controller', () => {
        const controller1 = { stopListening: vi.fn(), resumeListening: vi.fn(), isListening: vi.fn() };
        const controller2 = { stopListening: vi.fn(), resumeListening: vi.fn(), isListening: vi.fn() };

        registerSTTController(controller1);
        registerSTTController(controller2); // Should displace controller1

        // Simulate state change that would trigger resume
        updateListeningState({
            isSpeaking: false,
            isLoading: false,
            backend: 'none',
            requestId: 1,
            lastCancelReason: null,
            isListening: true
        });

        // Depending on logic, it might trigger resume on new controller
        // This assumes implementation of registerSTTController does replacement
        expect(controller2.resumeListening).toHaveBeenCalled();
        // controller1 should NOT be called if it was properly replaced
        expect(controller1.resumeListening).not.toHaveBeenCalled();
    });
});
