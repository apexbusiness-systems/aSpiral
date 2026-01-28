
// Mock SpeechRecognition
globalThis.SpeechRecognition = class MockSpeechRecognition {
    continuous = false;
    interimResults = false;
    lang = 'en-US';
    onresult = null;
    onerror = null;
    onstart = null;
    onend = null;
    started = false;

    constructor() {
        globalThis.lastRecognition = this; // Expose instance for testing
    }

    start() {
        console.log('[MockSpeech] start() called');
        this.started = true;
        if (this.onstart) this.onstart();
    }

    stop() {
        console.log('[MockSpeech] stop() called');
        this.started = false;
        if (this.onend) this.onend();
    }

    // Helper for tests to trigger results
    emitResult(transcript, isFinal = true) {
        console.log(`[MockSpeech] emitResult: "${transcript}" (final=${isFinal})`);
        if (this.onresult) {
            const event = {
                resultIndex: 0,
                results: [
                    {
                        0: { transcript: transcript, confidence: 0.99 },
                        isFinal: isFinal,
                        length: 1
                    }
                ],
                type: 'result'
            };
            this.onresult(event);
        }
    }

    // Helper for tests to trigger errors
    emitError(errorType) {
        console.log(`[MockSpeech] emitError: ${errorType}`);
        if (this.onerror) {
            this.onerror({ error: errorType, message: 'Mock error' });
        }
    }
};
globalThis.webkitSpeechRecognition = globalThis.SpeechRecognition;

// Mock SpeechSynthesis
globalThis.speechSynthesis = {
    speaking: false,
    paused: false,
    pending: false,
    onvoiceschanged: null,

    getVoices() {
        return [{ name: 'Mock Voice', lang: 'en-US', default: true }];
    },

    speak(utterance) {
        console.log(`[MockTTS] speak: "${utterance.text}"`);
        this.speaking = true;
        if (utterance.onstart) utterance.onstart();

        setTimeout(() => {
            this.speaking = false;
            if (utterance.onend) utterance.onend();
        }, 100);
    },

    cancel() {
        console.log('[MockTTS] cancel');
        this.speaking = false;
    },

    pause() { this.paused = true; },
    resume() { this.paused = false; }
};

globalThis.SpeechSynthesisUtterance = class MockSpeechSynthesisUtterance {
    text;
    lang = 'en-US';
    volume = 1;
    rate = 1;
    pitch = 1;
    onstart = null;
    onend = null;
    onerror = null;

    constructor(text) {
        this.text = text;
    }

    // Clone method for completeness
    clone() {
        return new MockSpeechSynthesisUtterance(this.text);
    }
};
