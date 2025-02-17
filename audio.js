const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
const isIOSSafari = isIOS && isSafari;

let audioContext = null;
let isSpeechInitialized = false;

// Initialize audio on first user interaction
function initAudioForIOS() {
    if (!isIOSSafari) return;

    const initOnInteraction = async () => {
        try {
            // Create audio context on user interaction
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            await audioContext.resume();

            // Initialize speech synthesis
            const utterance = new SpeechSynthesisUtterance('');
            utterance.volume = 0;
            speechSynthesis.speak(utterance);
            
            isSpeechInitialized = true;
            
            // Remove listeners after successful initialization
            document.removeEventListener('touchstart', initOnInteraction);
            document.removeEventListener('click', initOnInteraction);
        } catch (error) {
            console.error('Failed to initialize audio:', error);
        }
    };

    document.addEventListener('touchstart', initOnInteraction);
    document.addEventListener('click', initOnInteraction);
}

// Handle microphone access with proper iOS support
async function startVoiceInput() {
    if (isIOSSafari && !isSpeechInitialized) {
        showIOSPermissionInstructions();
        return false;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: true,
            video: false
        });
        
        // Additional iOS specific stream handling
        if (isIOSSafari) {
            const audioTracks = stream.getAudioTracks();
            if (audioTracks.length > 0) {
                audioTracks[0].onended = () => {
                    console.log('Audio track ended');
                    // Handle track end
                };
            }
        }
        
        return stream;
    } catch (error) {
        if (error.name === 'NotAllowedError' && isIOSSafari) {
            showIOSPermissionInstructions();
        } else {
            console.error('Microphone access error:', error);
        }
        return false;
    }
}

// Enhanced speech synthesis for iOS
function speak(text) {
    if (!isSpeechInitialized && isIOSSafari) {
        const speakOnInteraction = () => {
            performSpeak(text);
            document.removeEventListener('touchstart', speakOnInteraction);
            document.removeEventListener('click', speakOnInteraction);
        };
        
        document.addEventListener('touchstart', speakOnInteraction);
        document.addEventListener('click', speakOnInteraction);
        return;
    }
    
    performSpeak(text);
}

function performSpeak(text) {
    if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    // iOS specific utterance settings
    if (isIOSSafari) {
        utterance.onstart = () => console.log('Speech started');
        utterance.onend = () => console.log('Speech ended');
        utterance.onerror = (event) => console.error('Speech error:', event);
    }

    speechSynthesis.speak(utterance);
}

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
    if (isIOSSafari) {
        initAudioForIOS();
        // Show initial instruction for iOS users
        const instructions = document.createElement('div');
        instructions.className = 'ios-instruction';
        instructions.textContent = 'Tap anywhere to enable voice features';
        document.body.appendChild(instructions);
        
        // Remove instruction after first interaction
        const removeInstruction = () => {
            instructions.remove();
            document.removeEventListener('touchstart', removeInstruction);
            document.removeEventListener('click', removeInstruction);
        };
        document.addEventListener('touchstart', removeInstruction);
        document.addEventListener('click', removeInstruction);
    }
});

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