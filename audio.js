// Add iOS detection
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const isIOSSafari = isIOS && isSafari;

// Initialize audio context with iOS compatibility
function initAudioContext() {
    // ...existing code...
    
    // iOS requires AudioContext to be initialized on user interaction
    if (isIOSSafari) {
        const resumeAudio = () => {
            if (audioContext.state === 'suspended') {
                audioContext.resume();
            }
            document.removeEventListener('touchstart', resumeAudio);
            document.removeEventListener('click', resumeAudio);
        };
        document.addEventListener('touchstart', resumeAudio);
        document.addEventListener('click', resumeAudio);
    }
    
    // ...existing code...
}

// Handle iOS microphone permissions
async function requestMicrophoneAccess() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        return stream;
    } catch (error) {
        if (isIOSSafari) {
            console.warn('iOS Safari requires microphone permission via Settings');
            // Show user instruction for iOS settings
            showIOSPermissionInstructions();
        }
        throw error;
    }
}

// Initialize speech synthesis with iOS workaround
function initSpeechSynthesis() {
    if (isIOSSafari) {
        // iOS Safari requires user interaction to start speech
        const startSpeech = () => {
            // Create and play a silent utterance to initialize speech
            const utterance = new SpeechSynthesisUtterance('');
            utterance.volume = 0;
            speechSynthesis.speak(utterance);
            document.removeEventListener('touchstart', startSpeech);
            document.removeEventListener('click', startSpeech);
        };
        document.addEventListener('touchstart', startSpeech);
        document.addEventListener('click', startSpeech);
    }
    // ...existing code...
}

// Add iOS permission instructions UI
function showIOSPermissionInstructions() {
    const instructions = document.createElement('div');
    instructions.className = 'ios-permission-instructions';
    instructions.innerHTML = `
        <div class="instructions-content">
            <h3>Enable Microphone Access</h3>
            <p>To use voice features on iOS Safari:</p>
            <ol>
                <li>Open Settings</li>
                <li>Scroll to Safari</li>
                <li>Tap Microphone</li>
                <li>Allow access for this website</li>
            </ol>
            <button class="dismiss-btn">Got it</button>
        </div>
    `;
    document.body.appendChild(instructions);

    instructions.querySelector('.dismiss-btn').addEventListener('click', () => {
        instructions.remove();
    });
}
