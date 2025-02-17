// iOS Audio Handler
class IOSAudioHandler {
    constructor() {
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        this.audioContext = null;
        this.isInitialized = false;
        this.speechSynthesis = window.speechSynthesis;
        this.currentAudio = null;
        this.recognition = null;
    }

    async initialize() {
        if (!this.isIOS) return true;

        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create and play silent buffer
            const buffer = this.audioContext.createBuffer(1, 1, 22050);
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(this.audioContext.destination);
            source.start(0);

            // Resume context
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            // Initialize speech synthesis
            const utterance = new SpeechSynthesisUtterance('');
            utterance.volume = 0;
            this.speechSynthesis.speak(utterance);

            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('iOS audio initialization failed:', error);
            return false;
        }
    }

    async playAudio(url, title) {
        if (!this.isInitialized && this.isIOS) {
            await this.initialize();
        }

        // Stop current audio if playing
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio = null;
        }

        try {
            const audio = new Audio(url);
            audio.crossOrigin = "anonymous";
            audio.playsinline = true;

            // iOS specific setup
            await audio.load();
            
            // Set up audio context for visualization
            if (this.audioContext) {
                const source = this.audioContext.createMediaElementSource(audio);
                const analyser = this.audioContext.createAnalyser();
                source.connect(analyser);
                analyser.connect(this.audioContext.destination);
                audio.audioContext = this.audioContext;
                audio.analyser = analyser;
            }

            this.currentAudio = audio;
            return audio;
        } catch (error) {
            console.error('iOS audio playback failed:', error);
            throw error;
        }
    }

    speak(text) {
        if (!this.isInitialized && this.isIOS) {
            this.initialize();
        }

        // Cancel any ongoing speech
        this.speechSynthesis.cancel();

        // Break text into smaller chunks for iOS
        const chunks = text.match(/[^.!?]+[.!?]+/g) || [text];
        
        const speakChunk = (index) => {
            if (index >= chunks.length) return;

            const utterance = new SpeechSynthesisUtterance(chunks[index]);
            
            // Try to use Samantha voice on iOS
            const voices = this.speechSynthesis.getVoices();
            const iOSVoice = voices.find(voice => 
                voice.name === 'Samantha' || 
                voice.name.includes('Female')
            );

            if (iOSVoice) {
                utterance.voice = iOSVoice;
            }

            utterance.onend = () => speakChunk(index + 1);
            this.speechSynthesis.speak(utterance);
        };

        speakChunk(0);
    }

    initializeRecognition() {
        if (!this.isIOS) return;

        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            this.recognition.maxAlternatives = 1;
        }
    }
}

// Export instance
const iOSAudioHandler = new IOSAudioHandler();
export default iOSAudioHandler; 