
// Mock SpeechRecognition
window.SpeechRecognition = class MockSpeechRecognition {
    constructor() {
        this.continuous = false;
        this.interimResults = false;
        this.lang = 'en-US';
        this.onresult = null;
        this.onerror = null;
        this.onstart = null;
        this.onend = null;
        this.started = false;
        window.lastRecognition = this; // Expose instance for testing
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
window.webkitSpeechRecognition = window.SpeechRecognition;

// Mock SpeechSynthesis
window.speechSynthesis = {
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

window.SpeechSynthesisUtterance = class MockSpeechSynthesisUtterance {
    constructor(text) {
        this.text = text;
        this.lang = 'en-US';
        this.volume = 1;
        this.rate = 1;
        this.pitch = 1;
        this.onstart = null;
        this.onend = null;
        this.onerror = null;
    }
};
