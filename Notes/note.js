// Constants
const STORAGE_KEY = 'ai_notes';
const DEFAULT_NOTE = {
    id: null,
    title: 'Untitled Note',
    content: '',
    created: null,
    updated: null
};

// DOM Elements
const editor = document.querySelector('.editor');
const titleInput = document.querySelector('.note-title');
const saveBtn = document.getElementById('saveBtn');
const backBtn = document.getElementById('backBtn');
const aiSuggestBtn = document.getElementById('aiSuggest');
const formatSelect = document.getElementById('formatSelect');

// State
let currentNote = { ...DEFAULT_NOTE };
let notes = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
let isEditing = false;

// API Endpoints
const API_BASE_URL = 'https://api.paxsenix.us.kg/ai';

// Current model selection
let currentModel = localStorage.getItem('current_model') || 'gemini_realtime';

// Update models without icons
const models = {
    'gemini_realtime': { name: 'Gemini Realtime' },
    'gemini_flash': { name: 'Gemini Flash' },
    'claude_sonnet': { name: 'Claude Sonnet' },
    'mixtral': { name: 'Mixtral' },
    'llama3': { name: 'Llama 3' },
    'gemma': { name: 'Gemma' },
    'llama3_70b': { name: 'Llama 3 70B' },
    'gpt4o': { name: 'GPT-4 Omega' },
    'gpt4omini': { name: 'GPT-4 Omega Mini' }
};

// Update processAIRequest function
async function processAIRequest(text, action, selectedText) {
    try {
        showLoading();
        const noteContext = editor.innerText;
        let prompt = '';
        
        switch (action) {
            case 'improve':
                prompt = `Improve this text while maintaining its meaning and style:\n${text}`;
                break;
            case 'summarize':
                prompt = `Provide a concise summary of this text:\n${text}`;
                break;
            case 'continue':
                prompt = `Continue this text in a similar style:\n${text}`;
                break;
            case 'translate':
                const language = prompt('Enter target language:');
                if (!language) {
                    hideLoading();
                    return;
                }
                prompt = `Translate this text to ${language}:\n${text}`;
                break;
            case 'chat':
                prompt = text;
                break;
            default:
                prompt = text;
        }

        // Construct request options
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                text: prompt,
                context: noteContext,
                model: currentModel,
                action: action
            })
        };

        // Get endpoint based on model
        let endpoint;
        switch (currentModel) {
            case 'gemini_flash':
                endpoint = '/gemini';
                break;
            case 'claude_sonnet':
                endpoint = '/claudeSonnet';
                break;
            case 'mixtral':
                endpoint = '/mixtral';
                break;
            case 'llama3':
                endpoint = '/llama3';
                break;
            case 'llama3_70b':
                endpoint = '/llama3-70b';
                break;
            case 'gpt4o':
                endpoint = '/gpt4o';
                break;
            case 'gpt4omini':
                endpoint = '/gpt4omini';
                break;
            case 'gemma':
                endpoint = '/gemma';
                break;
            default:
                endpoint = '/gemini-realtime';
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(
                errorData?.error || 
                `API Error: ${response.status} - ${response.statusText}`
            );
        }

        const data = await response.json();
        
        if (!data || (!data.response && !data.message && !data.answer)) {
            throw new Error('Invalid response from API');
        }

        let aiResponse = data.response || data.message || data.answer;

        if (action === 'chat') {
            return aiResponse;
        }

        // Update editor content
        if (selectedText && window.getSelection().rangeCount > 0) {
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            range.deleteContents();
            const textNode = document.createTextNode(aiResponse);
            range.insertNode(textNode);
            
            // Normalize the editor to fix any text nodes
            editor.normalize();
        } else {
            editor.innerHTML += `<p>${aiResponse}</p>`;
        }
        
        showToast(`${action.charAt(0).toUpperCase() + action.slice(1)} completed`, 'success');
        return aiResponse;

    } catch (error) {
        console.error('AI Processing Error:', error);
        showToast(error.message || 'Failed to process AI request', 'error');
        return null;
    } finally {
        hideLoading();
        const aiMenu = document.getElementById('aiMenu');
        if (aiMenu && action !== 'chat') {
            aiMenu.classList.remove('active');
        }
    }
}

// Update setupAIFeatures function
function setupAIFeatures() {
    const aiMenu = document.getElementById('aiMenu');
    const aiAssistBtn = document.getElementById('aiAssist');
    const closeAiMenu = document.getElementById('closeAiMenu');
    
    // Add model selector
    const modelSelector = document.createElement('div');
    modelSelector.className = 'model-selector-container';
    
    // Update model selector template
    modelSelector.innerHTML = `
        <div class="current-model">
            <span class="model-name">${models[currentModel].name}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
        </div>
        <div class="model-options">
            ${Object.entries(models).map(([value, { name }]) => `
                <div class="model-option ${value === currentModel ? 'active' : ''}" data-value="${value}">
                    <span class="model-name">${name}</span>
                    ${value === currentModel ? '<span class="model-check">✓</span>' : ''}
                </div>
            `).join('')}
        </div>
    `;

    // Add model selector to AI menu header
    const aiMenuHeader = document.querySelector('.ai-menu-header');
    aiMenuHeader.insertBefore(modelSelector, aiMenuHeader.lastChild);
    
    // Toggle model options
    const currentModelDiv = modelSelector.querySelector('.current-model');
    const modelOptions = modelSelector.querySelector('.model-options');
    
    currentModelDiv.addEventListener('click', (e) => {
        e.stopPropagation();
        modelOptions.classList.toggle('show');
    });
    
    // Handle model selection
    modelSelector.querySelectorAll('.model-option').forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            const value = option.dataset.value;
            currentModel = value;
            localStorage.setItem('current_model', value);
            
            // Update UI
            currentModelDiv.querySelector('.model-name').textContent = models[value].name;
            modelSelector.querySelectorAll('.model-option').forEach(opt => {
                opt.classList.toggle('active', opt === option);
                const checkmark = opt.querySelector('.model-check');
                if (checkmark) checkmark.remove();
                if (opt === option) {
                    opt.innerHTML += '<span class="model-check">✓</span>';
                }
            });
            
            modelOptions.classList.remove('show');
            showToast(`Switched to ${models[value].name}`);
        });
    });
    
    // Close model options when clicking outside
    document.addEventListener('click', () => {
        modelOptions.classList.remove('show');
    });
    
    // Toggle AI menu
    aiAssistBtn?.addEventListener('click', () => {
        aiMenu.classList.toggle('active');
    });

    closeAiMenu?.addEventListener('click', () => {
        aiMenu.classList.remove('active');
    });

    // Handle AI options
    document.querySelectorAll('.ai-option').forEach(option => {
        option.addEventListener('click', async () => {
            const action = option.dataset.action;
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();
            const text = selectedText || editor.innerText.trim();

            if (!text || text === 'Start typing your note here...') {
                showToast('Please select text or write something first', 'error');
                return;
            }

            await processAIRequest(text, action, selectedText);
        });
    });
}

// Initialize
function init() {
    loadLastNote();
    setupEventListeners();
    setupToolbar();
    setupAIFeatures();
    setupAdvancedFormatting();
    setupChat();
    updateWordCount();
}

// Load the last edited note or create a new one
function loadLastNote() {
    const lastNote = notes[0];
    if (lastNote) {
        loadNote(lastNote);
    } else {
        createNewNote();
    }
}

// Create a new note
function createNewNote() {
    currentNote = {
        ...DEFAULT_NOTE,
        id: Date.now(),
        created: Date.now(),
        updated: Date.now()
    };
    editor.innerHTML = '<p>Start typing your note here...</p>';
    titleInput.value = currentNote.title;
}

// Load a specific note
function loadNote(note) {
    currentNote = { ...note };
    editor.innerHTML = note.content || '<p>Start typing your note here...</p>';
    titleInput.value = note.title;
}

// Save the current note
function saveNote() {
    const content = editor.innerHTML;
    const title = titleInput.value.trim();

    currentNote.content = content;
    currentNote.title = title;
    currentNote.updated = Date.now();

    const index = notes.findIndex(n => n.id === currentNote.id);
    if (index !== -1) {
        notes[index] = currentNote;
    } else {
        notes.unshift(currentNote);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    showToast('Note saved successfully');
}

// Setup event listeners
function setupEventListeners() {
    // Auto-save on content change
    let saveTimeout;
    editor.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveNote, 1000);
    });

    // Title change
    titleInput.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(saveNote, 1000);
    });

    // Save button
    saveBtn.addEventListener('click', saveNote);

    // Back button
    backBtn.addEventListener('click', () => {
        if (confirm('Do you want to save before leaving?')) {
            saveNote();
        }
        window.history.back();
    });

    // Editor placeholder
    editor.addEventListener('focus', function() {
        if (this.innerHTML === '<p>Start typing your note here...</p>') {
            this.innerHTML = '<p></p>';
        }
    });

    editor.addEventListener('blur', function() {
        if (this.innerHTML === '<p></p>' || this.innerHTML === '') {
            this.innerHTML = '<p>Start typing your note here...</p>';
        }
    });

    // Format select
    formatSelect.addEventListener('change', () => {
        document.execCommand('formatBlock', false, formatSelect.value);
    });

    // Toolbar buttons
    document.querySelectorAll('.toolbar button[data-command]').forEach(button => {
        button.addEventListener('click', () => {
            const command = button.dataset.command;
            let value = null;

            if (command === 'createLink') {
                value = prompt('Enter the URL:');
                if (!value) return;
            } else if (command === 'insertImage') {
                value = prompt('Enter the image URL:');
                if (!value) return;
            } else if (command === 'code') {
                const selection = window.getSelection();
                const range = selection.getRangeAt(0);
                const selectedText = range.toString();
                const code = document.createElement('code');
                code.textContent = selectedText;
                range.deleteContents();
                range.insertNode(code);
                return;
            }

            document.execCommand(command, false, value);
            updateToolbarState();
        });
    });

    // Add word count update
    editor.addEventListener('input', updateWordCount);
}

// Update setupToolbar function
function setupToolbar() {
    // Format select
    formatSelect.addEventListener('change', () => {
        const format = formatSelect.value;
        document.execCommand('formatBlock', false, format);
        updateToolbarState();
    });

    // Toolbar buttons
    document.querySelectorAll('.toolbar button[data-command]').forEach(button => {
        button.addEventListener('click', () => {
            const command = button.dataset.command;
            let value = null;

            switch (command) {
                case 'createLink':
                    value = prompt('Enter the URL:');
                    if (!value) return;
                    break;
                case 'insertImage':
                    value = prompt('Enter the image URL:');
                    if (!value) return;
                    break;
                case 'foreColor':
                case 'hiliteColor':
                    value = button.querySelector('input[type="color"]').value;
                    break;
                case 'code':
                    const selection = window.getSelection();
                    if (selection.rangeCount > 0) {
                        const range = selection.getRangeAt(0);
                        const code = document.createElement('code');
                        code.textContent = range.toString();
                        range.deleteContents();
                        range.insertNode(code);
                    }
                    return;
            }

            try {
                document.execCommand(command, false, value);
            } catch (e) {
                console.warn('execCommand error:', e);
            }
            updateToolbarState();
        });
    });

    // Add toolbar state update on selection change
    editor.addEventListener('keyup', updateToolbarState);
    editor.addEventListener('mouseup', updateToolbarState);
    document.addEventListener('selectionchange', updateToolbarState);
}

// Update updateToolbarState function
function updateToolbarState() {
    document.querySelectorAll('.toolbar button[data-command]').forEach(button => {
        const command = button.dataset.command;
        try {
            if (document.queryCommandState(command)) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        } catch (e) {
            // Some commands don't support queryCommandState
            console.warn('queryCommandState error:', e);
        }
    });

    try {
        const formatBlock = document.queryCommandValue('formatBlock').toLowerCase();
        if (formatBlock && formatSelect.querySelector(`option[value="${formatBlock}"]`)) {
            formatSelect.value = formatBlock;
        }
    } catch (e) {
        console.warn('formatBlock error:', e);
    }
}

// Add word count functionality
function updateWordCount() {
    const text = editor.innerText;
    const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
    
    let wordCountDiv = document.querySelector('.word-count');
    if (!wordCountDiv) {
        wordCountDiv = document.createElement('div');
        wordCountDiv.className = 'word-count';
        document.querySelector('.editor-container').appendChild(wordCountDiv);
    }
    
    wordCountDiv.textContent = `${wordCount} words`;
}

// Add loading indicator
function showLoading() {
    let loader = document.querySelector('.loading');
    if (!loader) {
        loader = document.createElement('div');
        loader.className = 'loading';
        document.querySelector('.editor-container').prepend(loader);
    }
    loader.classList.add('active');
}

function hideLoading() {
    const loader = document.querySelector('.loading');
    if (loader) {
        loader.classList.remove('active');
    }
}

// Enhanced toast messages
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2000);
    });
}

// Update setupAdvancedFormatting function
function setupAdvancedFormatting() {
    // Text color
    const textColorPicker = document.getElementById('textColorPicker');
    textColorPicker.addEventListener('input', (e) => {
        try {
            document.execCommand('foreColor', false, e.target.value);
        } catch (e) {
            console.warn('foreColor error:', e);
        }
    });

    // Background color
    const bgColorPicker = document.getElementById('bgColorPicker');
    bgColorPicker.addEventListener('input', (e) => {
        try {
            document.execCommand('hiliteColor', false, e.target.value);
        } catch (e) {
            console.warn('hiliteColor error:', e);
        }
    });

    // Table insertion
    document.getElementById('insertTable').addEventListener('click', () => {
        const rows = prompt('Enter number of rows:', '3');
        const cols = prompt('Enter number of columns:', '3');
        
        if (rows && cols) {
            let table = '<table style="border-collapse: collapse; width: 100%; margin: 1em 0;">';
            for (let i = 0; i < rows; i++) {
                table += '<tr>';
                for (let j = 0; j < cols; j++) {
                    table += '<td style="border: 1px solid var(--border-color); padding: 8px;">Cell</td>';
                }
                table += '</tr>';
            }
            table += '</table><p></p>';
            
            try {
                document.execCommand('insertHTML', false, table);
            } catch (e) {
                console.warn('insertHTML error:', e);
            }
        }
    });
}

// Add new chat functionality
function setupChat() {
    const container = document.querySelector('.container');
    const chatSidebar = document.getElementById('chatSidebar');
    const openChatBtn = document.getElementById('openChat');
    const closeChatBtn = document.getElementById('closeChat');
    const chatInput = document.getElementById('chatInput');
    const sendMessageBtn = document.getElementById('sendMessage');
    const chatMessages = document.getElementById('chatMessages');

    // Toggle chat sidebar
    openChatBtn.addEventListener('click', () => {
        chatSidebar.classList.add('active');
        container.classList.add('chat-open');
    });

    closeChatBtn.addEventListener('click', () => {
        chatSidebar.classList.remove('active');
        container.classList.remove('chat-open');
    });

    // Format AI response
    function formatAIResponse(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
            .replace(/- (.*?)(?:\n|$)/g, '• $1\n')
            .replace(/\n/g, '<br>')
            .trim();
    }

    // Add message to chat
    function addMessage(text, isUser = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${isUser ? 'user' : ''}`;
        
        const avatar = document.createElement('div');
        avatar.className = 'chat-avatar';
        avatar.textContent = isUser ? 'U' : 'A';

        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        
        // Format the message if it's from AI
        if (!isUser && text !== 'Typing...') {
            bubble.innerHTML = formatAIResponse(text);
        } else {
            bubble.textContent = text;
        }

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(bubble);
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;

        return messageDiv;
    }

    // Send message function
    async function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        // Add user message
        addMessage(message, true);
        chatInput.value = '';

        // Show typing indicator
        const typingIndicator = addMessage('Typing...', false);

        try {
            // Process message with AI
            const response = await processAIRequest(message, 'chat');
            
            // Remove typing indicator and add AI response
            typingIndicator.remove();
            if (response) {
                addMessage(response, false);
            }
        } catch (error) {
            // Remove typing indicator and show error
            typingIndicator.remove();
            showToast('Failed to get response: ' + error.message, 'error');
        }
    }

    // Send message on button click or Enter (without Shift)
    sendMessageBtn.addEventListener('click', sendMessage);
    
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

// Initialize the application
init();