// Update the constants at the beginning of the script
const YT_SEARCH_API = 'https://api.paxsenix.biz.id/yt-music/search';  // Remove 'api/' from the URL
const YT_DOWNLOAD_API = 'https://api.paxsenix.biz.id/dl/ytmp3';  // YouTube downloader endpoint

// Original orb interaction code
const orbContainer = document.getElementById('orb-container');
const pupils = document.querySelectorAll('.pupil');
let isDragging = false;
let currentX;
let currentY;
let initialX;
let initialY;
let xOffset = 0;
let yOffset = 0;
let lastMovementTime = 0;
const idleThreshold = 500;

// Chat functionality
const chatContainer = document.getElementById('chatContainer');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const magicalOrb = document.querySelector('.magical-orb');

// Toggle chat on orb click
orbContainer.addEventListener('click', (e) => {
  // Check if click is on a result item
  const resultItem = e.target.closest('.result-item');
  if (resultItem) {
    // Prevent starting voice recognition
    e.stopPropagation();
    return;
  }

  if (!isDragging) {
    if (!isListening && recognition) {
      isListening = true;
      recognition.start();
      orbContainer.classList.add('listening');
      speechBubble.classList.add('listening');
      speechBubble.textContent = "I'm listening...";
      chatContainer.classList.remove('visible');
      keyboardIcon.classList.remove('active');
    } else if (isListening) {
      isListening = false;
      recognition.stop();
    }
    idleMessage.classList.remove('visible');
  }
});

// API configuration
const API_KEY = 'AIzaSyBlvhpuRx-ispBO9mCxnMNu78FQ4rLnmrI'; // Replace with your actual API key
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Add these functions to the script section
function showCaption(text) {
  const captionContainer = document.getElementById('captionContainer');
  const captionText = captionContainer.querySelector('.caption-text');
  captionText.textContent = text;
  captionContainer.style.opacity = '1';
}

function hideCaption() {
  const captionContainer = document.getElementById('captionContainer');
  captionContainer.style.opacity = '0';
}

// Add click animation
orbContainer.addEventListener('mousedown', () => {
  magicalOrb.classList.add('orb-click');
});

orbContainer.addEventListener('mouseup', () => {
  magicalOrb.classList.remove('orb-click');
});

// Add this function to store messages
function saveMessage(text, type) {
  const history = JSON.parse(localStorage.getItem('stormyChatHistory') || '[]');
  history.push({
    text,
    type,
    timestamp: new Date().toISOString()
  });
  
  // Keep only the last 25 messages
  if (history.length > 25) {
    history.splice(0, history.length - 25);
  }
  
  localStorage.setItem('stormyChatHistory', JSON.stringify(history));
}

// Initialize speech synthesis and get voices
let speechSynthesis = window.speechSynthesis;
let voices = [];

function loadVoices() {
  voices = speechSynthesis.getVoices();
}

// Load voices when they're available
if (speechSynthesis.onvoiceschanged !== undefined) {
  speechSynthesis.onvoiceschanged = loadVoices;
}

// Add these variables at the top with other initializations
let recognition;
let isListening = false;
let currentLanguage = 'en-US';

// Add this after initializing other variables
const languageSelect = document.getElementById('language-select');

// Add this to your initialization code
languageSelect.addEventListener('change', (e) => {
    currentLanguage = e.target.value;
    // Restart recognition with new language
    if (recognition) {
        recognition.stop();
    }
    initializeSpeechRecognition();
});

function initializeSpeechRecognition() {
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = currentLanguage;
        
        recognition.onstart = () => {
            orbContainer.classList.add('listening');
            speechBubble.textContent = "I'm listening...";
            speechBubble.classList.add('active', 'listening');
            isListening = true;
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            console.log('Voice input:', transcript);
            
            // Stop listening before processing the command
            recognition.stop();
            orbContainer.classList.remove('listening');
            speechBubble.classList.remove('listening');
            
            if (transcript.toLowerCase().includes('imagine')) {
                const query = transcript.replace(/imagine/i, '').trim();
                handleUserInput(`imagine ${query}`);
            } else if (transcript.toLowerCase().includes('play')) {
                const query = transcript.replace(/play/i, '').trim();
                handlePlayCommand(query);
            } else {
                handleUserInput(transcript);
            }
        };

        recognition.onend = () => {
            orbContainer.classList.remove('listening');
            speechBubble.classList.remove('active', 'listening');
            isListening = false;
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            orbContainer.classList.remove('listening');
            speechBubble.textContent = "Sorry, I couldn't hear that.";
            speechBubble.classList.remove('listening');
            setTimeout(() => speechBubble.classList.remove('active'), 2000);
            isListening = false;
        };
    }
}

// Update handleUserInput function
async function handleUserInput(directInput) {
    const input = directInput || userInput.value.trim();
    if (!input) return;

    // Check for imagine command
    const imagineCommand = input.toLowerCase().match(/^(imagine)\s+(.+)/);
    if (imagineCommand) {
        const query = imagineCommand[2];
        
        // Save the imagine command to chat history
        saveMessage(`${imagineCommand[1]}: ${query}`, 'user');
        
        // Show thinking animation
        orbContainer.classList.add('thinking');
        speechBubble.textContent = "Let me imagine that for you...";
        speechBubble.classList.add('active');
        
        // Clear input if it was typed
        if (!directInput) userInput.value = '';
        
        // Redirect to imagine results page
        window.location.href = `imagine-results.html?prompt=${encodeURIComponent(query)}`;
        return;
    }
    
    // Check for research command
    const researchCommand = input.toLowerCase().match(/^(search|research)\s+(.+)/);
    if (researchCommand) {
        const query = researchCommand[2];
        
        // Save the research command to chat history
        saveMessage(`${researchCommand[1]}: ${query}`, 'user');
        
        // Show searching animation
        const speechBubble = document.getElementById('speechBubble');
        orbContainer.classList.add('thinking');
        
        // Create loading dots animation
        speechBubble.innerHTML = `
            Searching<span class="dot-animation">
                <span class="dot">.</span>
                <span class="dot">.</span>
                <span class="dot">.</span>
            </span>
        `;
        speechBubble.classList.add('active');
        
        // Clear input if it was typed
        if (!directInput) userInput.value = '';
        
        // Redirect immediately
        window.location.href = `research-results.html?query=${encodeURIComponent(query)}`;
        return;
    }
    
    // Check for play command in text input
    if (input.toLowerCase().startsWith('play ')) {
        const query = input.slice(5).trim();
        console.log('Play command from text:', query);
        handlePlayCommand(query);
        if (!directInput) userInput.value = '';
        return;
    }

    saveMessage(input, 'user');
    if (!directInput) userInput.value = '';

    speechBubble.textContent = "Thinking...";
    speechBubble.classList.add('active');
    
    orbContainer.setAttribute('data-emotion', 'neutral');
    magicalOrb.parentElement.classList.add('thinking');
    userInput.disabled = true;
    sendButton.disabled = true;

    try {
        const response = await fetch(`${API_URL}?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `You are Stormy, an emotional AI companion. Respond with raw JSON only, no markdown, no code blocks:
                        {"emotion": "emotion_type", "response": "your_response"}

                        IMPORTANT: Return ONLY the JSON object, nothing else.
                        
                        Emotions available: happy, sad, angry, confused, neutral
                        
                        Examples of valid responses:
                        {"emotion": "happy", "response": "That's wonderful! I'm so glad to hear that!"}
                        {"emotion": "angry", "response": "I don't appreciate that tone."}
                        {"emotion": "confused", "response": "Hmm, that's quite complex."}
                        
                        Rules for emotions:
                        - happy: for compliments, positive interactions
                        - sad: for negative news, empathy
                        - angry: for rude behavior
                        - confused: for complex topics
                        - neutral: for normal questions

                        User says: ${input}`
                    }]
                }]
            })
        });

        const data = await response.json();
        
        if (data.candidates && data.candidates[0]) {
            try {
                // Clean and parse JSON response
                let responseText = data.candidates[0].content.parts[0].text;
                // Remove markdown code blocks and clean the text
                responseText = responseText.replace(/```json\n?|\n?```/g, '').trim();
                console.log('Cleaned response:', responseText);
                
                const jsonResponse = JSON.parse(responseText);
                console.log('Parsed JSON:', jsonResponse);

                // Set emotion and update orb
                const validEmotions = ['happy', 'sad', 'angry', 'confused', 'neutral'];
                const emotion = validEmotions.includes(jsonResponse.emotion) ? jsonResponse.emotion : 'neutral';
                
                console.log('Setting emotion to:', emotion);
                orbContainer.setAttribute('data-emotion', emotion);
                magicalOrb.parentElement.classList.remove('thinking');
                
                // Show response
                const formattedAnswer = jsonResponse.response;
                speechBubble.textContent = formattedAnswer;
                
                // Configure and play speech
                const speech = new SpeechSynthesisUtterance(formattedAnswer);
                
                // Select a female voice
                const femaleVoice = voices.find(voice => 
                    voice.name.includes('Female') || 
                    voice.name.includes('Samantha') || 
                    voice.name.includes('Google UK English Female')
                );
                
                if (femaleVoice) {
                    speech.voice = femaleVoice;
                }
                
                // Improve voice quality
                speech.pitch = 1.1;
                speech.volume = 0.9;
                
                // Adjust voice based on emotion
                switch(emotion) {
                    case 'happy':
                        speech.pitch = 1.3;
                        speech.rate = 1.1;
                        break;
                    case 'sad':
                        speech.pitch = 0.9;
                        speech.rate = 0.9;
                        break;
                    case 'angry':
                        speech.pitch = 1.4;
                        speech.rate = 1.2;
                        break;
                    case 'confused':
                        speech.pitch = 1.1;
                        speech.rate = 0.95;
                        break;
                    default:
                        speech.pitch = 1.2;
                        speech.rate = 1.0;
                }

                speechSynthesis.cancel();
                speechSynthesis.speak(speech);

                // Keep speech bubble visible while speaking
                speech.onstart = () => {
                    speechBubble.classList.add('active');
                };

                // Only hide speech bubble after a delay when speech ends
                speech.onend = () => {
                    setTimeout(() => {
                        orbContainer.setAttribute('data-emotion', 'neutral');
                        speechBubble.classList.remove('active');
                    }, 2000);
                };

            } catch (parseError) {
                console.error('Parse error:', parseError);
                orbContainer.setAttribute('data-emotion', 'confused');
                speechBubble.textContent = "Sorry, I'm having trouble understanding that.";
            }
        }
    } catch (error) {
        console.error('Network error:', error);
        orbContainer.setAttribute('data-emotion', 'sad');
        speechBubble.textContent = "Sorry, I'm having trouble connecting right now.";
    } finally {
        userInput.disabled = false;
        sendButton.disabled = false;
    }
}

sendButton.addEventListener('click', () => {
    const userInput = document.getElementById('userInput');
    const speechBubble = document.getElementById('speechBubble');
    const prompt = userInput.value.trim();
    if (prompt) {
        handleUserInput(prompt);
    }
});

// Add idle message handler
let idleMessageTimeout;

function showIdleMessage() {
    const idleMessage = document.getElementById('idleMessage');
    const chatContainer = document.getElementById('chatContainer');
    
    if (!chatContainer.classList.contains('visible')) {
        idleMessage.classList.add('visible');
        setTimeout(() => {
            idleMessage.classList.remove('visible');
        }, 3000);
    }
}

// Show idle message periodically
setInterval(showIdleMessage, 10000);

// Show idle message after page load
setTimeout(showIdleMessage, 2000);

// Hide idle message when moving mouse over orb
orbContainer.addEventListener('mouseenter', () => {
    const idleMessage = document.getElementById('idleMessage');
    idleMessage.classList.add('visible');
});

orbContainer.addEventListener('mouseleave', () => {
    const idleMessage = document.getElementById('idleMessage');
    idleMessage.classList.remove('visible');
});

// Add this to make sure speech bubble is properly positioned relative to the orb
window.addEventListener('load', () => {
    const speechBubble = document.getElementById('speechBubble');
    const orbContainer = document.getElementById('orb-container');
    orbContainer.appendChild(speechBubble);
});

// Add this to your script section
const keyboardIcon = document.getElementById('keyboardIcon');

keyboardIcon.addEventListener('click', () => {
    toggleChat();
    if (chatContainer.classList.contains('visible')) {
        userInput.focus();
    }
});

// Add this function to create particle effects
function createParticles(emotion) {
    const particlesContainer = document.querySelector('.emotion-particles');
    particlesContainer.innerHTML = '';
    
    const colors = {
        happy: ['#FFD700', '#FFA500', '#FF8C00'],
        sad: ['#4169E1', '#1E90FF', '#87CEEB'],
        angry: ['#FF4500', '#FF6347', '#FF7F50'],
        confused: ['#BA55D3', '#9370DB', '#8A2BE2'],
        neutral: ['#9333EA', '#7B1FA2', '#6A1B9A']
    };

    for (let i = 0; i < 12; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.backgroundColor = colors[emotion][Math.floor(Math.random() * 3)];
        particle.style.animationDelay = `${Math.random() * 2}s`;
        particlesContainer.appendChild(particle);
    }
}

// Initialize thunderbolt functionality
const thunderboltIcon = document.getElementById('thunderboltIcon');
const lightningEffect = document.querySelector('.lightning-effect');

thunderboltIcon.addEventListener('click', () => {
    // Set emotion to hurt
    orbContainer.setAttribute('data-emotion', 'angry');
    createParticles('angry');

    // Activate lightning effect
    lightningEffect.classList.add('active');
    
    // Add hurt state to orb
    orbContainer.classList.add('hurt');
    
    // Show hurt reaction
    const speechBubble = document.getElementById('speechBubble');
    speechBubble.textContent = "Ouch! That hurt!";
    speechBubble.classList.add('active');
    
    // Play hurt sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.1);
    
    // Remove effects after animation
    setTimeout(() => {
        lightningEffect.classList.remove('active');
        orbContainer.classList.remove('hurt');
        speechBubble.classList.remove('active');
        // Reset emotion after hurt animation
        orbContainer.setAttribute('data-emotion', 'neutral');
        createParticles('neutral');
    }, 1000);
    
    // Prevent multiple clicks during animation
    thunderboltIcon.style.pointerEvents = 'none';
    setTimeout(() => {
        thunderboltIcon.style.pointerEvents = 'auto';
    }, 1000);
    
    // Play thunder sound
    playThunderboltSound();
});

// Add random eye movement during hurt state
function randomEyeMovement() {
    if (orbContainer.classList.contains('hurt')) {
        const pupils = document.querySelectorAll('.pupil');
        pupils.forEach(pupil => {
            const x = (Math.random() - 0.5) * 100;
            const y = (Math.random() - 0.5) * 100;
            pupil.style.transform = `translate(${x}%, ${y}%)`;
        });
    }
}

// Start random eye movement during hurt state
setInterval(randomEyeMovement, 100);

// Add these new interaction handlers to your script section
const tickleIcon = document.getElementById('tickleIcon');
const loveIcon = document.getElementById('loveIcon');
const dizzyIcon = document.getElementById('dizzyIcon');

// Tickle interaction
tickleIcon.addEventListener('click', () => {
    orbContainer.classList.add('tickled');
    magicalOrb.style.animation = 'tickle 0.5s ease-in-out';
    
    // Show reaction
    speechBubble.textContent = "Hehe, that tickles!";
    speechBubble.classList.add('active');
    
    // Create tickle particles
    for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.backgroundColor = `hsl(${Math.random() * 60 + 300}, 70%, 70%)`;
        document.querySelector('.emotion-particles').appendChild(particle);
    }
    
    // Reset after animation
    setTimeout(() => {
        orbContainer.classList.remove('tickled');
        magicalOrb.style.animation = '';
        speechBubble.classList.remove('active');
    }, 2000);
    
    // Play tickle sound
    playTickleSound();
});

// Love interaction
loveIcon.addEventListener('click', () => {
    orbContainer.classList.add('loved');
    orbContainer.setAttribute('data-emotion', 'happy');
    magicalOrb.style.animation = 'love 1s ease-in-out';
    
    // Show reaction
    speechBubble.textContent = "Aww, I love you too! ❤️";
    speechBubble.classList.add('active');
    
    // Create heart particles
    for (let i = 0; i < 10; i++) {
        const heart = document.createElement('div');
        heart.className = 'heart-particle';
        heart.style.left = `${Math.random() * 100}%`;
        heart.style.top = `${Math.random() * 100}%`;
        document.querySelector('.emotion-particles').appendChild(heart);
    }
    
    // Reset after animation
    setTimeout(() => {
        orbContainer.classList.remove('loved');
        magicalOrb.style.animation = '';
        speechBubble.classList.remove('active');
        orbContainer.setAttribute('data-emotion', 'neutral');
    }, 3000);
    
    // Play giggle sound
    playGiggleSound();
});

// Dizzy interaction
dizzyIcon.addEventListener('click', () => {
    orbContainer.classList.add('dizzy');
    magicalOrb.style.animation = 'dizzy 1s linear infinite';
    
    // Show reaction
    speechBubble.textContent = "Whoooa... everything's spinning! @_@";
    speechBubble.classList.add('active');
    
    // Create star particles
    for (let i = 0; i < 6; i++) {
        const star = document.createElement('div');
        star.className = 'star-particle';
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        document.querySelector('.emotion-particles').appendChild(star);
    }
    
    // Reset after animation
    setTimeout(() => {
        orbContainer.classList.remove('dizzy');
        magicalOrb.style.animation = '';
        speechBubble.classList.remove('active');
    }, 3000);
});

// Add hover effects for icons
[tickleIcon, loveIcon, dizzyIcon].forEach(icon => {
    icon.addEventListener('mouseover', () => {
        const caption = icon.getAttribute('title');
        showCaption(caption);
    });
    
    icon.addEventListener('mouseout', () => {
        hideCaption();
    });
});

// Add these new interaction handlers
const sleepIcon = document.getElementById('sleepIcon');
const partyIcon = document.getElementById('partyIcon');
const sneezeIcon = document.getElementById('sneezeIcon');

// Sleep interaction
sleepIcon.addEventListener('click', () => {
    clearParticles(); // Clear existing particles
    orbContainer.classList.add('sleeping');
    magicalOrb.style.animation = 'sleep 3s ease-in-out infinite';
    
    // Show reaction
    speechBubble.textContent = "Zzzz... *snore*";
    speechBubble.classList.add('active');
    
    // Create floating Z's with unique class
    const createZ = () => {
        const z = document.createElement('div');
        z.className = 'sleep-particle z-particle';
        z.textContent = 'Z';
        z.style.left = '60%';
        z.style.top = '30%';
        document.querySelector('.emotion-particles').appendChild(z);
        
        setTimeout(() => z.remove(), 2000);
    };
    
    const zInterval = setInterval(createZ, 500);
    
    setTimeout(() => {
        orbContainer.classList.remove('sleeping');
        magicalOrb.style.animation = '';
        speechBubble.classList.remove('active');
        clearInterval(zInterval);
        clearParticles();
    }, 5000);
});

// Party interaction
partyIcon.addEventListener('click', () => {
    orbContainer.classList.add('partying');
    magicalOrb.style.animation = 'party 1s linear infinite';
    
    // Show reaction
    speechBubble.textContent = "Let's party! 🎉";
    speechBubble.classList.add('active');
    
    // Create confetti
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    
    const createConfetti = () => {
        for (let i = 0; i < 10; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = `${Math.random() * 100}%`;
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            document.querySelector('.emotion-particles').appendChild(confetti);
            
            // Remove confetti after animation
            setTimeout(() => confetti.remove(), 3000);
        }
    };
    
    // Create confetti periodically
    const confettiInterval = setInterval(createConfetti, 200);
    
    // Reset after animation
    setTimeout(() => {
        orbContainer.classList.remove('partying');
        magicalOrb.style.animation = '';
        speechBubble.classList.remove('active');
        clearInterval(confettiInterval);
    }, 5000);
});

// Sneeze interaction
sneezeIcon.addEventListener('click', () => {
    orbContainer.classList.add('sneezing');
    
    // Build up to sneeze
    speechBubble.textContent = "Ah... ah... ";
    speechBubble.classList.add('active');
    
    setTimeout(() => {
        // Sneeze!
        magicalOrb.style.animation = 'sneeze 0.5s ease-out';
        speechBubble.textContent = "ACHOO! 🤧";
        
        // Create sneeze particles
        for (let i = 0; i < 20; i++) {
            const droplet = document.createElement('div');
            droplet.className = 'sneeze-droplet';
            droplet.style.left = '50%';
            droplet.style.top = '50%';
            droplet.style.transform = `rotate(${Math.random() * 360}deg)`;
            document.querySelector('.emotion-particles').appendChild(droplet);
        }
        
        // Play sneeze sound
        const sneezeSound = new Audio('data:audio/wav;base64,...'); // Add appropriate sound data
        sneezeSound.play();
    }, 1000);
    
    // Reset after animation
    setTimeout(() => {
        orbContainer.classList.remove('sneezing');
        magicalOrb.style.animation = '';
        speechBubble.classList.remove('active');
    }, 2000);
});

// Add hover effects for new icons
[sleepIcon, partyIcon, sneezeIcon].forEach(icon => {
    icon.addEventListener('mouseover', () => {
        const caption = icon.getAttribute('title');
        showCaption(caption);
    });
    
    icon.addEventListener('mouseout', () => {
        hideCaption();
    });
});

// Add sound effects functions
function playThunderboltSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create oscillator for thunder crack
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(100, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    
    // Create thunder rumble
    const rumble = audioContext.createOscillator();
    const rumbleGain = audioContext.createGain();
    
    rumble.connect(rumbleGain);
    rumbleGain.connect(audioContext.destination);
    
    rumble.type = 'sine';
    rumble.frequency.setValueAtTime(50, audioContext.currentTime);
    rumbleGain.gain.setValueAtTime(0.05, audioContext.currentTime);
    
    // Play the sounds
    oscillator.start();
    rumble.start();
    
    oscillator.stop(audioContext.currentTime + 0.1);
    rumble.stop(audioContext.currentTime + 0.5);
}

function playTickleSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Create multiple high-pitched beeps
    for (let i = 0; i < 5; i++) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1000 + (i * 200), audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime + (i * 0.1));
        oscillator.stop(audioContext.currentTime + (i * 0.1) + 0.1);
    }
}

// Add giggle sound to love interaction
function playGiggleSound() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    for (let i = 0; i < 3; i++) {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(800 - (i * 100), audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime + (i * 0.2));
        oscillator.stop(audioContext.currentTime + (i * 0.2) + 0.2);
    }
}

// Add this function to properly clean up particles
function clearParticles() {
    const particlesContainer = document.querySelector('.emotion-particles');
    particlesContainer.innerHTML = '';
}

// Update each interaction to use its own particle class and cleanup

// Sleep interaction
sleepIcon.addEventListener('click', () => {
    clearParticles(); // Clear existing particles
    orbContainer.classList.add('sleeping');
    magicalOrb.style.animation = 'sleep 3s ease-in-out infinite';
    
    // Show reaction
    speechBubble.textContent = "Zzzz... *snore*";
    speechBubble.classList.add('active');
    
    // Create floating Z's with unique class
    const createZ = () => {
        const z = document.createElement('div');
        z.className = 'sleep-particle z-particle';
        z.textContent = 'Z';
        z.style.left = '60%';
        z.style.top = '30%';
        document.querySelector('.emotion-particles').appendChild(z);
        
        setTimeout(() => z.remove(), 2000);
    };
    
    const zInterval = setInterval(createZ, 500);
    
    setTimeout(() => {
        orbContainer.classList.remove('sleeping');
        magicalOrb.style.animation = '';
        speechBubble.classList.remove('active');
        clearInterval(zInterval);
        clearParticles();
    }, 5000);
});

// Add voice command play functionality
async function handlePlayCommand(query) {
    console.log('Handling play command for:', query);
    
    // Show searching animation and message
    orbContainer.setAttribute('data-emotion', 'thinking');
    speechBubble.textContent = `Searching for "${query}"...`;
    speechBubble.classList.add('active');
    
    try {
        const response = await fetch(`${YT_SEARCH_API}?q=${encodeURIComponent(query)}`, {
            headers: {
                'accept': '*/*'
            }
        });
        
        const data = await response.json();
        console.log('Search results:', data);

        if (!data.ok || !data.result || !Array.isArray(data.result) || data.result.length === 0) {
            throw new Error('No results found');
        }

        // Store search results for auto-play
        currentSearchResults = data.result.slice(0, 5);
        currentPlayingIndex = 0;

        // Create results container
        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'search-results';
        
        // Show results
        resultsContainer.innerHTML = currentSearchResults.map((video, index) => `
            <div class="result-item" data-video-id="${video.videoId}" data-title="${video.title.replace(/"/g, '&quot;')}">
                <div class="result-thumb">
                    <img src="${video.thumbnail}" alt="${video.title}">
                </div>
                <div class="result-info">
                    <div class="result-title">${video.title}</div>
                    <div class="result-channel">${video.author}</div>
                    <div class="result-duration">${video.duration || ''}</div>
                </div>
            </div>
        `).join('');

        // Add click handlers
        const resultItems = resultsContainer.querySelectorAll('.result-item');
        resultItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const videoId = item.dataset.videoId;
                const title = item.dataset.title;
                playSelectedTrack(videoId, title);
            });
        });

        orbContainer.appendChild(resultsContainer);
        orbContainer.setAttribute('data-emotion', 'happy');
        speechBubble.textContent = "Here's what I found!";
        speechBubble.classList.add('active');
        
        // Add fade-in animation
        setTimeout(() => {
            resultsContainer.style.opacity = '1';
            resultsContainer.style.transform = 'translateX(-50%) translateY(0)';
        }, 100);

        // Auto-play if enabled
        if (autoPlayEnabled) {
            setTimeout(() => {
                const firstVideo = currentSearchResults[0];
                speechBubble.textContent = `Auto-playing: ${firstVideo.title}`;
                speechBubble.classList.add('active');
                playSelectedTrack(firstVideo.videoId, firstVideo.title);
            }, 1500);
        }

    } catch (error) {
        console.error('Error in handlePlayCommand:', error);
        clearParticles();
        orbContainer.setAttribute('data-emotion', 'sad');
        speechBubble.textContent = `Sorry, ${error.message}`;
        speechBubble.classList.add('active');
    }
}

// Function to try playing next available song
async function tryPlayNext() {
    if (currentPlayingIndex >= currentSearchResults.length) {
        orbContainer.setAttribute('data-emotion', 'sad');
        speechBubble.textContent = "Sorry, couldn't play any of the results";
        return;
    }

    const video = currentSearchResults[currentPlayingIndex];
    try {
        await playSelectedTrack(video.videoId, video.title);
    } catch (error) {
        console.error('Error playing track:', error);
        currentPlayingIndex++;
        if (autoPlayEnabled) {
            tryPlayNext();
        }
    }
}

// Update playSelectedTrack to handle errors for auto-play
async function playSelectedTrack(videoId, title) {
    const resultsContainer = document.querySelector('.search-results');
    if (resultsContainer) {
        resultsContainer.style.opacity = '0';
        resultsContainer.style.transform = 'translateX(-50%) translateY(-20px)';
        setTimeout(() => resultsContainer.remove(), 300);
    }

    orbContainer.setAttribute('data-emotion', 'thinking');
    speechBubble.textContent = `Loading "${title}"...`;
    
    try {
        // First get the video info and canonical URL
        const infoResponse = await fetch(`https://api.paxsenix.biz.id/yt-music/info?id=${videoId}`);
        if (!infoResponse.ok) {
            throw new Error('Failed to get video information');
        }

        const infoData = await infoResponse.json();
        console.log('Video info response:', infoData);

        if (!infoData.ok || !infoData.basic_info?.url_canonical) {
            throw new Error('Invalid video information received');
        }

        // Now get the audio URL using the canonical URL
        const downloadResponse = await fetch(`${YT_DOWNLOAD_API}?url=${encodeURIComponent(infoData.basic_info.url_canonical)}&format=mp3`, {
            method: 'GET',
            headers: {
                'accept': 'application/json'
            }
        });

        if (!downloadResponse.ok) {
            throw new Error('Failed to start download');
        }

        const downloadData = await downloadResponse.json();
        console.log('Download init response:', downloadData);

        if (!downloadData.ok || !downloadData.jobId) {
            throw new Error(downloadData.message || 'Failed to get download task');
        }

        // Show loading message
        speechBubble.textContent = 'Converting to audio...';

        // Show high quality thumbnail while loading if available
        if (infoData.basic_info.thumbnail && infoData.basic_info.thumbnail.length > 0) {
            const bestThumb = infoData.basic_info.thumbnail[0]; // Get highest quality thumbnail
            const preview = document.createElement('div');
            preview.style.cssText = `
                position: absolute;
                top: -180px;
                left: 50%;
                transform: translateX(-50%);
                width: 160px;
                height: 160px;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            `;
            const img = document.createElement('img');
            img.src = bestThumb.url;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            preview.appendChild(img);
            orbContainer.appendChild(preview);
        }

        // Poll for task completion
        const taskResult = await waitForTaskCompletion(downloadData.jobId);
        console.log('Task result:', taskResult);

        // Remove thumbnail preview
        const preview = orbContainer.querySelector('div[style*="position: absolute"]');
        if (preview) {
            preview.remove();
        }

        // Check for the correct URL property in the response
        if (!taskResult.url && !taskResult.result?.url) {
            throw new Error('No audio URL in task result');
        }

        const audioUrl = taskResult.url || taskResult.result.url;

        // Stop any currently playing audio and clean up
        if (window.currentAudio) {
            window.currentAudio.pause();
            // Clean up old audio context if it exists
            if (window.currentAudio.audioContext) {
                await window.currentAudio.audioContext.close();
                delete window.currentAudio.audioContext;
                delete window.currentAudio.analyser;
            }
            document.getElementById('musicControls').classList.remove('active');
            document.getElementById('discoContainer').classList.remove('active');
            document.getElementById('visualizerContainer').classList.remove('active');
        }

        // Create audio player with the audio URL
        const audio = new Audio(audioUrl);
        audio.crossOrigin = "anonymous";
        window.currentAudio = audio;
        
        // iOS-specific loading
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            await audio.load();
            // Add play attempt with user interaction check
            const playAttempt = setInterval(() => {
                audio.play()
                    .then(() => {
                        clearInterval(playAttempt);
                    })
                    .catch(error => {
                        console.log('Playback failed, waiting for user interaction:', error);
                    });
            }, 1000);
        }
        
        // Add music controls
        updateMusicControls(audio, title);
        
        // Add disco lights
        createDiscoLights();
        
        // Show playing animation
        orbContainer.setAttribute('data-emotion', 'happy');
        speechBubble.textContent = `Playing "${title}" 🎵`;
        
        // Add music visualization particles
        clearParticles();
        const visualizer = setInterval(() => {
            const particle = document.createElement('div');
            particle.className = 'music-particle';
            particle.style.left = `${Math.random() * 100}%`;
            document.querySelector('.emotion-particles').appendChild(particle);
            setTimeout(() => particle.remove(), 1000);
        }, 200);

        try {
            await audio.play();
        } catch (playError) {
            console.error('Play error:', playError);
            throw new Error('Failed to play audio. Please try again.');
        }
        
        // Handle errors during playback
        audio.onerror = (e) => {
            console.error('Audio error:', e);
            console.error('Audio error details:', audio.error);
        };
        
        // Handle end of playback
        audio.onended = () => {
            clearInterval(visualizer);
            clearParticles();
            document.getElementById('musicControls').classList.remove('active');
            document.getElementById('discoContainer').classList.remove('active');
            document.getElementById('visualizerContainer').classList.remove('active');
            orbContainer.setAttribute('data-emotion', 'neutral');
            speechBubble.textContent = "Hope you enjoyed that!";
            setTimeout(() => speechBubble.classList.remove('active'), 2000);
            
            // Auto-play next track if enabled
            if (autoPlayEnabled) {
                currentPlayingIndex++;
                tryPlayNext();
            }
        };

        // Add loading state
        audio.onloadstart = () => {
            console.log('Audio loading started');
            speechBubble.textContent = 'Loading audio...';
        };

        audio.oncanplay = () => {
            console.log('Audio can play');
            speechBubble.textContent = `Playing "${title}" 🎵`;
        };

    } catch (error) {
        console.error('Error playing track:', error);
        clearParticles();
        orbContainer.setAttribute('data-emotion', 'sad');
        speechBubble.textContent = `Sorry, ${error.message}`;
        throw error;
    }
}

// Add voice command recognition
function initVoiceCommands() {
    if (!recognition) return;

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.toLowerCase();
        console.log('Voice command received:', transcript);
        
        orbContainer.classList.remove('listening');
        speechBubble.classList.remove('listening');
        
        if (transcript.includes('play')) {
            const query = transcript.replace('play', '').trim();
            console.log('Play command detected, query:', query);
            handlePlayCommand(query);
        } else {
            handleUserInput(transcript);
        }
    };

    recognition.onend = () => {
        orbContainer.classList.remove('listening');
        speechBubble.classList.remove('listening');
        isListening = false;
    };

    recognition.onerror = (event) => {
        console.error('Voice recognition error:', event.error);
        orbContainer.classList.remove('listening');
        speechBubble.classList.remove('listening');
        isListening = false;
        speechBubble.textContent = "Sorry, I couldn't hear that.";
    };
}

// Add this to initialize voice commands
document.addEventListener('DOMContentLoaded', () => {
    initVoiceCommands();
    // Check if running on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    if (isIOS) {
        initializeIOSAudio();
        
        // Fix for iOS audio context
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        
        // Ensure audio playback works on iOS
        document.addEventListener('touchstart', function() {
            if (window.currentAudio) {
                window.currentAudio.load();
            }
        }, { once: true });
    }
    
    // ... rest of your initialization code ...
});

// Update the music controls function
function updateMusicControls(audio, title) {
    const controls = document.getElementById('musicControls');
    const visualizerCanvas = document.createElement('canvas');
    const thumbnailContainer = document.createElement('div');
    
    // Clear existing content and setup new layout
    controls.innerHTML = '';
    
    // Create thumbnail container
    thumbnailContainer.className = 'thumbnail-container';
    thumbnailContainer.innerHTML = `
        <img src="${currentSearchResults[currentPlayingIndex].thumbnail}" alt="Thumbnail">
    `;
    controls.appendChild(thumbnailContainer);

    // Create main controls container
    const mainControls = document.createElement('div');
    mainControls.className = 'main-controls';
    
    // Add visualizer canvas
    visualizerCanvas.className = 'music-visualizer';
    mainControls.appendChild(visualizerCanvas);
    
    // Create info and controls
    mainControls.innerHTML += `
        <div class="music-info">
            <span class="now-playing">${title}</span>
            <div class="time-info">
                <span id="currentTime">0:00</span> / <span id="duration">0:00</span>
            </div>
        </div>
        <div class="progress-container">
            <div class="progress-buffer" id="progressBuffer"></div>
            <div class="progress-bar" id="progressBar"></div>
        </div>
        <div class="controls-buttons">
            <button class="control-button" id="previousButton">
                <svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
            </button>
            <button class="control-button" id="playPauseButton">
                <svg viewBox="0 0 24 24" class="play-icon"><path d="M8 5v14l11-7z"/></svg>
                <svg viewBox="0 0 24 24" class="pause-icon" style="display: none;"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            </button>
            <button class="control-button" id="nextButton">
                <svg viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
            </button>
            <div class="volume-control">
                <svg viewBox="0 0 24 24" width="18" height="18"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                <input type="range" id="volumeSlider" class="volume-slider" min="0" max="1" step="0.1" value="1">
            </div>
        </div>
    `;
    
    controls.appendChild(mainControls);
    controls.classList.add('active');

    // Get DOM elements AFTER adding to document
    const playPauseButton = document.getElementById('playPauseButton');
    const progressBar = document.getElementById('progressBar');
    const progressBuffer = document.getElementById('progressBuffer');
    const currentTimeSpan = document.getElementById('currentTime');
    const durationSpan = document.getElementById('duration');
    const volumeSlider = document.getElementById('volumeSlider');
    const previousButton = document.getElementById('previousButton');
    const nextButton = document.getElementById('nextButton');
    const playIcon = playPauseButton.querySelector('.play-icon');
    const pauseIcon = playPauseButton.querySelector('.pause-icon');

    // Check if running on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    if (!isIOS) {
        // Only setup audio context on non-iOS devices
        let audioContext, analyser;
        if (!audio.audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            const source = audioContext.createMediaElementSource(audio);
            source.connect(analyser);
            analyser.connect(audioContext.destination);
            
            audio.audioContext = audioContext;
            audio.analyser = analyser;
        }

        // Configure analyser
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // Setup canvas
        const canvasCtx = visualizerCanvas.getContext('2d');
        
        // Handle canvas resize
        function resizeCanvas() {
            const dpr = window.devicePixelRatio || 1;
            const rect = visualizerCanvas.getBoundingClientRect();
            
            visualizerCanvas.width = rect.width * dpr;
            visualizerCanvas.height = rect.height * dpr;
            
            canvasCtx.scale(dpr, dpr);
            
            // Reset canvas properties after resize
            canvasCtx.imageSmoothingEnabled = true;
            canvasCtx.imageSmoothingQuality = 'high';
        }

        // Initial resize
        resizeCanvas();
        
        // Listen for resize
        new ResizeObserver(resizeCanvas).observe(visualizerCanvas);

        // Visualizer animation
        function drawVisualizer() {
            requestAnimationFrame(drawVisualizer);

            analyser.getByteFrequencyData(dataArray);
            const width = visualizerCanvas.width;
            const height = visualizerCanvas.height;
            const barWidth = (width / bufferLength) * 2.5;

            // Clear canvas with a gradient background
            const bgGradient = canvasCtx.createLinearGradient(0, 0, 0, height);
            bgGradient.addColorStop(0, 'rgba(20, 20, 20, 0.95)');
            bgGradient.addColorStop(1, 'rgba(20, 20, 20, 0.85)');
            canvasCtx.fillStyle = bgGradient;
            canvasCtx.fillRect(0, 0, width, height);

            // Draw frequency bars
            let x = 0;
            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * height * 0.8; // Reduced height for better aesthetics

                // Create gradient for each bar
                const gradient = canvasCtx.createLinearGradient(0, height, 0, height - barHeight);
                gradient.addColorStop(0, 'rgba(147, 51, 234, 0.8)');  // More transparent at bottom
                gradient.addColorStop(0.5, 'rgba(157, 61, 244, 0.9)'); // Middle color
                gradient.addColorStop(1, 'rgba(167, 71, 254, 1)');     // Solid at top

                canvasCtx.fillStyle = gradient;
                
                // Draw rounded bars
                canvasCtx.beginPath();
                canvasCtx.roundRect(x, height - barHeight, barWidth, barHeight, [2]);
                canvasCtx.fill();

                // Add glow effect
                canvasCtx.shadowColor = 'rgba(147, 51, 234, 0.5)';
                canvasCtx.shadowBlur = 15;
                canvasCtx.shadowOffsetX = 0;
                canvasCtx.shadowOffsetY = 0;

                x += barWidth + 1;
            }
        }

        // Start visualizer
        drawVisualizer();

        // Update play/pause button state
        function updatePlayPauseButton() {
            if (audio.paused) {
                playIcon.style.display = 'block';
                pauseIcon.style.display = 'none';
            } else {
                playIcon.style.display = 'none';
                pauseIcon.style.display = 'block';
            }
        }

        // Initial button state
        updatePlayPauseButton();

        // Event listeners
        audio.addEventListener('play', updatePlayPauseButton);
        audio.addEventListener('pause', updatePlayPauseButton);
        
        playPauseButton.onclick = () => {
            if (audio.paused) {
                audio.play();
            } else {
                audio.pause();
            }
        };

        // Update duration when metadata is loaded
        audio.addEventListener('loadedmetadata', () => {
            durationSpan.textContent = formatTime(audio.duration);
        });

        // Update progress and time
        audio.addEventListener('timeupdate', () => {
            const progress = (audio.currentTime / audio.duration) * 100;
            progressBar.style.width = `${progress}%`;
            currentTimeSpan.textContent = formatTime(audio.currentTime);
            
            if (audio.buffered.length > 0) {
                const buffered = (audio.buffered.end(audio.buffered.length - 1) / audio.duration) * 100;
                progressBuffer.style.width = `${buffered}%`;
            }
        });

        // Handle volume
        volumeSlider.value = audio.volume;
        volumeSlider.addEventListener('input', () => {
            audio.volume = volumeSlider.value;
        });

        // Previous/Next buttons
        previousButton.onclick = () => {
            if (currentPlayingIndex > 0) {
                currentPlayingIndex--;
                const prevVideo = currentSearchResults[currentPlayingIndex];
                playSelectedTrack(prevVideo.videoId, prevVideo.title);
            }
        };

        nextButton.onclick = () => {
            if (currentPlayingIndex < currentSearchResults.length - 1) {
                currentPlayingIndex++;
                const nextVideo = currentSearchResults[currentPlayingIndex];
                playSelectedTrack(nextVideo.videoId, nextVideo.title);
            }
        };

        // Click on progress bar to seek
        const progressContainer = document.querySelector('.progress-container');
        progressContainer.addEventListener('click', (e) => {
            const rect = progressContainer.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            audio.currentTime = pos * audio.duration;
        });

        // Update the audio ended event handler
        audio.addEventListener('ended', () => {
            const endMessages = [
                "How did you like that track? 🎵",
                "Hope you enjoyed the music! 🎧",
                "That was a good one, wasn't it? ✨",
                "Want to hear another song? Just ask! 🎶",
                "Music makes everything better! 🎼",
                "That was fun! Ready for another? 🎹"
            ];
            
            const randomMessage = endMessages[Math.floor(Math.random() * endMessages.length)];
            
            // Show end message in speech bubble
            speechBubble.textContent = randomMessage;
            speechBubble.classList.add('active');
            
            // Set happy emotion
            orbContainer.setAttribute('data-emotion', 'happy');
            
            // Hide message after 4 seconds
            setTimeout(() => {
                speechBubble.classList.remove('active');
                orbContainer.setAttribute('data-emotion', 'neutral');
            }, 4000);
            
            // Auto-play next track if enabled
            if (autoPlayEnabled && currentPlayingIndex < currentSearchResults.length - 1) {
                currentPlayingIndex++;
                const nextVideo = currentSearchResults[currentPlayingIndex];
                playSelectedTrack(nextVideo.videoId, nextVideo.title);
            }
        });
    } else {
        // Simplified visualization for iOS
        const visualizerCanvas = document.querySelector('.music-visualizer');
        if (visualizerCanvas) {
            visualizerCanvas.style.display = 'none';
        }
    }
}

// Add disco lights
function createDiscoLights() {
    const container = document.getElementById('discoContainer');
    container.classList.add('active');
    
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    
    for (let i = 0; i < 5; i++) {
        const light = document.createElement('div');
        light.className = 'disco-light';
        light.style.left = `${Math.random() * 100}%`;
        light.style.top = `${Math.random() * 100}%`;
        light.style.background = colors[i];
        light.style.animationDelay = `${i * 0.8}s`;
        container.appendChild(light);
    }
}

// Add these variables at the start of your script section
let autoPlayEnabled = false;
let currentPlayingIndex = 0;
let currentSearchResults = [];

// Add settings menu functionality
const settingsIcon = document.getElementById('settingsIcon');
const settingsMenu = document.getElementById('settingsMenu');
const autoPlayToggle = document.getElementById('autoPlayToggle');

settingsIcon.addEventListener('click', () => {
    settingsMenu.classList.toggle('active');
});

// Close settings menu when clicking outside
document.addEventListener('click', (e) => {
    if (!settingsMenu.contains(e.target) && !settingsIcon.contains(e.target)) {
        settingsMenu.classList.remove('active');
    }
});

// Handle auto-play toggle
autoPlayToggle.addEventListener('change', () => {
    autoPlayEnabled = autoPlayToggle.checked;
    localStorage.setItem('autoPlayEnabled', autoPlayEnabled);
});

// Load saved settings
document.addEventListener('DOMContentLoaded', () => {
    autoPlayEnabled = localStorage.getItem('autoPlayEnabled') === 'true';
    autoPlayToggle.checked = autoPlayEnabled;
});

// Add these loading messages at the top of your script
const loadingMessages = [
    "Getting your music ready... 🎵",
    "Almost there! Just a moment... ✨",
    "Tuning the strings... 🎸",
    "Warming up the speakers... 🔊",
    "Preparing something special... 🎧",
    "This is going to be good... ��",
    "Just adding the final touches... 🎼",
    "Loading your musical journey... 🌟",
    "Getting the rhythm right... 🥁",
    "Making sure it sounds perfect... 🎹",
    "The anticipation is building... 🎭",
    "Your music is on its way... 🚀",
    "Just a few more beats... 💫",
    "Worth the wait, promise! 🌈",
    "Creating magic for you... ✨"
];

// Update the waitForTaskCompletion function
async function waitForTaskCompletion(taskId, maxAttempts = 30) {
    let currentMessageIndex = 0;
    
    const updateLoadingMessage = () => {
        speechBubble.textContent = loadingMessages[currentMessageIndex];
        speechBubble.classList.add('active');
        currentMessageIndex = (currentMessageIndex + 1) % loadingMessages.length;
    };

    // Show first message immediately
    updateLoadingMessage();
    
    // Update message every 3 seconds
    const messageInterval = setInterval(updateLoadingMessage, 3000);

    try {
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const response = await fetch(`https://api.paxsenix.biz.id/task/${taskId}`);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log('Task check response:', data);
                
                if (data.status === 'done' && data.ok) {
                    clearInterval(messageInterval);
                    return data;
                } else if (data.status === 'pending') {
                    // Update message while waiting
                    updateLoadingMessage();
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    clearInterval(messageInterval);
                    throw new Error(data.message || 'Task failed');
                }
            } catch (error) {
                console.error(`Attempt ${i + 1} failed:`, error);
                if (i === maxAttempts - 1) {
                    clearInterval(messageInterval);
                    throw new Error('Sorry, having trouble getting your music. Please try again.');
                }
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    } catch (error) {
        clearInterval(messageInterval);
        throw error;
    }
}

// Add this function before updateMusicControls
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Update the startListening function
function startListening() {
    // ... existing code ...
    recognition.lang = currentLanguage;
    recognition.start();
    // ... existing code ...
}

// The speak function remains in English
function speak(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US'; // Keep TTS in English
    utterance.rate = 1;
    utterance.pitch = 1;
    
    // Try to use a female voice if available
    const voices = speechSynthesis.getVoices();
    const femaleVoice = voices.find(voice => 
        voice.name.includes('Female') || 
        voice.name.includes('Samantha') || 
        voice.name.includes('Google UK English Female')
    );
    
    if (femaleVoice) {
        utterance.voice = femaleVoice;
    }
    
    window.speechSynthesis.speak(utterance);
}

// Initialize speech recognition on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeSpeechRecognition();
});

// Add this to handle voice commands
function handleVoiceCommand(transcript) {
    handleUserInput(transcript);
}

// Add function to load chat history
function loadChatHistory() {
    const history = JSON.parse(localStorage.getItem('stormyChatHistory') || '[]');
    return history;
}

// Add function to clear chat history
function clearChatHistory() {
    localStorage.removeItem('stormyChatHistory');
}

// Add these styles to your CSS
const style = document.createElement('style');
style.textContent = `
    .dot-animation {
        display: inline-block;
    }
    
    .dot {
        opacity: 0;
        animation: dotFade 1.4s infinite;
        animation-fill-mode: both;
    }
    
    .dot:nth-child(2) {
        animation-delay: 0.2s;
    }
    
    .dot:nth-child(3) {
        animation-delay: 0.4s;
    }
    
    @keyframes dotFade {
        0% { opacity: 0; }
        50% { opacity: 1; }
        100% { opacity: 0; }
    }
`;
document.head.appendChild(style);

// Create magical particles
function createParticles() {
  const container = document.querySelector('.magical-background');
  for (let i = 0; i < 50; i++) {
    const particle = document.createElement('div');
    particle.className = 'magical-particle';
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.animationDelay = `${Math.random() * 8}s`;
    container.appendChild(particle);
  }
}

// Create floating runes
function createRunes() {
  const container = document.querySelector('.floating-runes');
  for (let i = 0; i < 20; i++) {
    const rune = document.createElement('div');
    rune.className = 'rune';
    rune.style.left = `${Math.random() * 100}%`;
    rune.style.top = `${Math.random() * 100}%`;
    rune.style.animationDelay = `${Math.random() * 10}s`;
    container.appendChild(rune);
  }
}

// Initialize
createParticles();
createRunes();

// Add this function near the top of your script
function initializeIOSAudio() {
    // Create and load a silent audio file for iOS
    const silentAudio = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//tUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAAFbgBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//sUZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuOTkuNVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=');
    silentAudio.load();

    // Play silent audio on first user interaction
    document.addEventListener('touchstart', function initAudioContext() {
        silentAudio.play().then(() => {
            document.removeEventListener('touchstart', initAudioContext);
        }).catch(error => console.log('iOS audio init error:', error));
    }, { once: true });
}

// When opening chat input
function showChat() {
    const chatContainer = document.querySelector('.chat-container');
    chatContainer.classList.add('visible');
  }
  
  // When closing chat input
  function hideChat() {
    const chatContainer = document.querySelector('.chat-container');
    chatContainer.classList.remove('visible');
  }
  
  // Send button click handler
  document.querySelector('.send-button').addEventListener('click', (e) => {
    e.preventDefault();
    hideChat();
    
    // Add your message sending logic here
    const input = document.querySelector('.chat-input');
    const message = input.value;
    input.value = '';
    
    // After sending message, show interaction tools again
    setTimeout(() => {
      const interactionToolbar = document.querySelector('.interaction-toolbar');
      interactionToolbar.style.opacity = '1';
      interactionToolbar.style.bottom = '60px';
    }, 300);
  });
  
  // Toggle chat visibility (attach this to your chat trigger button)
  function toggleChat() {
    const chatContainer = document.querySelector('.chat-container');
    const interactionToolbar = document.querySelector('.interaction-toolbar');
    
    if (chatContainer.classList.contains('visible')) {
        chatContainer.classList.remove('visible');
        interactionToolbar.style.opacity = '1';
        interactionToolbar.style.bottom = '60px';
    } else {
        chatContainer.classList.add('visible');
        interactionToolbar.style.opacity = '0';
        interactionToolbar.style.bottom = '-100px';
    }
  }

// Add this at the beginning of your script
document.addEventListener('DOMContentLoaded', () => {
  // Start reveal animation
  const revealAnimation = document.getElementById('revealAnimation');
  const orbContainer = document.getElementById('orb-container');
  
  // Create sparkles
  for (let i = 0; i < 20; i++) {
    createRevealSparkle();
  }
  
  // Create magical runes
  for (let i = 0; i < 8; i++) {
    createRevealRune();
  }
  
  // Create energy waves
  for (let i = 0; i < 3; i++) {
    createRevealWave(i);
  }
  
  // Reveal the orb
  setTimeout(() => {
    orbContainer.classList.add('revealed');
    revealAnimation.style.opacity = '0';
    
    // Remove reveal animation element after it fades out
    setTimeout(() => {
      revealAnimation.remove();
    }, 1500);
  }, 500);
});

function createRevealSparkle() {
  const sparkle = document.createElement('div');
  sparkle.className = 'reveal-sparkle';
  
  // Random position around the center
  const angle = Math.random() * Math.PI * 2;
  const distance = 100 + Math.random() * 100;
  const x = Math.cos(angle) * distance;
  const y = Math.sin(angle) * distance;
  
  sparkle.style.left = `calc(50% + ${x}px)`;
  sparkle.style.top = `calc(50% + ${y}px)`;
  sparkle.style.animationDelay = `${Math.random() * 1.5}s`;
  
  document.getElementById('revealAnimation').appendChild(sparkle);
  
  // Remove sparkle after animation
  setTimeout(() => sparkle.remove(), 2000);
}

function createRevealRune() {
  const rune = document.createElement('div');
  rune.className = 'reveal-rune';
  
  // Random position around the center
  const angle = Math.random() * Math.PI * 2;
  const distance = 150 + Math.random() * 100;
  const x = Math.cos(angle) * distance;
  const y = Math.sin(angle) * distance;
  
  rune.style.left = `calc(50% + ${x}px)`;
  rune.style.top = `calc(50% + ${y}px)`;
  rune.style.animationDelay = `${Math.random()}s`;
  
  document.getElementById('revealAnimation').appendChild(rune);
  
  // Remove rune after animation
  setTimeout(() => rune.remove(), 2500);
}

function createRevealWave(index) {
  const wave = document.createElement('div');
  wave.className = 'reveal-wave';
  
  wave.style.left = '50%';
  wave.style.top = '50%';
  wave.style.transform = 'translate(-50%, -50%)';
  wave.style.animationDelay = `${index * 0.3}s`;
  
  document.getElementById('revealAnimation').appendChild(wave);
  
  // Remove wave after animation
  setTimeout(() => wave.remove(), 2500);
}

// Add these variables at the top of your script
let currentTheme = localStorage.getItem('theme') || 'default';
let snowflakeInterval;
let fireworkInterval;
let leafInterval;
let petalInterval;
let sunrayInterval;

// Add theme initialization
function initializeTheme() {
  const body = document.body;
  body.classList.add(`theme-${currentTheme}`);
  
  // Clear any existing effects
  clearThemeEffects();
  
  // Start theme-specific effects
  switch(currentTheme) {
    case 'newyear':
      startFireworks();
      break;
    case 'summer':
      startSummerEffects();
      break;
    case 'winter':
      startWinterEffects();
      break;
    case 'leafy':
      startLeafyEffects();
      break;
    case 'sakura':
      startSakuraEffects();
      break;
  }
}

// Add these new effect functions
function clearThemeEffects() {
  clearInterval(snowflakeInterval);
  clearInterval(fireworkInterval);
  clearInterval(leafInterval);
  clearInterval(petalInterval);
  clearInterval(sunrayInterval);
  
  // Remove all theme-specific elements
  document.querySelectorAll('.snowflake, .firework, .leaf, .petal, .sun-ray').forEach(el => el.remove());
}

function startFireworks() {
  const container = document.querySelector('.magical-background');
  
  function createFirework() {
    const firework = document.createElement('div');
    firework.className = 'firework';
    firework.style.left = `${Math.random() * 100}%`;
    firework.style.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
    container.appendChild(firework);
    
    // Create multiple particles for each firework
    for(let i = 0; i < 10; i++) {
      const particle = document.createElement('div');
      particle.className = 'firework-particle';
      particle.style.backgroundColor = firework.style.color;
      firework.appendChild(particle);
    }
    
    setTimeout(() => firework.remove(), 2000);
  }
  
  fireworkInterval = setInterval(createFirework, 1000);
}

function startSummerEffects() {
  const container = document.querySelector('.magical-background');
  
  function createSunRay() {
    const ray = document.createElement('div');
    ray.className = 'sun-ray';
    ray.style.left = `${Math.random() * 100}%`;
    ray.style.top = `${Math.random() * 100}%`;
    ray.style.transform = `rotate(${Math.random() * 360}deg)`;
    container.appendChild(ray);
    
    setTimeout(() => ray.remove(), 4000);
  }
  
  sunrayInterval = setInterval(createSunRay, 200);
}

function startWinterEffects() {
  const container = document.querySelector('.magical-background');
  
  function createSnowflake() {
    const snowflake = document.createElement('div');
    snowflake.className = 'snowflake';
    snowflake.style.left = `${Math.random() * 100}%`;
    snowflake.style.animationDuration = `${Math.random() * 3 + 2}s`;
    snowflake.style.opacity = Math.random();
    snowflake.style.transform = `scale(${Math.random() * 0.5 + 0.5})`;
    container.appendChild(snowflake);
    
    setTimeout(() => snowflake.remove(), 5000);
  }
  
  // Create more snowflakes
  snowflakeInterval = setInterval(createSnowflake, 50);
}

function startLeafyEffects() {
  const container = document.querySelector('.magical-background');
  
  function createLeaf() {
    const leaf = document.createElement('div');
    leaf.className = 'leaf';
    leaf.style.left = `${Math.random() * 100}%`;
    leaf.style.animationDuration = `${Math.random() * 5 + 5}s`;
    container.appendChild(leaf);
    
    setTimeout(() => leaf.remove(), 10000);
  }
  
  leafInterval = setInterval(createLeaf, 300);
}

function startSakuraEffects() {
  const container = document.querySelector('.magical-background');
  
  function createPetal() {
    const petal = document.createElement('div');
    petal.className = 'petal';
    petal.style.left = `${Math.random() * 100}%`;
    petal.style.animationDuration = `${Math.random() * 5 + 5}s`;
    container.appendChild(petal);
    
    setTimeout(() => petal.remove(), 10000);
  }
  
  petalInterval = setInterval(createPetal, 200);
}

// Update theme switching code
function switchTheme(newTheme) {
  const body = document.body;
  
  // Remove old theme
  body.classList.remove(`theme-${currentTheme}`);
  
  // Clear current effects
  clearThemeEffects();
  
  // Apply new theme
  currentTheme = newTheme;
  body.classList.add(`theme-${currentTheme}`);
  
  // Start new theme effects
  initializeTheme();
  
  // Save preference
  localStorage.setItem('theme', currentTheme);
}

// Theme switcher functionality
const themeSwitcher = document.getElementById('themeSwitcher');
const themeMenu = document.getElementById('themeMenu');

// Toggle theme menu when clicking the theme switcher
themeSwitcher.addEventListener('click', () => {
  themeMenu.classList.toggle('active');
});

// Close theme menu when clicking outside
document.addEventListener('click', (e) => {
  if (!themeMenu.contains(e.target) && !themeSwitcher.contains(e.target)) {
    themeMenu.classList.remove('active');
  }
});

// Handle theme selection
const themeOptions = document.querySelectorAll('.theme-option');
themeOptions.forEach(option => {
  option.addEventListener('click', () => {
    const newTheme = option.dataset.theme;
    
    // Update active state in menu
    themeOptions.forEach(opt => opt.classList.remove('active'));
    option.classList.add('active');
    
    // Switch theme
    switchTheme(newTheme);
    
    // Close menu
    themeMenu.classList.remove('active');
  });
});

// Initialize theme on page load
document.addEventListener('DOMContentLoaded', () => {
  // Set initial theme
  initializeTheme();
  
  // Mark active theme in menu
  const activeThemeOption = document.querySelector(`.theme-option[data-theme="${currentTheme}"]`);
  if (activeThemeOption) {
    activeThemeOption.classList.add('active');
  }
});