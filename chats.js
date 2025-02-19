// DOM Elements
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
const loadingOverlay = document.getElementById('loadingOverlay');

// Conversation Management
const STORAGE_KEY = 'chat_conversations';
let conversations = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let currentConversationId = null;

// Generate a unique conversation ID
function generateUniqueId() {
    return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// UI Elements
const sidebar = document.getElementById('sidebar');
const sidebarBackdrop = document.getElementById('sidebarBackdrop');
const conversationsList = document.getElementById('conversationsList');
const backButton = document.getElementById('backButton');
const toggleSidebarButton = document.getElementById('toggleSidebar');
const settingsModal = document.getElementById('settingsModal');
const welcomeScreen = document.getElementById('welcomeScreen');
const conversationTitle = document.querySelector('.conversation-title');

// API Endpoints
const GPT4O_API_URL = 'https://api.paxsenix.us.kg/ai/gpt4o';
const GPT4O_MINI_API_URL = 'https://api.paxsenix.us.kg/ai/gpt4omini';
const GEMINI_REALTIME_API_URL = 'https://api.paxsenix.us.kg/ai/gemini-realtime';
const GEMINI_FLASH_PAXSENIX_API_URL = 'https://api.paxsenix.us.kg/ai/gemini-flash';
const GEMINI_FLASH_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent';
const GEMINI_FLASH_API_KEY = 'AIzaSyBlvhpuRx-ispBO9mCxnMNu78FQ4rLnmrI';
const CLAUDE_SONNET_API_URL = 'https://api.paxsenix.us.kg/ai/claudeSonnet';
const MIXTRAL_API_URL = 'https://api.paxsenix.us.kg/ai/mixtral';
const LLAMA3_API_URL = 'https://api.paxsenix.us.kg/ai/llama3';
const GEMMA_API_URL = 'https://api.paxsenix.us.kg/ai/gemma';
const LLAMA3_70B_API_URL = 'https://api.paxsenix.us.kg/ai/llama3-1-70B';
const PAXSENIX_TTS_API_URL = 'https://api.paxsenix.biz.id/tools/tts';

// Model API endpoints
const API_ENDPOINTS = {
    gemini_flash: 'https://api.paxsenix.us.kg/ai/gemini-flash',
    gemini_realtime: 'https://api.paxsenix.us.kg/ai/gemini-realtime',
    claude: 'https://api.paxsenix.us.kg/ai/claude',
    openchat: 'https://api.paxsenix.us.kg/ai/openchat',
    o3_mini: 'https://api.paxsenix.us.kg/ai/o3-mini',
    gpt4o: 'https://api.paxsenix.us.kg/ai/gpt4o',
    gpt4o_mini: 'https://api.paxsenix.us.kg/ai/gpt4o-mini',
    gpt35turbo: 'https://api.paxsenix.us.kg/ai/gpt35-turbo',
    qwen_72b: 'https://api.paxsenix.us.kg/ai/qwen-72b',
    qwen_14b: 'https://api.paxsenix.us.kg/ai/qwen-14b',
    qwen_7b: 'https://api.paxsenix.us.kg/ai/qwen-7b',
    gemma2: 'https://api.paxsenix.us.kg/ai/gemma2'
};

// Model configurations
const MODEL_CONFIGS = {
    gemini_flash: {
        max_tokens: 2048,
        temperature: 0.7,
        top_p: 0.9
    },
    gemini_realtime: {
        max_tokens: 1024,
        temperature: 0.8,
        top_p: 0.9,
        stream: true
    },
    claude: {
        max_tokens: 2048,
        temperature: 0.7,
        top_p: 0.9
    },
    openchat: {
        max_tokens: 2048,
        temperature: 0.7,
        top_p: 0.9
    },
    o3_mini: {
        max_tokens: 1024,
        temperature: 0.8,
        top_p: 0.9
    },
    gpt4o: {
        max_tokens: 2048,
        temperature: 0.7,
        top_p: 0.9
    },
    gpt4o_mini: {
        max_tokens: 1024,
        temperature: 0.8,
        top_p: 0.9
    },
    gpt35turbo: {
        max_tokens: 1024,
        temperature: 0.8,
        top_p: 0.9
    },
    qwen_72b: {
        max_tokens: 2048,
        temperature: 0.7,
        top_p: 0.9
    },
    qwen_14b: {
        max_tokens: 2048,
        temperature: 0.7,
        top_p: 0.9
    },
    qwen_7b: {
        max_tokens: 1024,
        temperature: 0.8,
        top_p: 0.9
    },
    gemma2: {
        max_tokens: 2048,
        temperature: 0.7,
        top_p: 0.9
    }
};

// Function to get model configuration
function getModelConfig(model) {
    return MODEL_CONFIGS[model] || {};
}

// Function to construct API request body
function constructRequestBody(message, model) {
    const config = getModelConfig(model);
    const baseRequest = {
        messages: [{
            role: 'user',
            content: message
        }],
        ...config
    };

    // Add model-specific parameters
    switch(model) {
        case 'gemma2':
            return {
                ...baseRequest,
                model: 'gemma-2b-it',
                stream: false
            };
        case 'qwen_72b':
            return {
                ...baseRequest,
                model: 'qwen-72b',
                response_format: { type: 'text' }
            };
        case 'qwen_14b':
            return {
                ...baseRequest,
                model: 'qwen-14b',
                response_format: { type: 'text' }
            };
        case 'qwen_7b':
            return {
                ...baseRequest,
                model: 'qwen-7b',
                response_format: { type: 'text' }
            };
        case 'gpt4o':
            return {
                ...baseRequest,
                model: 'gpt-4o',
                response_format: { type: 'text' }
            };
        case 'gpt4o_mini':
            return {
                ...baseRequest,
                model: 'gpt-4o-mini',
                response_format: { type: 'text' }
            };
        case 'gpt35turbo':
            return {
                ...baseRequest,
                model: 'gpt-3.5-turbo',
                response_format: { type: 'text' }
            };
        case 'claude':
            return {
                ...baseRequest,
                model: 'claude-3-opus-20240229',
                response_format: { type: 'text' }
            };
        case 'openchat':
            return {
                ...baseRequest,
                model: 'openchat-7b',
                response_format: { type: 'text' }
            };
        case 'o3_mini':
            return {
                ...baseRequest,
                model: 'o3-mini',
                response_format: { type: 'text' }
            };
        default:
            return baseRequest;
    }
}

// Function to send message to API
async function sendMessageToAPI(message, model) {
    const endpoint = API_ENDPOINTS[model];
    if (!endpoint) {
        throw new Error('Invalid model selected');
    }

    const requestBody = constructRequestBody(message, model);
    
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.statusText}`);
        }

        // Handle streaming responses
        if (MODEL_CONFIGS[model]?.stream) {
            return handleStreamingResponse(response);
        }

        const data = await response.json();
        return extractResponseContent(data, model);
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
}

// Function to extract response content based on model
function extractResponseContent(data, model) {
    if (Array.isArray(data.message)) {
        return data.message.join('');
    }
    if (typeof data.message === 'string') {
        return data.message;
    }
    if (data.response) {
        return data.response;
    }
    if (data.text) {
        return data.text;
    }
    if (data.content) {
        return data.content;
    }
    
    // If no recognized format is found, return the raw data
    return JSON.stringify(data);
}

// Function to handle streaming responses
async function handleStreamingResponse(response) {
    const reader = response.body.getReader();
    let content = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Convert the chunk to text and append it
            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonStr = line.slice(6);
                    try {
                        const data = JSON.parse(jsonStr);
                        content += extractResponseContent(data);
                        // Trigger UI update for streaming content
                        updateStreamingContent(content);
                    } catch (e) {
                        console.warn('Failed to parse streaming data:', e);
                    }
                }
            }
        }
    } finally {
        reader.releaseLock();
    }

    return content;
}

// Function to update UI with streaming content
function updateStreamingContent(content) {
    const messageContainer = document.querySelector('.message-content.thinking');
    if (messageContainer) {
        messageContainer.textContent = content;
    }
}

// Voice categories and models
const VOICE_CATEGORIES = {
    'English (US)': [
        'Salli', 'Matthew', 'Kimberly', 'Kendra', 'Justin', 'Joey', 'Joanna', 'Ivy',
        'en-US-Wavenet-A', 'en-US-Wavenet-B', 'en-US-Wavenet-C', 'en-US-Wavenet-D',
        'en-US-Wavenet-E', 'en-US-Wavenet-F', 'en-US-Standard-B', 'en-US-Standard-C',
        'en-US-Standard-D', 'en-US-Standard-E'
    ],
    'English (UK)': [
        'Amy', 'Emma', 'Brian', 'Geraint',
        'en-GB-Standard-A', 'en-GB-Standard-B', 'en-GB-Standard-C', 'en-GB-Standard-D',
        'en-GB-Wavenet-A', 'en-GB-Wavenet-B', 'en-GB-Wavenet-C', 'en-GB-Wavenet-D'
    ],
    'English (Others)': [
        'Russell', 'Nicole', 'en-AU-Standard-A', 'en-AU-Standard-B', 'en-AU-Wavenet-A',
        'en-AU-Wavenet-B', 'en-AU-Wavenet-C', 'en-AU-Wavenet-D', 'en-AU-Standard-C',
        'en-AU-Standard-D', 'en-IN-Wavenet-A', 'en-IN-Wavenet-B', 'en-IN-Wavenet-C',
        'Raveena', 'Aditi'
    ],
    'European Languages': [
        'Marlene', 'Vicki', 'Hans', 'Filiz', 'Astrid', 'Tatyana', 'Maxim', 'Carmen',
        'Ines', 'Cristiano', 'Vitoria', 'Ricardo', 'Maja', 'Jan', 'Jacek', 'Ewa',
        'Ruben', 'Lotte', 'Liv', 'Giorgio', 'Carla', 'Bianca', 'Karl', 'Dora',
        'Mathieu', 'Celine', 'Chantal', 'Penelope', 'Miguel', 'Mia', 'Enrique',
        'Conchita', 'fr-FR-Standard-C', 'fr-FR-Standard-D', 'fr-FR-Wavenet-A',
        'fr-FR-Wavenet-B', 'fr-FR-Wavenet-C', 'fr-FR-Wavenet-D', 'de-DE-Standard-A',
        'de-DE-Standard-B', 'de-DE-Wavenet-A', 'de-DE-Wavenet-B', 'de-DE-Wavenet-C',
        'de-DE-Wavenet-D', 'it-IT-Standard-A', 'it-IT-Wavenet-A', 'it-IT-Wavenet-B',
        'it-IT-Wavenet-C', 'it-IT-Wavenet-D'
    ],
    'Asian Languages': [
        'Seoyeon', 'Takumi', 'Mizuki', 'Zhiyu', 'ja-JP-Standard-A', 'ja-JP-Wavenet-A',
        'ja-JP-Wavenet-B', 'ja-JP-Wavenet-C', 'ja-JP-Wavenet-D', 'ko-KR-Standard-A',
        'ko-KR-Wavenet-A', 'cmn-CN-Wavenet-A', 'cmn-CN-Wavenet-B', 'cmn-CN-Wavenet-C',
        'cmn-CN-Wavenet-D', 'Tracy', 'Danny', 'Huihui', 'Yaoyao', 'Kangkang', 'HanHan',
        'Zhiwei'
    ],
    'Other Languages': [
        'Naja', 'Mads', 'Gwyneth', 'ar-XA-Wavenet-A', 'ar-XA-Wavenet-B', 'ar-XA-Wavenet-C',
        'cs-CZ-Wavenet-A', 'pl-PL-Wavenet-A', 'pl-PL-Wavenet-B', 'pl-PL-Wavenet-C',
        'pl-PL-Wavenet-D', 'pt-PT-Wavenet-A', 'pt-PT-Wavenet-B', 'pt-PT-Wavenet-C',
        'pt-PT-Wavenet-D', 'ru-RU-Wavenet-A', 'ru-RU-Wavenet-B', 'ru-RU-Wavenet-C',
        'ru-RU-Wavenet-D', 'tr-TR-Wavenet-A', 'tr-TR-Wavenet-B', 'tr-TR-Wavenet-C',
        'tr-TR-Wavenet-D', 'tr-TR-Wavenet-E', 'uk-UA-Wavenet-A', 'vi-VN-Wavenet-A',
        'vi-VN-Wavenet-B', 'vi-VN-Wavenet-C', 'vi-VN-Wavenet-D'
    ]
};

// Create flat list of all voices
const AVAILABLE_VOICES = Object.values(VOICE_CATEGORIES).flat();

// Default voice
let currentVoice = localStorage.getItem('selected_voice') || 'en-US-Wavenet-A';

// Chat state management
const MAX_HISTORY = 15;
let chatHistory = [];
let messageHistory = new Map();
let currentVersions = new Map();
let isSending = false;

// Rate limiting
const RATE_LIMIT_DELAY = 2000;
let lastRequestTime = 0;

// Initialize model selection
let currentModel = localStorage.getItem('current_model') || 'gemini_flash';

// Add TTS state management at the top with other state variables
let currentUtterance = null;
let isPlaying = false;
let isPaused = false;
let highlightedElement = null;
let wordIndex = 0;
let currentAudioPlayer = null;

// Add image upload state
let currentUploadedImage = null;
let currentAudioFile = null;
let imageInput = document.querySelector('.image-input');
let audioInput = document.querySelector('.audio-input');

// Add image upload button to chat input container
const chatInputContainer = document.querySelector('.chat-input-container');
const imageUploadButton = document.querySelector('.image-upload-btn');
const imagePreview = document.createElement('div');
imagePreview.className = 'image-preview';
imagePreview.style.display = 'none';

chatInputContainer.appendChild(imagePreview);

// Add styles for image upload and audio player
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    .image-upload-btn {
        display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    color: var(--md-sys-color-on-surface);
    cursor: pointer;
    border-radius: 8px;
    transition: background 0.2s ease;
    }

    .image-upload-btn:hover {
        background: var(--md-sys-color-surface-variant);
    }
    .image-upload-btn svg { width: 20px;
    height: 20px;
    stroke: currentColor;
    stroke-width: 2;
}
    .image-preview {
        position: absolute;
        bottom: 100%;
        left: 0;
        right: 0;
        padding: 8px;
        background: var(--md-sys-color-surface);
        border-top: 1px solid var(--md-sys-color-outline);
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .image-preview img {
        height: 60px;
        border-radius: 4px;
    }

    .image-preview .remove-image {
        padding: 4px;
        border: none;
        border-radius: 50%;
        background: var(--md-sys-color-surface-variant);
        color: var(--md-sys-color-on-surface-variant);
        cursor: pointer;
        line-height: 0;
    }

    .toast {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(100%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 0.9rem;
        z-index: 2000;
        opacity: 0;
        transition: all 0.3s ease;
    }
    
    .toast.show {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
    }

    .audio-player .download-audio {
        background: none;
        border: none;
        color: #666;
        cursor: pointer;
        padding: 4px;
        margin-right: 4px;
        border-radius: 4px;
        transition: all 0.2s ease;
    }

    .audio-player .download-audio:hover {
        color: #6750A4;
        background: rgba(103, 80, 164, 0.1);
    }

    .audio-player .download-audio:active {
        transform: scale(0.95);
    }

    .voice-selection-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.95);
        background: var(--md-sys-color-surface);
        border-radius: 16px;
        padding: 24px;
        max-width: 90%;
        width: 800px;
        max-height: 85vh;
        display: none;
        z-index: 2000;
        box-shadow: 0 8px 32px rgba(0,0,0,0.12);
        opacity: 0;
        transition: all 0.2s ease;
    }

    .voice-selection-modal.active {
        display: block;
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
    }

    .voice-selection-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.4);
        backdrop-filter: blur(4px);
        display: none;
        z-index: 1999;
        opacity: 0;
        transition: opacity 0.2s ease;
    }

    .voice-selection-backdrop.active {
        display: block;
        opacity: 1;
    }

    .voice-selection-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
    }

    .voice-selection-title {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--md-sys-color-on-surface);
    }

    .voice-selection-close {
        background: none;
        border: none;
        padding: 8px;
        cursor: pointer;
        color: var(--md-sys-color-on-surface-variant);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
    }

    .voice-selection-close:hover {
        background: var(--md-sys-color-surface-variant);
        transform: scale(1.1);
    }

    .voice-categories {
        display: flex;
        flex-direction: column;
        gap: 24px;
        max-height: calc(85vh - 160px);
        overflow-y: auto;
        padding: 4px;
        scrollbar-width: thin;
        scrollbar-color: var(--md-sys-color-primary) transparent;
    }

    .voice-categories::-webkit-scrollbar {
        width: 6px;
    }

    .voice-categories::-webkit-scrollbar-track {
        background: transparent;
    }

    .voice-categories::-webkit-scrollbar-thumb {
        background-color: var(--md-sys-color-primary);
        border-radius: 3px;
    }

    .voice-category {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .category-title {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--md-sys-color-primary);
        padding: 0 8px;
    }

    .voice-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 12px;
        padding: 4px;
    }

    .voice-option {
        padding: 16px;
        border-radius: 12px;
        background: var(--md-sys-color-surface-variant);
        cursor: pointer;
        transition: all 0.2s ease;
        border: 2px solid transparent;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        position: relative;
        overflow: hidden;
    }

    .voice-option:hover {
        background: var(--md-sys-color-primary-container);
        color: var(--md-sys-color-on-primary-container);
        transform: translateY(-2px);
    }

    .voice-option.selected {
        border-color: var(--md-sys-color-primary);
        background: var(--md-sys-color-primary-container);
        color: var(--md-sys-color-on-primary-container);
    }

    .voice-option .voice-name {
        font-size: 0.95rem;
        font-weight: 500;
        line-height: 1.2;
    }

    .voice-search {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid var(--md-sys-color-outline);
        border-radius: 12px;
        margin-bottom: 20px;
        background: var(--md-sys-color-surface);
        color: var(--md-sys-color-on-surface);
        font-size: 1rem;
        transition: all 0.2s ease;
    }

    .voice-search:focus {
        outline: none;
        border-color: var(--md-sys-color-primary);
        box-shadow: 0 0 0 4px var(--md-sys-color-primary-container);
    }

    .audio-player {
        display: none;
        margin-top: 12px;
        padding: 16px;
        background: var(--md-sys-color-surface-variant);
        border-radius: 12px;
        gap: 16px;
        align-items: center;
        transition: all 0.3s ease;
    }

    .audio-player.active {
        display: flex;
    }

    .audio-player button {
        background: none;
        border: none;
        padding: 8px;
        cursor: pointer;
        color: var(--md-sys-color-on-surface-variant);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
    }

    .audio-player button:hover {
        background: var(--md-sys-color-primary-container);
        color: var(--md-sys-color-on-primary-container);
        transform: scale(1.1);
    }

    .audio-player .play-pause-btn {
        background: var(--md-sys-color-primary);
        color: var(--md-sys-color-on-primary);
        padding: 12px;
    }

    .audio-player .play-pause-btn:hover {
        background: var(--md-sys-color-primary);
        transform: scale(1.1);
    }

    .audio-controls {
        display: flex;
        align-items: center;
        gap: 16px;
        flex: 1;
    }

    .seekbar-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .seekbar {
        width: 100%;
        height: 4px;
        background: var(--md-sys-color-outline);
        border-radius: 2px;
        overflow: hidden;
        cursor: pointer;
    }

    .seekbar-fill {
        height: 100%;
        background: var(--md-sys-color-primary);
        width: 0%;
        transition: width 0.1s linear;
    }

    .time-display {
        display: flex;
        justify-content: space-between;
        font-size: 0.8rem;
        color: var(--md-sys-color-on-surface-variant);
    }

    .audio-loading {
        display: none;
        align-items: center;
        justify-content: center;
        gap: 12px;
        margin-top: 12px;
        padding: 16px;
        background: var(--md-sys-color-surface-variant);
        border-radius: 12px;
        color: var(--md-sys-color-on-surface-variant);
        font-weight: 500;
    }

    .audio-loading.active {
        display: flex;
    }

    .audio-loading::after {
        content: '';
        width: 16px;
        height: 16px;
        border: 2px solid var(--md-sys-color-primary);
        border-right-color: transparent;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }

    .word-highlight {
        animation: highlight-pulse 2s infinite;
    }

    @keyframes highlight-pulse {
        0% { opacity: 0.1; }
        50% { opacity: 0.3; }
        100% { opacity: 0.1; }
    }
`;
document.head.appendChild(styleSheet);

// Handle image upload
imageUploadButton.addEventListener('click', () => {
    if (!imageInput) {
        console.error('Image input element not found');
        return;
    }
    imageInput.click();
});

imageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            return;
        }

        try {
            // Upload to ImageBB
            const uploadResult = await uploadToImageBB(file);
            currentUploadedImage = uploadResult.url;

            // Show preview
            imagePreview.style.display = 'flex';
            imagePreview.innerHTML = `
                <img src="${URL.createObjectURL(file)}" alt="Uploaded image">
                <button class="remove-image" title="Remove image">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            `;

            // Add remove button handler
            imagePreview.querySelector('.remove-image').addEventListener('click', () => {
                imagePreview.style.display = 'none';
                currentUploadedImage = null;
                imageInput.value = '';
            });
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Failed to upload image. Please try again.');
        }
    }
});

// Add ImageBB upload function
async function uploadToImageBB(file) {
    const formData = new FormData();
    formData.append('image', file);

    try {
        const API_KEY = 'cae25a5efbe778e17c1db8b6f4e44cd7';
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${API_KEY}`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error?.message || 'Failed to upload image to server');
        }

        return {
            url: data.data.url,
            deleteUrl: data.data.delete_url
        };
    } catch (error) {
        console.error('Error uploading to ImageBB:', error);
        throw new Error('Failed to upload image to server. Please try again.');
    }
}

// Add these helper functions at the top of the file after the state variables
function stopCurrentSpeech() {
    if (currentUtterance) {
        if (currentUtterance instanceof SpeechSynthesisUtterance) {
            // Browser TTS
            speechSynthesis.cancel();
        } else {
            // Puter TTS
            currentUtterance.pause();
            currentUtterance.currentTime = 0;
        }
        currentUtterance = null;
        isPlaying = false;
        isPaused = false;
    }

    // Reset all audio players
    document.querySelectorAll('.audio-player').forEach(player => {
        player.classList.remove('active');
        const playPauseBtn = player.querySelector('.play-pause-btn');
        if (playPauseBtn) {
            playPauseBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            `;
        }
        const seekbar = player.querySelector('.seekbar-fill');
        if (seekbar) seekbar.style.width = '0%';
        const currentTimeSpan = player.querySelector('.current-time');
        if (currentTimeSpan) currentTimeSpan.textContent = '0:00';
        const totalTimeSpan = player.querySelector('.total-time');
        if (totalTimeSpan) totalTimeSpan.textContent = '0:00';
    });

    // Remove any existing highlights
    if (highlightedElement) {
        highlightedElement.style.backgroundColor = '';
        highlightedElement = null;
    }

    // Reset word index
    wordIndex = 0;

    // Clear current audio player reference
    currentAudioPlayer = null;
}

// Add to the top with other state variables
let highlightOverlay = null;

// Update the highlightFallback function
function highlightFallback(word, container) {
    // Remove existing highlight overlay if it exists
    if (highlightOverlay) {
        highlightOverlay.remove();
        highlightOverlay = null;
    }

    try {
        const text = container.textContent;
        const wordIndex = text.indexOf(word);
        if (wordIndex === -1) return;

        // Create a text node walker to find the text node containing our word
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
        let currentNode;
        let currentIndex = 0;

        while ((currentNode = walker.nextNode())) {
            const nodeText = currentNode.textContent;
            if (currentIndex + nodeText.length > wordIndex) {
                // Found the node containing our word
                const range = document.createRange();
                const wordStart = wordIndex - currentIndex;
                range.setStart(currentNode, wordStart);
                range.setEnd(currentNode, wordStart + word.length);

                // Get position of the word
                const rect = range.getBoundingClientRect();

                // Create highlight overlay
                highlightOverlay = document.createElement('div');
                highlightOverlay.className = 'word-highlight';
                highlightOverlay.style.cssText = `
                    position: fixed;
                    background: var(--md-sys-color-primary);
                    opacity: 0.2;
                    pointer-events: none;
                    border-radius: 3px;
                    z-index: 1000;
                    transition: all 0.15s ease;
                `;

                // Position the overlay
                highlightOverlay.style.left = `${rect.left}px`;
                highlightOverlay.style.top = `${rect.top}px`;
                highlightOverlay.style.width = `${rect.width}px`;
                highlightOverlay.style.height = `${rect.height}px`;

                document.body.appendChild(highlightOverlay);
                break;
            }
            currentIndex += nodeText.length;
        }
    } catch (error) {
        console.warn('Highlight error:', error);
    }
}

// Add scroll handler to update highlight position
window.addEventListener('scroll', () => {
    if (highlightOverlay && currentUtterance) {
        highlightOverlay.remove();
        highlightOverlay = null;
    }
}, { passive: true });

// Initialize the UI
function initializeUI() {
    renderConversationsList();
    setupEventListeners();
    setupImageViewer();
    setupFileUpload();

    // Check for conversation ID in URL
    const urlParams = new URLSearchParams(window.location.search);
    const conversationId = urlParams.get('id');

    if (conversationId) {
        const conversation = conversations.find(c => c.id === conversationId);
        if (conversation) {
            loadConversation(conversation);
        } else {
            startNewConversation();
        }
    } else {
        showWelcomeScreen();
    }

    // Set initial model selection
    const savedModel = localStorage.getItem('current_model') || 'gemini_flash';
    const modelInput = document.querySelector(`input[value="${savedModel}"]`);
    if (modelInput) {
        modelInput.checked = true;
    }

    // Handle initial sidebar state based on screen size
    handleSidebarState();

    // Listen for window resize
    window.addEventListener('resize', handleSidebarState);
}

function handleSidebarState() {
    const isMobile = window.innerWidth <= 768;
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');

    if (isMobile) {
        sidebar.classList.remove('hidden');
        sidebar.classList.remove('active');
        mainContent.classList.add('full-width');
        sidebarBackdrop.classList.remove('active');
    } else {
        sidebar.classList.remove('active');
        sidebarBackdrop.classList.remove('active');
        mainContent.classList.remove('full-width');
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    const mainContent = document.querySelector('.main-content');
    const isMobile = window.innerWidth <= 768;

    if (isMobile) {
        sidebar.classList.toggle('active');
        sidebarBackdrop.classList.toggle('active');
        mainContent.classList.add('full-width');
    } else {
        sidebar.classList.toggle('hidden');
        mainContent.classList.toggle('full-width');
        sidebarBackdrop.classList.remove('active');
    }
}

function setupEventListeners() {
    // Sidebar toggle
    toggleSidebarButton.addEventListener('click', toggleSidebar);
    sidebarBackdrop.addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.remove('active');
        sidebarBackdrop.classList.remove('active');
    });

    // Back button
    backButton.addEventListener('click', () => {
        startNewConversation();
    });

    // Settings
    document.querySelector('.settings-btn').addEventListener('click', () => {
        settingsModal.classList.add('active');
    });

    document.querySelector('.close-settings').addEventListener('click', () => {
        settingsModal.classList.remove('active');
    });

    // Handle clicks outside sidebar on mobile
    document.addEventListener('click', (e) => {
        const sidebar = document.getElementById('sidebar');
        const sidebarBackdrop = document.getElementById('sidebarBackdrop');
        const toggleButton = document.getElementById('toggleSidebar');

        if (window.innerWidth <= 768 &&
            sidebar.classList.contains('active') &&
            !sidebar.contains(e.target) &&
            !toggleButton.contains(e.target)) {
            sidebar.classList.remove('active');
            sidebarBackdrop.classList.remove('active');
        }
    });

    // Delete all conversations
    document.querySelector('.delete-all-btn').addEventListener('click', () => {
        if (confirm('Are you sure you want to delete all conversations?')) {
            conversations = [];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
            renderConversationsList();
            startNewConversation();
        }
    });

    // New chat button
    document.querySelector('.new-chat-btn').addEventListener('click', startNewConversation);

    // Example prompts
    document.querySelectorAll('.prompt-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const prompt = btn.textContent.replace(/['"]/g, '');
            chatInput.value = prompt;
            sendMessage();
        });
    });

    // Model selection in settings
    document.querySelectorAll('.model-option input').forEach(input => {
        input.addEventListener('change', (e) => {
            currentModel = e.target.value;
            localStorage.setItem('current_model', currentModel);
            settingsModal.classList.remove('active');

            // Show feedback toast with proper null checks
            const label = e.target.closest('label');
            const modelName = label?.querySelector('.model-name')?.textContent || currentModel;
            showToast(`Model switched to ${modelName}`);
        });
    });

    // Close sidebar button
    const closeSidebarBtn = document.getElementById('closeSidebar');
    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            const sidebarBackdrop = document.getElementById('sidebarBackdrop');
            sidebar.classList.remove('active');
            sidebarBackdrop.classList.remove('active');
        });
    }
}

function showWelcomeScreen() {
    welcomeScreen.style.display = 'block';
    chatMessages.querySelectorAll('.message').forEach(msg => msg.remove());
}

function hideWelcomeScreen() {
    welcomeScreen.style.display = 'none';
}

function startNewConversation() {
    // Reset state without creating an ID
    currentConversationId = null;
    chatHistory = [];
    messageHistory = new Map();
    currentVersions = new Map();
    conversationTitle.textContent = 'New Chat';

    // Clear chat messages
    chatMessages.innerHTML = '';

    // Show welcome screen
    showWelcomeScreen();

    // Clear URL parameters
    const url = new URL(window.location);
    url.searchParams.delete('id');
    window.history.pushState({}, '', url);

    // Update conversations list
    renderConversationsList();

    // If on mobile, close the sidebar
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        const sidebarBackdrop = document.getElementById('sidebarBackdrop');
        sidebar.classList.remove('active');
        sidebarBackdrop.classList.remove('active');
    }
}

function updateConversationsList() {
    if (chatHistory.length > 0) {
        const firstMessage = chatHistory[0].content;
        const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');

        // Convert Maps to arrays of objects for storage
        const messageHistoryArray = Array.from(messageHistory.entries()).map(([key, value]) => ({
            position: key,
            versions: value,
            metadata: {
                timestamps: value.map((_, index) => {
                    const msg = chatHistory.find(m => !m.isUser && m.metadata?.position === key && m.metadata?.currentVersion === index);
                    return msg?.timestamp || Date.now();
                }),
                models: value.map((_, index) => {
                    const msg = chatHistory.find(m => !m.isUser && m.metadata?.position === key && m.metadata?.currentVersion === index);
                    return msg?.model || currentModel;
                })
            }
        }));

        const currentVersionsArray = Array.from(currentVersions.entries()).map(([key, value]) => ({
            position: key,
            version: value
        }));

        const conversation = {
            id: currentConversationId,
            title,
            messages: chatHistory,
            messageHistory: messageHistoryArray,
            currentVersions: currentVersionsArray,
            metadata: {
                createdAt: Date.now(),
                lastUpdated: Date.now(),
                messageCount: chatHistory.length,
                modelUsage: chatHistory
                    .filter(msg => !msg.isUser)
                    .reduce((acc, msg) => {
                        acc[msg.model] = (acc[msg.model] || 0) + 1;
                        return acc;
                    }, {})
            },
            timestamp: Date.now()
        };

        const existingIndex = conversations.findIndex(c => c.id === currentConversationId);
        if (existingIndex !== -1) {
            conversations[existingIndex] = conversation;
        } else {
            conversations.unshift(conversation);
        }

        // Keep only last 50 conversations
        if (conversations.length > 50) {
            conversations = conversations.slice(0, 50);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
        renderConversationsList();
    }
}

function renderConversationsList() {
    conversationsList.innerHTML = '';
    conversations.sort((a, b) => (b.metadata?.lastUpdated || 0) - (a.metadata?.lastUpdated || 0))
        .forEach(conv => {
            const item = document.createElement('div');
            item.className = `conversation-item${conv.id === currentConversationId ? ' active' : ''}`;

            // Create title element
            const title = document.createElement('div');
            title.className = 'conversation-title';
            title.textContent = conv.title || 'New Chat';

            // Create timestamp element
            const timestamp = document.createElement('div');
            timestamp.className = 'conversation-timestamp';
            timestamp.textContent = formatTimestamp(conv.metadata?.lastUpdated || conv.timestamp);

            item.appendChild(title);
            item.appendChild(timestamp);
            item.addEventListener('click', () => loadConversation(conv));
            conversationsList.appendChild(item);
        });
}

function formatTimestamp(timestamp) {
    if (!timestamp || isNaN(timestamp)) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 48) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
}

function loadConversation(conversation) {
    currentConversationId = conversation.id;
    chatHistory = conversation.messages || [];

    // Update URL with conversation ID
    const url = new URL(window.location);
    url.searchParams.set('id', conversation.id);
    window.history.pushState({}, '', url);

    // Restore message history Map
    messageHistory = new Map();
    if (conversation.messageHistory) {
        conversation.messageHistory.forEach(item => {
            messageHistory.set(parseInt(item.position), item.versions);
        });
    }

    // Restore current versions Map
    currentVersions = new Map();
    if (conversation.currentVersions) {
        conversation.currentVersions.forEach(item => {
            currentVersions.set(parseInt(item.position), item.version);
        });
    }

    // Update conversation title
    const title = conversation.title || 'New Chat';
    conversationTitle.textContent = title;

    // Clear and rebuild chat UI
    chatMessages.innerHTML = '';
    hideWelcomeScreen();

    // Reconstruct the chat UI
    chatHistory.forEach(msg => {
        const messageDiv = appendMessage(msg.content, msg.isUser, {
            model: msg.model,
            metadata: msg.metadata
        }, msg.metadata?.position);

        // If it's a bot message and has versions, update the version navigation
        if (!msg.isUser && msg.metadata?.position) {
            const position = msg.metadata.position;
            const versions = messageHistory.get(position);
            if (versions && versions.length > 1) {
                const currentVersion = currentVersions.get(position) || 0;
                updateVersionNavigation(messageDiv, position, versions.length, currentVersion);
            }
        }
    });

    // Update conversations list
    renderConversationsList();

    // If on mobile, close the sidebar
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        const sidebarBackdrop = document.getElementById('sidebarBackdrop');
        sidebar.classList.remove('active');
        sidebarBackdrop.classList.remove('active');
    }
}

function updateVersionNavigation(messageDiv, position, totalVersions, currentVersion) {
    const versionNav = messageDiv.querySelector('.version-nav');
    if (!versionNav) return;

    const counter = versionNav.querySelector('.version-counter');
    const prevBtn = versionNav.querySelector('[data-action="prev"]');
    const nextBtn = versionNav.querySelector('[data-action="next"]');

    if (counter) counter.textContent = `${currentVersion + 1}/${totalVersions}`;
    if (prevBtn) {
        prevBtn.disabled = currentVersion === 0;
        prevBtn.classList.toggle('active', currentVersion > 0);
    }
    if (nextBtn) {
        nextBtn.disabled = currentVersion === totalVersions - 1;
        nextBtn.classList.toggle('active', currentVersion < totalVersions - 1);
    }
}

// Event Listeners
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

sendButton.addEventListener('click', sendMessage);

// Auto-resize textarea
chatInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
    const maxHeight = 200;
    if (this.scrollHeight > maxHeight) {
        this.style.height = maxHeight + 'px';
        this.style.overflowY = 'auto';
    } else {
        this.style.overflowY = 'hidden';
    }
});

// Message handling functions
function appendMessage(content, isUser, options = {}, position = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'} fade-in`;

    if (!isUser) {
        // Add model label
        const modelLabel = document.createElement('div');
        modelLabel.className = 'model-label';
        modelLabel.textContent = options.model || currentModel;
        modelLabel.textContent = modelLabel.textContent.replace(/_/g, ' ');
        messageDiv.appendChild(modelLabel);

        if (!content) {
            // Add simple thinking text
            const thinkingText = document.createElement('div');
            thinkingText.className = 'thinking';
            thinkingText.textContent = 'AI is thinking';
            messageDiv.appendChild(thinkingText);
            messageDiv.classList.add('thinking');
        } else {
            // Get message position from options or use provided position
            position = position || options.metadata?.position || Date.now();

            // Create content wrapper
            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'message-content-wrapper';

            // Add message content
            const messageContent = document.createElement('div');
            messageContent.className = 'message-content';
            messageContent.innerHTML = marked.parse(content);

            contentWrapper.appendChild(messageContent);
            messageDiv.appendChild(contentWrapper);

            // Add message tools with the correct position
            addMessageTools(messageDiv, content, position);
        }
    } else {
        // User message content
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'message-content-wrapper';

        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        messageContent.innerHTML = marked.parse(content);

        contentWrapper.appendChild(messageContent);
        messageDiv.appendChild(contentWrapper);
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Trigger fade-in animation
    requestAnimationFrame(() => {
        messageDiv.classList.add('visible');
    });

    return messageDiv;
}

function addMessageTools(messageDiv, content, position) {
    const toolsDiv = document.createElement('div');
    toolsDiv.className = 'message-tools';

    const hasError = content.toLowerCase().includes('error') || content.toLowerCase().includes('failed');
    const versions = messageHistory.get(position) || [];
    const currentVersion = currentVersions.get(position) || 0;
    const hasMultipleVersions = versions.length > 1;

    // Create left and right sections
    const leftSection = document.createElement('div');
    leftSection.className = 'message-tools-left';

    const rightSection = document.createElement('div');
    rightSection.className = 'message-tools-right';

    // Add tools to left section
    leftSection.innerHTML = `
            <button class="tool-button" title="Like">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                </svg>
            </button>
            <button class="tool-button" title="Play audio">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 5L6 9H2v6h4l5 4V5z"/>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
                </svg>
            </button>
            <button class="tool-button" title="Copy">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
            </button>
            <button class="tool-button" title="${hasError ? 'Retry' : 'Regenerate'}">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M23 4v6h-6"></path>
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                </svg>
            </button>
            ${hasMultipleVersions ? `
            <div class="version-nav">
                <button class="nav-button ${currentVersion > 0 ? 'active' : ''}" 
                        data-action="prev" 
                        ${currentVersion === 0 ? 'disabled' : ''}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="15 18 9 12 15 6"></polyline>
                    </svg>
                </button>
                <span class="version-counter">${currentVersion + 1}/${versions.length}</span>
                <button class="nav-button ${currentVersion < versions.length - 1 ? 'active' : ''}" 
                        data-action="next" 
                        ${currentVersion === versions.length - 1 ? 'disabled' : ''}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </button>
            </div>
        ` : ''}`;

    // Add more options button to right section
    rightSection.innerHTML = `
        <button class="tool-button more-options-btn" title="More options">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="1"></circle>
                    <circle cx="19" cy="12" r="1"></circle>
                    <circle cx="5" cy="12" r="1"></circle>
                </svg>
            </button>
            <div class="more-options">
                <div class="more-option" data-action="delete">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18"></path>
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                    </svg>
                Delete Message
                </div>
        </div>`;

    toolsDiv.appendChild(leftSection);
    toolsDiv.appendChild(rightSection);
    messageDiv.appendChild(toolsDiv);

    // Add audio player container
    const audioPlayerContainer = document.createElement('div');
    audioPlayerContainer.className = 'audio-player';
    audioPlayerContainer.innerHTML = `
            <div class="audio-controls">
                <button class="play-pause-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                </button>
            </div>
            <div class="seekbar-container">
                <div class="seekbar">
                    <div class="seekbar-fill"></div>
                </div>
                <div class="time-display">
                    <span class="current-time">0:00</span>
                    <span class="total-time">0:00</span>
                </div>
            </div>
            <button class="download-audio" title="Download audio">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
            </button>
            <button class="close-audio">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
            </button>`;
    messageDiv.appendChild(audioPlayerContainer);

    // Add event listeners
    toolsDiv.addEventListener('click', async (e) => {
        const target = e.target.closest('.tool-button, .more-option, .nav-button');
        if (!target) return;

        e.stopPropagation();

        if (target.classList.contains('nav-button')) {
            const action = target.dataset.action;
            if (target.disabled) return;

            const versions = messageHistory.get(position);
            const currentVersion = currentVersions.get(position) || 0;

            if (action === 'prev' && currentVersion > 0) {
                switchVersion(messageDiv, position, currentVersion - 1);
            } else if (action === 'next' && currentVersion < versions.length - 1) {
                switchVersion(messageDiv, position, currentVersion + 1);
            }
            return;
        }

        if (target.classList.contains('tool-button')) {
            const action = target.getAttribute('title')?.toLowerCase();
            switch (action) {
                case 'like':
                    target.classList.toggle('active');
                    break;
                case 'play audio':
                    const messageContent = messageDiv.querySelector('.message-content');
                    const audioPlayer = messageDiv.querySelector('.audio-player');
                    const playPauseBtn = audioPlayer.querySelector('.play-pause-btn');
                    const seekbar = audioPlayer.querySelector('.seekbar-fill');
                    const currentTimeSpan = audioPlayer.querySelector('.current-time');
                    const totalTimeSpan = audioPlayer.querySelector('.total-time');

                    if (!messageContent) return;

                    // If there's already a playing audio
                    if (currentUtterance) {
                        // If this is a different message, stop current and start new
                        if (!messageDiv.contains(currentAudioPlayer)) {
                            stopCurrentSpeech();
                            audioPlayer.classList.add('active');
                            currentAudioPlayer = audioPlayer;
                            const text = messageContent.textContent;
                            audioChunks = splitTextIntoChunks(text);
                            currentChunkIndex = 0;
                            isProcessingChunks = true;
                            playNextChunk(messageDiv);
                        } else {
                            // Toggle play/pause for current message
                            if (isPlaying) {
                                // Pause playback
                                if (currentUtterance instanceof SpeechSynthesisUtterance) {
                                    speechSynthesis.pause();
                                } else {
                                    currentUtterance.pause();
                                }
                                isPaused = true;
                                isPlaying = false;
                                playPauseBtn.innerHTML = `
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                        <path d="M8 5v14l11-7z"/>
                                    </svg>
                                `;
                            } else {
                                // Resume playback
                                if (currentUtterance instanceof SpeechSynthesisUtterance) {
                                    speechSynthesis.resume();
                                } else {
                                    currentUtterance.play();
                                }
                                isPaused = false;
                                isPlaying = true;
                                playPauseBtn.innerHTML = `
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                                        <path d="M6 4h4v16H6zm8 0h4v16h-4z"/>
                                    </svg>
                                `;
                            }
                        }
                        return;
                    }

                    // Start new playback
                    audioPlayer.classList.add('active');
                    currentAudioPlayer = audioPlayer;
                    const text = messageContent.textContent;
                    audioChunks = splitTextIntoChunks(text);
                    currentChunkIndex = 0;
                    isProcessingChunks = true;
                    playNextChunk(messageDiv);
                    break;
                case 'copy':
                    const textToCopy = messageDiv.querySelector('.message-content').textContent;
                    await navigator.clipboard.writeText(textToCopy);
                    target.classList.add('active');
                    setTimeout(() => target.classList.remove('active'), 1000);
                    break;
                case 'retry':
                case 'regenerate':
                    regenerateResponse(content, position);
                    break;
                case 'more options':
                    const moreOptions = target.nextElementSibling;
                    if (moreOptions) {
                        moreOptions.classList.toggle('active');
                    }
                    break;
            }
        } else if (target.classList.contains('more-option')) {
            const action = target.dataset.action;
            if (action === 'delete') {
                const deletePopup = document.createElement('div');
                deletePopup.className = 'delete-popup';
                deletePopup.innerHTML = `
                    <p>Are you sure you want to delete this message?</p>
                    <button class="confirm-delete">Yes</button>
                    <button class="cancel-delete">No</button>
                `;

                const moreOptions = target.closest('.more-options');
                moreOptions.appendChild(deletePopup);
                deletePopup.classList.add('active');

                // Handle delete
                const confirmDelete = deletePopup.querySelector('.confirm-delete');
                const cancelDelete = deletePopup.querySelector('.cancel-delete');

                confirmDelete.addEventListener('click', () => {
                    deleteMessage(messageDiv, position);
                    deletePopup.remove();
                    moreOptions.classList.remove('active');
                });

                cancelDelete.addEventListener('click', () => {
                    deletePopup.remove();
                });
            }
        }
    });

    // Close audio player
    audioPlayerContainer.querySelector('.close-audio').addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event from bubbling to the play button
        stopCurrentSpeech();
        audioPlayerContainer.classList.remove('active');
    });

    return toolsDiv;
}

function switchVersion(messageDiv, position, newVersion) {
    const versions = messageHistory.get(position);
    if (!versions || newVersion < 0 || newVersion >= versions.length) return;

    // Find the message in chat history to get the correct model
    const historyMessage = chatHistory.find(msg =>
        !msg.isUser &&
        msg.metadata?.position === position &&
        msg.metadata?.currentVersion === newVersion
    );

    // Update content
    const messageContent = messageDiv.querySelector('.message-content');
    if (messageContent) {
        messageContent.innerHTML = marked.parse(versions[newVersion]);
    }

    // Update model label if the message was found
    if (historyMessage) {
        const modelLabel = messageDiv.querySelector('.model-label');
        if (modelLabel) {
            modelLabel.textContent = (historyMessage.model || currentModel).replace(/_/g, ' ');
        }
    }

    // Update version counter and navigation buttons
    const versionNav = messageDiv.querySelector('.version-nav');
    if (versionNav) {
        const versionCounter = versionNav.querySelector('.version-counter');
        const prevBtn = versionNav.querySelector('[data-action="prev"]');
        const nextBtn = versionNav.querySelector('[data-action="next"]');

        if (versionCounter) {
            versionCounter.textContent = `${newVersion + 1}/${versions.length}`;
        }

        if (prevBtn) {
            const canGoPrev = newVersion > 0;
            prevBtn.classList.toggle('active', canGoPrev);
            prevBtn.disabled = !canGoPrev;
        }

        if (nextBtn) {
            const canGoNext = newVersion < versions.length - 1;
            nextBtn.classList.toggle('active', canGoNext);
            nextBtn.disabled = !canGoNext;
        }
    }

    // Update current version in the map
    currentVersions.set(position, newVersion);
}

// Update the sendMessage function to handle audio files
async function sendMessage() {
    const message = chatInput.value.trim();
    if ((!message && !currentUploadedImage && !currentAudioFile) || isSending) return;

    hideWelcomeScreen();

    // Create new conversation if needed
    if (!currentConversationId) {
        currentConversationId = generateUniqueId();
        const title = message.slice(0, 50) + (message.length > 50 ? '...' : '');
        conversationTitle.textContent = title;

        const conversation = {
            id: currentConversationId,
            title: title,
            messages: [],
            messageHistory: [],
            currentVersions: [],
            timestamp: Date.now(),
            lastUpdated: Date.now()
        };
        conversations.unshift(conversation);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));

        const url = new URL(window.location);
        url.searchParams.set('id', currentConversationId);
        window.history.pushState({}, '', url);

        renderConversationsList();
    }

    isSending = true;
    chatInput.value = '';
    chatInput.style.height = 'auto';

    // Add user message with image and/or audio if present
    let userMessageContent = message;
    if (currentUploadedImage) {
        userMessageContent += `\n\n![Uploaded image](${currentUploadedImage})`;
    }
    if (currentAudioFile) {
        userMessageContent += `\n\n[Audio file: ${currentAudioFile.name}]`;
    }

    appendMessage(userMessageContent, true);
    const thinkingMessage = appendMessage('', false);

    try {
        let apiUrl, options;
        const messagePosition = Date.now();

        if (currentModel === 'gemini_flash') {
            apiUrl = `${GEMINI_FLASH_API_URL}?key=${GEMINI_FLASH_API_KEY}`;

            const conversationText = chatHistory.length > 0 ?
                `Previous conversation:\n${chatHistory
                    .map(msg => `${msg.isUser ? 'User' : 'Assistant'}: ${msg.content}`)
                    .join('\n')}\n\n` : '';

            const requestBody = {
                contents: [{
                    parts: []
                }]
            };

            // Add text part if message exists
            if (message) {
                requestBody.contents[0].parts.push({
                    text: `You are a helpful AI assistant. Please help with the following:\n\n${conversationText}User message:\n${message}`
                });
            }

            // Add image part if image exists
            if (currentUploadedImage) {
                try {
                    const response = await fetch(currentUploadedImage);
                    const blob = await response.blob();
                    const base64data = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result.split(',')[1]);
                        reader.readAsDataURL(blob);
                    });

                    requestBody.contents[0].parts.push({
                        inlineData: {
                            mimeType: "image/jpeg",
                            data: base64data
                        }
                    });
                } catch (error) {
                    console.error('Error processing image:', error);
                    throw new Error('Failed to process image for API request');
                }
            }

            // Add audio part if audio exists
            if (currentAudioFile) {
                try {
                    const base64data = await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result.split(',')[1]);
                        reader.readAsDataURL(currentAudioFile);
                    });

                    requestBody.contents[0].parts.push({
                        inlineData: {
                            mimeType: currentAudioFile.type,
                            data: base64data
                        }
                    });
                } catch (error) {
                    console.error('Error processing audio:', error);
                    throw new Error('Failed to process audio for API request');
                }
            }

            options = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            };
        } else {
            // Handle other models including gemini_flash_paxsenix
            const now = Date.now();
            const timeSinceLastRequest = now - lastRequestTime;

            if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
                throw new Error(`Please wait ${Math.ceil((RATE_LIMIT_DELAY - timeSinceLastRequest) / 1000)} seconds before sending another message.`);
            }

            lastRequestTime = now;
            apiUrl = getApiUrlForModel(currentModel, message, chatHistory);
            options = {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            };
        }

        const response = await fetch(apiUrl, options);
        if (!response.ok) {
            throw new Error(response.status === 429 ?
                'Rate limit exceeded. Please wait a moment before sending another message.' :
                `API request failed with status ${response.status}`);
        }

        const data = await response.json();
        const botResponse = getBotResponse(data);

        thinkingMessage.remove();
        appendMessage(botResponse, false);

        // Add messages to chat history with metadata
        const messageData = {
            content: userMessageContent,
            isUser: true,
            timestamp: Date.now(),
            type: 'user_message',
            metadata: {
                conversationId: currentConversationId,
                position: messagePosition,
                hasImage: !!currentUploadedImage,
                imageUrl: currentUploadedImage,
                hasAudio: !!currentAudioFile,
                audioFileName: currentAudioFile?.name
            }
        };

        const responseData = {
            content: botResponse,
            isUser: false,
            timestamp: Date.now(),
            type: 'bot_message',
            model: currentModel,
            metadata: {
                conversationId: currentConversationId,
                position: messagePosition,
                modelVersion: currentModel,
                regenerationCount: messageHistory.get(messagePosition)?.length || 0,
                versions: messageHistory.get(messagePosition) || [botResponse],
                currentVersion: currentVersions.get(messagePosition) || 0,
                apiResponse: data,
                requestData: {
                    prompt: message,
                    imageUrl: currentUploadedImage,
                    audioFileName: currentAudioFile?.name,
                    options: options,
                    timestamp: Date.now()
                }
            }
        };

        chatHistory.push(messageData, responseData);

        if (!messageHistory.has(messagePosition)) {
            messageHistory.set(messagePosition, [botResponse]);
            currentVersions.set(messagePosition, 0);
        }

        if (chatHistory.length > MAX_HISTORY) {
            chatHistory = chatHistory.slice(-MAX_HISTORY);
        }

        // Clear upload states
        if (currentUploadedImage) {
            imagePreview.style.display = 'none';
            currentUploadedImage = null;
            if (imageInput) imageInput.value = '';
        }
        if (currentAudioFile) {
            currentAudioFile = null;
            if (audioInput) audioInput.value = '';
        }

        updateConversationsList();

    } catch (error) {
        console.error('Error sending message:', error);
        thinkingMessage.remove();
        appendMessage(
            `Error: ${error.message}`, false);

        // Clear upload states even if there's an error
        if (currentUploadedImage) {
            imagePreview.style.display = 'none';
            currentUploadedImage = null;
            if (imageInput) imageInput.value = '';
        }
        if (currentAudioFile) {
            currentAudioFile = null;
            if (audioInput) audioInput.value = '';
        }
    } finally {
        isSending = false;
    }
}

// Update getApiUrlForModel to include context
function getApiUrlForModel(model, message, history = []) {
    const encodedMessage = encodeURIComponent(message);

    // Only include context for Gemini models
    const context = (model === 'gemini_flash' || model === 'gemini_flash_paxsenix') && history.length > 0 ?
        encodeURIComponent(history.map(msg =>
            `${msg.isUser ? 'User' : 'Assistant'}: ${msg.content}`
        ).join('\n')) : '';

    const baseUrl = {
        'claude_sonnet': CLAUDE_SONNET_API_URL,
        'mixtral': MIXTRAL_API_URL,
        'llama3': LLAMA3_API_URL,
        'gemma': GEMMA_API_URL,
        'llama3_70b': LLAMA3_70B_API_URL,
        'gpt4o': GPT4O_API_URL,
        'gpt4omini': GPT4O_MINI_API_URL,
        'gemini_flash_paxsenix': GEMINI_FLASH_PAXSENIX_API_URL
    }[model] || GEMINI_REALTIME_API_URL;

    // Add model-specific parameters
    let url = `${baseUrl}?text=${encodedMessage}`;
    
    // Add context if available
    if (context) {
        url += `&context=${context}`;
    }
    
    // Add model-specific parameters for longer responses
    if (model === 'llama3' || model === 'llama3_70b') {
        url += '&max_tokens=2048&temperature=0.7&top_p=0.9';
    } else if (model === 'mixtral') {
        url += '&max_tokens=1024&temperature=0.8';
    } else if (model === 'claude_sonnet') {
        url += '&max_tokens=1024&temperature=0.7';
    }
    
    return url;
}

function getBotResponse(data) {
    if (currentModel === 'gemini_flash') {
        if (data.error) throw new Error(data.error.message || 'API Error');
        return data.candidates[0].content.parts[0].text;
    }
    
    // Handle different response formats from various models
    if (data.message && Array.isArray(data.message)) {
        // Handle array of messages (like in Llama models)
        return data.message.map(msg => msg.text || msg).join('\n');
    } else if (data.message && typeof data.message === 'string') {
        // Direct message string
        return data.message;
    } else if (data.response && typeof data.response === 'string') {
        // Response field
        return data.response;
    } else if (data.text && typeof data.text === 'string') {
        // Text field
        return data.text;
    } else if (data.content && typeof data.content === 'string') {
        // Content field
        return data.content;
    }
    
    // If no recognized format is found, try to extract any text content
    const possibleContent = JSON.stringify(data, null, 2);
    if (possibleContent && possibleContent !== '{}') {
        return `Response format not recognized. Raw content:\n${possibleContent}`;
    }
    
    return 'No response content found from API';
}

async function regenerateResponse(content, position, switchModel = false) {
    if (isSending) return;

    isSending = true;

    try {
        // Find the message div and its corresponding user message
        let messageDiv = null;
        let userMessage = null;

        // First try: Find by exact position and content match
        if (position) {
            messageDiv = Array.from(document.querySelectorAll('.message.bot-message')).find(div => {
                const messageContent = div.querySelector('.message-content');
                return messageContent && messageContent.textContent.trim() === content.trim();
            });

            if (messageDiv) {
                // Find the preceding user message in chat history
                const botIndex = chatHistory.findIndex(msg => !msg.isUser && msg.content === content);
                if (botIndex > 0) {
                    userMessage = chatHistory[botIndex - 1].content;
                }
            }
        }

        // Second try: Find by content anywhere in the chat
        if (!messageDiv) {
            const allMessages = Array.from(document.querySelectorAll('.message.bot-message'));
            messageDiv = allMessages.find(div => {
                const messageContent = div.querySelector('.message-content');
                return messageContent && messageContent.textContent.trim() === content.trim();
            });

            if (messageDiv) {
                // Find the preceding user message in DOM
                const messages = Array.from(document.querySelectorAll('.message'));
                const currentIndex = messages.indexOf(messageDiv);
                if (currentIndex > 0) {
                    const userMessageDiv = messages[currentIndex - 1];
                    if (userMessageDiv.classList.contains('user-message')) {
                        userMessage = userMessageDiv.querySelector('.message-content').textContent.trim();
                    }
                }
            }
        }

        if (!messageDiv || !userMessage) {
            throw new Error('Could not find message to regenerate. Please try refreshing the page.');
        }

        // Add thinking state to the message
        messageDiv.classList.add('thinking');
        const messageContent = messageDiv.querySelector('.message-content');
        if (messageContent) {
            messageContent.innerHTML = '<div class="thinking">AI is thinking</div>';
        }

        // Send the request
        let apiUrl, options;

        if (currentModel === 'gemini_flash') {
            apiUrl = `${GEMINI_FLASH_API_URL}?key=${GEMINI_FLASH_API_KEY}`;

            // Include conversation history for context
            const conversationText = chatHistory.length > 0 ?
                `Previous conversation:\n${chatHistory
                    .filter(msg => msg.content !== content) // Exclude current message being regenerated
                    .map(msg => `${msg.isUser ? 'User' : 'Assistant'}: ${msg.content}`)
                    .join('\n')}\n\n` : '';

            options = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: `You are a helpful AI assistant. Please help with the following:\n\n${conversationText}User message:\n${userMessage}`
                        }]
                    }]
                })
            };
        } else {
            const now = Date.now();
            const timeSinceLastRequest = now - lastRequestTime;

            if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
                throw new Error(`Please wait ${Math.ceil((RATE_LIMIT_DELAY - timeSinceLastRequest) / 1000)} seconds before regenerating.`);
            }

            lastRequestTime = now;
            // Include filtered chat history (excluding current message) for context
            const filteredHistory = chatHistory.filter(msg => msg.content !== content);
            apiUrl = getApiUrlForModel(currentModel, userMessage, filteredHistory);
            options = {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            };
        }

        const response = await fetch(apiUrl, options);
        if (!response.ok) {
            throw new Error(response.status === 429 ?
                'Rate limit exceeded. Please wait a moment before regenerating.' :
                `API request failed with status ${response.status}`);
        }

        const data = await response.json();
        const newResponse = getBotResponse(data);

        // Create position if it doesn't exist
        if (!position) {
            position = Date.now();
        }

        // Update message history for this position
        if (!messageHistory.has(position)) {
            messageHistory.set(position, [content]); // Store the original content as first version
        }
        messageHistory.get(position).push(newResponse);
        const newVersionIndex = messageHistory.get(position).length - 1;
        currentVersions.set(position, newVersionIndex);

        // Update the message content
        messageDiv.classList.remove('thinking');
        if (messageContent) {
            messageContent.innerHTML = marked.parse(newResponse);
        }

        // Remove existing version navigation if it exists
        const existingVersionNav = messageDiv.querySelector('.version-nav');
        if (existingVersionNav) {
            existingVersionNav.remove();
        }

        // Add new version navigation
        const versions = messageHistory.get(position);
        if (versions && versions.length > 1) {
            const toolsDiv = messageDiv.querySelector('.message-tools');
            if (toolsDiv) {
                const leftSection = toolsDiv.querySelector('.message-tools-left');
                const versionNav = document.createElement('div');
                versionNav.className = 'version-nav';
                versionNav.innerHTML = `
                    <button class="nav-button active" data-action="prev">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                    </button>
                    <span class="version-counter">${versions.length}/${versions.length}</span>
                    <button class="nav-button" data-action="next" disabled>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>
                `;

                // Add version navigation event listeners
                versionNav.addEventListener('click', (e) => {
                    const button = e.target.closest('.nav-button');
                    if (!button || button.disabled) return;

                    e.stopPropagation();
                    const action = button.dataset.action;
                    const currentVersion = currentVersions.get(position) || 0;

                    if (action === 'prev' && currentVersion > 0) {
                        switchVersion(messageDiv, position, currentVersion - 1);
                    } else if (action === 'next' && currentVersion < versions.length - 1) {
                        switchVersion(messageDiv, position, currentVersion + 1);
                    }
                });

                leftSection.appendChild(versionNav);
            }
        }

        // Update chat history
        const historyIndex = chatHistory.findIndex(msg => !msg.isUser && msg.content === content);
        if (historyIndex !== -1) {
            chatHistory[historyIndex] = {
                content: newResponse,
                isUser: false,
                timestamp: Date.now(),
                type: 'bot_message',
                model: currentModel,
                metadata: {
                    ...chatHistory[historyIndex].metadata,
                    position: position,
                    regenerationCount: messageHistory.get(position).length,
                    versions: messageHistory.get(position),
                    currentVersion: newVersionIndex,
                    apiResponse: data,
                    requestData: {
                        prompt: userMessage,
                        options: options,
                        timestamp: Date.now()
                    }
                }
            };
        }

        // Save to localStorage
        updateConversationsList();

        if (switchModel) {
            currentModel = data.model || currentModel;
            localStorage.setItem('current_model', currentModel);
            showToast(`Switched to ${currentModel.replace(/_/g, ' ')}`);
        }

    } catch (error) {
        console.error('Regeneration error:', error);
        const messageDiv = document.querySelector('.message.bot-message.thinking');
        if (messageDiv) {
            messageDiv.classList.remove('thinking');
            const messageContent = messageDiv.querySelector('.message-content');
            if (messageContent) {
                messageContent.innerHTML = marked.parse(error.message);
            }
        }
    } finally {
        isSending = false;
    }
}

// Initialize marked options
marked.setOptions({
    breaks: true,
    gfm: true
});

// Mobile optimizations
document.addEventListener('DOMContentLoaded', () => {
    initializeUI();
    // Prevent double-tap zoom on buttons
    document.querySelectorAll('button').forEach(button => {
        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            button.click();
        });
    });

    // Improve scroll behavior on mobile
    chatMessages.style.WebkitOverflowScrolling = 'touch';

    // Handle mobile keyboard
    chatInput.addEventListener('focus', () => {
        setTimeout(() => {
            window.scrollTo(0, document.body.scrollHeight);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 300);
    });

    window.addEventListener('resize', () => {
        if (document.activeElement === chatInput) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    });
});

// Add toast notification
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    });
}

function deleteMessage(messageDiv, position) {
    // Find the user message that preceded this bot message
    const messages = Array.from(chatMessages.querySelectorAll('.message'));
    const currentIndex = messages.indexOf(messageDiv);
    const userMessageDiv = messages[currentIndex - 1];

    // Remove the messages from DOM
    if (userMessageDiv) {
        userMessageDiv.remove();
    }
    messageDiv.remove();

    // Clean up message history and versions
    if (position) {
        messageHistory.delete(position);
        currentVersions.delete(position);
    }

    // Update chat history
    const content = messageDiv.querySelector('.message-content')?.textContent;
    if (content) {
        // Remove both the bot message and its corresponding user message
        const botMessageIndex = chatHistory.findIndex(msg => !msg.isUser && msg.content === content);
        if (botMessageIndex > 0) { // Ensure there's a message before this one
            chatHistory.splice(botMessageIndex - 1, 2); // Remove both messages
        }
    }

    // Update the conversation in localStorage
    updateConversationsList();
}

// Add time formatting helper function
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Add these helper functions at the top of the file after the state variables
function splitTextIntoChunks(text, maxLength = 2600) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
        if ((currentChunk + sentence).length <= maxLength) {
            currentChunk += sentence;
        } else {
            if (currentChunk) chunks.push(currentChunk.trim());
            currentChunk = sentence;
        }
    }
    if (currentChunk) chunks.push(currentChunk.trim());
    return chunks;
}

let audioChunks = [];
let currentChunkIndex = 0;
let isProcessingChunks = false;

async function playNextChunk(messageDiv) {
    if (currentChunkIndex >= audioChunks.length) {
        isProcessingChunks = false;
        currentChunkIndex = 0;
        audioChunks = [];
        return;
    }

    const audioPlayer = messageDiv.querySelector('.audio-player');
    const audioLoading = messageDiv.querySelector('.audio-loading') || 
        messageDiv.insertAdjacentElement('beforeend', (() => {
            const div = document.createElement('div');
            div.className = 'audio-loading';
            div.innerHTML = 'Generating audio...';
            return div;
        })());

    if (!audioPlayer) return;

    const playPauseBtn = audioPlayer.querySelector('.play-pause-btn');
    const seekbar = audioPlayer.querySelector('.seekbar-fill');
    const currentTimeSpan = audioPlayer.querySelector('.current-time');
    const totalTimeSpan = audioPlayer.querySelector('.total-time');
    const downloadBtn = audioPlayer.querySelector('.download-audio');

    const chunk = audioChunks[currentChunkIndex];

    try {
        // Show loading state
        audioLoading.classList.add('active');
        audioPlayer.classList.remove('active');

        // Prepare text for API
        const encodedText = encodeURIComponent(chunk);
        const apiUrl = `${PAXSENIX_TTS_API_URL}?text=${encodedText}&voice=${currentVoice}`;

        // Call Paxsenix TTS API
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error('TTS API request failed');

        const data = await response.json();
        if (!data.ok || !data.directUrl) throw new Error('Invalid TTS API response');

        // Create audio element
        const audio = new Audio(data.directUrl);
        currentUtterance = audio;
        
        // Hide loading, show player
        audioLoading.classList.remove('active');
        audioPlayer.classList.add('active');

        // Set up audio event listeners
        audio.addEventListener('loadedmetadata', () => {
            totalTimeSpan.textContent = formatTime(audio.duration);
        });

        audio.addEventListener('timeupdate', () => {
            const progress = (audio.currentTime / audio.duration) * 100;
            seekbar.style.width = `${progress}%`;
            currentTimeSpan.textContent = formatTime(audio.currentTime);

            // Update word highlighting
            const words = chunk.split(/\s+/);
            const wordIndex = Math.floor((audio.currentTime / audio.duration) * words.length);
            if (wordIndex < words.length) {
                try {
                    highlightFallback(words[wordIndex], messageDiv.querySelector('.message-content'));
                } catch (error) {
                    console.warn('Highlight error:', error);
                }
            }
        });

        audio.addEventListener('ended', () => {
            currentChunkIndex++;
            if (currentChunkIndex < audioChunks.length) {
                playNextChunk(messageDiv);
            } else {
                // Reset UI
                playPauseBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                        <path d="M8 5v14l11-7z"/>
                    </svg>
                `;
                seekbar.style.width = '0%';
                currentTimeSpan.textContent = '0:00';
                isPlaying = false;
                currentUtterance = null;
            }
        });

        // Set up download button
        downloadBtn.onclick = async (e) => {
            e.stopPropagation();
            try {
                const response = await fetch(data.directUrl);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'audio.mp3';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
            } catch (error) {
                console.error('Download error:', error);
                showToast('Failed to download audio');
            }
        };

        // Start playback
        audio.play();
        isPlaying = true;
        playPauseBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="M6 4h4v16H6zm8 0h4v16h-4z"/>
            </svg>
        `;

    } catch (error) {
        console.error('TTS error:', error);
        showToast('TTS failed, falling back to browser TTS');
        
        // Fallback to browser TTS
        try {
            const utterance = new SpeechSynthesisUtterance(chunk);
            utterance.voice = speechSynthesis.getVoices().find(voice => voice.name.includes('Female')) || 
                             speechSynthesis.getVoices()[0];
            
            currentUtterance = utterance;
            speechSynthesis.speak(utterance);
            
            // Hide loading, show player
            audioLoading.classList.remove('active');
            audioPlayer.classList.add('active');
            
        } catch (fallbackError) {
            console.error('TTS fallback error:', fallbackError);
            showToast('Text-to-speech is not available');
        }
    }
}

// Add after setupEventListeners function
function setupImageViewer() {
    const viewer = document.querySelector('.fullscreen-image-viewer');
    if (!viewer) {
        console.error('Image viewer element not found');
        return;
    }

    // Handle clicking on images in messages
    document.addEventListener('click', (e) => {
        const clickedImage = e.target.closest('.message-content img');
        if (clickedImage) {
            const fullscreenImage = viewer.querySelector('.fullscreen-image');
            if (fullscreenImage) {
                fullscreenImage.src = clickedImage.src;
                viewer.classList.add('active');
            }
        }
    });

    // Handle closing the viewer
    const closeBtn = viewer.querySelector('.close-viewer');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            viewer.classList.remove('active');
        });
    }

    viewer.addEventListener('click', (e) => {
        if (e.target === viewer) {
            viewer.classList.remove('active');
        }
    });
}

function setupFileUpload() {
    const plusButton = document.querySelector('.plus-button');
    const uploadMenu = document.querySelector('.file-upload-menu');
    imageInput = document.querySelector('.image-input');
    audioInput = document.querySelector('.audio-input');

    if (!plusButton || !uploadMenu || !imageInput || !audioInput) {
        console.error('Required elements for file upload not found');
        return;
    }

    // Toggle upload menu
    plusButton.addEventListener('click', () => {
        uploadMenu.classList.toggle('active');
    });

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!plusButton.contains(e.target) && !uploadMenu.contains(e.target)) {
            uploadMenu.classList.remove('active');
        }
    });

    // Handle upload options
    const uploadOptions = uploadMenu.querySelectorAll('.upload-option');
    uploadOptions.forEach(option => {
        option.addEventListener('click', () => {
            const type = option.dataset.type;

            if (type === 'audio') {
                audioInput.click();
            }

            uploadMenu.classList.remove('active');
        });
    });

    // Handle audio file selection
    if (audioInput) {
        audioInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (file.size > 5 * 1024 * 1024) {
                alert('Audio file must be less than 5MB');
                return;
            }

            try {
                currentAudioFile = file;
                chatInput.value += `\n[Audio: ${file.name}]`;
            } catch (error) {
                console.error('Error handling audio file:', error);
                alert('Failed to process audio file. Please try again.');
            }

            audioInput.value = ''; // Reset input
        });
    }
}

// Update the voice selection modal HTML
document.body.insertAdjacentHTML('beforeend', `
    <div class="voice-selection-backdrop"></div>
    <div class="voice-selection-modal">
        <div class="voice-selection-header">
            <div class="voice-selection-title">Select Voice</div>
            <button class="voice-selection-close">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
        <input type="text" class="voice-search" placeholder="Search voices...">
        <div class="voice-categories"></div>
    </div>
`);

// Update the voice selection initialization
function initializeVoiceSelection() {
    const modal = document.querySelector('.voice-selection-modal');
    const backdrop = document.querySelector('.voice-selection-backdrop');
    const closeBtn = modal.querySelector('.voice-selection-close');
    const searchInput = modal.querySelector('.voice-search');
    const categoriesContainer = modal.querySelector('.voice-categories');
    let currentAudioElement = null;
    let isRegenerating = false;

    function renderVoices(searchTerm = '') {
        const searchLower = searchTerm.toLowerCase();
        
        categoriesContainer.innerHTML = Object.entries(VOICE_CATEGORIES)
            .map(([category, voices]) => {
                const filteredVoices = voices.filter(voice => 
                    voice.toLowerCase().includes(searchLower)
                );
                
                if (filteredVoices.length === 0) return '';
                
                return `
                    <div class="voice-category">
                        <div class="category-title">${category}</div>
                        <div class="voice-grid">
                            ${filteredVoices.map(voice => `
                                <div class="voice-option ${voice === currentVoice ? 'selected' : ''}" data-voice="${voice}">
                                    <div class="voice-name">${voice}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            })
            .filter(Boolean)
            .join('');
    }

    // Initial render
    renderVoices();

    // Search functionality
    searchInput.addEventListener('input', (e) => {
        renderVoices(e.target.value);
    });

    // Voice selection
    categoriesContainer.addEventListener('click', async (e) => {
        const voiceOption = e.target.closest('.voice-option');
        if (!voiceOption) return;

        const selectedVoice = voiceOption.dataset.voice;
        if (currentVoice === selectedVoice) return;

        const previousVoice = currentVoice;
        currentVoice = selectedVoice;
        localStorage.setItem('selected_voice', selectedVoice);

        // Update UI
        document.querySelectorAll('.voice-option').forEach(option => {
            option.classList.toggle('selected', option.dataset.voice === selectedVoice);
        });

        // Close modal
        modal.classList.remove('active');
        backdrop.classList.remove('active');

        // If there's a current audio playing, regenerate it
        if (currentUtterance && !isRegenerating) {
            isRegenerating = true;
            const messageDiv = currentAudioPlayer?.closest('.message');
            if (messageDiv) {
                const messageContent = messageDiv.querySelector('.message-content');
                if (messageContent) {
                    // Show regenerating state
                    const audioLoading = messageDiv.querySelector('.audio-loading') || 
                        messageDiv.insertAdjacentElement('beforeend', (() => {
                            const div = document.createElement('div');
                            div.className = 'audio-loading';
                            div.innerHTML = 'Regenerating audio...';
                            return div;
                        })());
                    
                    audioLoading.classList.add('active');
                    if (currentAudioPlayer) {
                        currentAudioPlayer.classList.remove('active');
                    }

                    try {
                        // Stop current playback
                        stopCurrentSpeech();
                        
                        // Reset chunk index and start new playback
                        currentChunkIndex = 0;
                        await playNextChunk(messageDiv);
                        
                        showToast(`Voice changed to ${selectedVoice}`);
                    } catch (error) {
                        console.error('Error regenerating audio:', error);
                        showToast('Failed to regenerate audio');
                        // Revert to previous voice
                        currentVoice = previousVoice;
                        localStorage.setItem('selected_voice', previousVoice);
                    } finally {
                        isRegenerating = false;
                    }
                }
            }
        } else {
            showToast(`Voice changed to ${selectedVoice}`);
        }
    });

    // Close modal handlers
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        backdrop.classList.remove('active');
    });

    backdrop.addEventListener('click', () => {
        modal.classList.remove('active');
        backdrop.classList.remove('active');
    });

    // Add voice selection button to message tools
    function addVoiceButton(messageDiv) {
        const toolsDiv = messageDiv.querySelector('.message-tools');
        if (!toolsDiv) return;

        const leftSection = toolsDiv.querySelector('.message-tools-left');
        if (!leftSection) return;

        const voiceButton = document.createElement('button');
        voiceButton.className = 'tool-button voice-select-btn';
        voiceButton.title = 'Select Voice';
        voiceButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
            </svg>
        `;
        
        voiceButton.addEventListener('click', () => {
            modal.classList.add('active');
            backdrop.classList.add('active');
            searchInput.value = '';
            renderVoices();
        });

        // Insert after the play button
        const playButton = leftSection.querySelector('.tool-button[title="Play audio"]');
        if (playButton) {
            playButton.insertAdjacentElement('afterend', voiceButton);
        } else {
            leftSection.appendChild(voiceButton);
        }
    }

    // Add voice buttons to existing messages
    document.querySelectorAll('.message.bot-message').forEach(addVoiceButton);

    // Observe for new messages
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.classList?.contains('message') && node.classList.contains('bot-message')) {
                    addVoiceButton(node);
                }
            });
        });
    });

    observer.observe(chatMessages, { childList: true });
}

// Initialize voice selection when document is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeVoiceSelection();
    // ... rest of the existing initialization code ...
});