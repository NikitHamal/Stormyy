class ChatManager {
    constructor() {
      this.currentModel = 'gemini-2.0-flash-thinking-exp';
      this.conversations = JSON.parse(localStorage.getItem('conversations') || '[]');
      this.currentConversationId = null;
      this.setupEventListeners();
      this.loadConversations();
    }

    setupEventListeners() {
      const promptInput = document.getElementById('promptInput');
      promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage(promptInput.value);
          promptInput.value = '';
        }
      });
    }

    async startNewConversation() {
      const conversation = {
        id: Date.now().toString(),
        title: 'Untitled',
        messages: [],
        model: this.currentModel,
        timestamp: new Date().toISOString()
      };

      this.conversations.unshift(conversation);
      this.currentConversationId = conversation.id;
      this.saveConversations();
      this.loadConversations();
      this.loadMessages(conversation.id);
    }

    async sendMessage(text) {
      if (!text.trim()) return;

      const message = {
        id: Date.now().toString(),
        role: 'user',
        content: text,
        timestamp: new Date().toISOString()
      };

      const conversation = this.conversations.find(c => c.id === this.currentConversationId);
      if (!conversation) return;

      conversation.messages.push(message);
      this.saveConversations();
      this.displayMessage(message);

      // If this is the first message, get a title suggestion
      if (conversation.messages.length === 1) {
        this.suggestTitle(text, conversation.id);
      }

      // Get AI response
      await this.getAIResponse(text, conversation);
    }

    async getAIResponse(text, conversation) {
      try {
        let endpoint = 'https://api.paxsenix.biz.id/ai/';
        
        // Adjust endpoint based on model
        switch(this.currentModel) {
          case 'gemini-2.0-flash-thinking-exp':
            endpoint += 'gemini';
            break;
          default:
            endpoint += this.currentModel;
        }

        this.showTypingIndicator();

        // Get conversation context (last 5 messages)
        const context = conversation.messages
          .slice(-5)
          .map(m => ({
            role: m.role,
            parts: [{ text: m.content }]
          }));

        // Add current message
        context.push({
          role: 'user',
          parts: [{ text }]
        });

        const requestBody = {
          model: this.currentModel,
          contents: context
        };

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (!data || !data.ok) {
          throw new Error('Invalid response from server');
        }

        const aiResponse = data.message?.[0]?.text;

        if (!aiResponse) {
          throw new Error('No valid response content found');
        }

        const aiMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: aiResponse,
          model: this.currentModel,
          timestamp: new Date().toISOString()
        };

        conversation.messages.push(aiMessage);
        this.saveConversations();
        this.displayMessage(aiMessage);

      } catch (error) {
        console.error('AI response error:', error);
        this.displayErrorMessage(`Failed to get AI response: ${error.message}`);
      } finally {
        this.hideTypingIndicator();
      }
    }

    async suggestTitle(firstMessage, conversationId) {
      try {
        const response = await fetch('https://api.paxsenix.biz.id/ai/gemini', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            model: 'gemini-2.0-flash-thinking-exp',
            contents: [{
              role: 'user',
              parts: [{
                text: `Generate a very short (max 4 words) title for a conversation that starts with this message: "${firstMessage}". Response format: just the title, nothing else.`
              }]
            }],
            temperature: 0.7
          })
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (!data || !data.ok) {
          throw new Error('Invalid response from server');
        }
        
        const titleResponse = data.message?.[0]?.text;
        if (titleResponse) {
          const title = titleResponse.trim().substring(0, 50);
          const conversation = this.conversations.find(c => c.id === conversationId);
          if (conversation) {
            conversation.title = title;
            this.saveConversations();
            this.loadConversations();
          }
        } else {
          throw new Error('No valid title suggestion received');
        }
      } catch (error) {
        console.error('Title suggestion error:', error);
        // Set a default title if suggestion fails
        const conversation = this.conversations.find(c => c.id === conversationId);
        if (conversation) {
          conversation.title = 'New Conversation';
          this.saveConversations();
          this.loadConversations();
        }
      }
    }

    showTypingIndicator() {
      const messagesContainer = document.getElementById('messagesContainer');
      const typingIndicator = document.createElement('div');
      typingIndicator.className = 'typing-indicator';
      typingIndicator.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      `;
      typingIndicator.id = 'typingIndicator';
      messagesContainer.appendChild(typingIndicator);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    hideTypingIndicator() {
      const typingIndicator = document.getElementById('typingIndicator');
      if (typingIndicator) {
        typingIndicator.remove();
      }
    }

    displayErrorMessage(message) {
      const messagesContainer = document.getElementById('messagesContainer');
      const errorDiv = document.createElement('div');
      errorDiv.className = 'chat-message error-message';
      errorDiv.innerHTML = `
        <div class="message-content">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" style="margin-right: 8px;">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
          ${message}
        </div>
      `;
      messagesContainer.appendChild(errorDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    displayMessage(message) {
      const messagesContainer = document.getElementById('messagesContainer');
      const lastMessage = messagesContainer.lastElementChild;
      const shouldGroup = lastMessage && 
        lastMessage.getAttribute('data-role') === message.role &&
        Date.now() - new Date(message.timestamp).getTime() < 60000;

      const messageDiv = document.createElement('div');
      messageDiv.className = `chat-message ${message.role}-message`;
      messageDiv.setAttribute('data-role', message.role);
      messageDiv.setAttribute('data-timestamp', message.timestamp);
      
      // Add message header (only for model badge)
      if (message.model) {
        const header = document.createElement('div');
        header.className = 'message-header';
        
        const modelBadge = document.createElement('div');
        modelBadge.className = 'model-badge';
        modelBadge.textContent = message.model.split('-')[0];
        header.appendChild(modelBadge);
        messageDiv.appendChild(header);
      }
      
      const content = document.createElement('div');
      content.className = 'message-content';
      content.innerHTML = marked.parse(message.content);
      
      // Add timestamp
      const timestamp = document.createElement('div');
      timestamp.className = 'timestamp';
      timestamp.textContent = this.formatTimestamp(message.timestamp);
      content.appendChild(timestamp);

      messageDiv.appendChild(content);
      
      // Add message actions
      const actions = document.createElement('div');
      actions.className = 'message-actions';
      actions.innerHTML = `
        <button onclick="copyMessage('${message.id}')" class="message-action-btn">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
          </svg>
        </button>
      `;
      messageDiv.appendChild(actions);

      messagesContainer.appendChild(messageDiv);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    formatTimestamp(timestamp) {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;

      if (diff < 60000) return 'Just now';
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
      if (date.toDateString() === now.toDateString()) return 'Today';
      if (date.toDateString() === new Date(now - 86400000).toDateString()) return 'Yesterday';
      
      return date.toLocaleDateString();
    }

    loadConversations() {
      const conversationsList = document.getElementById('conversationsList');
      conversationsList.innerHTML = this.conversations.map(conv => `
        <div class="conversation-item ${conv.id === this.currentConversationId ? 'active' : ''}"
             onclick="chatManager.loadMessages('${conv.id}')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
          </svg>
          <div class="conversation-details">
            <div class="conversation-title">${this.formatConversationTitle(conv.title)}</div>
            <div class="conversation-preview">${this.getConversationPreview(conv)}</div>
          </div>
        </div>
      `).join('');
    }

    loadMessages(conversationId) {
      this.currentConversationId = conversationId;
      const conversation = this.conversations.find(c => c.id === conversationId);
      if (!conversation) return;

      const messagesContainer = document.getElementById('messagesContainer');
      messagesContainer.innerHTML = '';
      conversation.messages.forEach(message => this.displayMessage(message));
      this.loadConversations(); // Refresh sidebar to show active state
    }

    changeModel(modelId) {
      this.currentModel = modelId;
      if (this.currentConversationId) {
        const conversation = this.conversations.find(c => c.id === this.currentConversationId);
        if (conversation) {
          conversation.model = modelId;
          this.saveConversations();
        }
      }
    }

    saveConversations() {
      localStorage.setItem('conversations', JSON.stringify(this.conversations));
    }

    showWelcomeScreen() {
      const welcomeScreen = document.getElementById('welcomeScreen');
      const messagesContainer = document.getElementById('messagesContainer');
      
      if (this.conversations.length === 0) {
        welcomeScreen.style.display = 'flex';
        messagesContainer.style.display = 'none';
      } else {
        welcomeScreen.style.display = 'none';
        messagesContainer.style.display = 'block';
      }
    }

    useExamplePrompt(prompt) {
      const promptInput = document.getElementById('promptInput');
      promptInput.value = prompt.textContent.replace(/"/g, '');
      promptInput.focus();
      autoResize(promptInput);
    }

    formatConversationTitle(title) {
      // Truncate long titles
      return title.length > 30 ? title.substring(0, 27) + '...' : title;
    }

    getConversationPreview(conversation) {
      if (conversation.messages.length === 0) return '';
      const lastMessage = conversation.messages[conversation.messages.length - 1];
      return lastMessage.content.substring(0, 40) + (lastMessage.content.length > 40 ? '...' : '');
    }
  }

  const chatManager = new ChatManager();
  window.chatManager = chatManager;

  // Utility functions
  function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  function startNewConversation() {
    chatManager.startNewConversation();
  }

  function changeModel(value) {
    chatManager.changeModel(value);
  }

  function toggleSearch() {
    const searchContainer = document.getElementById('searchContainer');
    searchContainer.classList.toggle('visible');
    if (searchContainer.classList.contains('visible')) {
      searchContainer.querySelector('input').focus();
    }
  }

  function searchMessages(query) {
    const messages = document.querySelectorAll('.chat-message');
    messages.forEach(message => {
      const content = message.querySelector('.message-content').textContent;
      if (content.toLowerCase().includes(query.toLowerCase())) {
        message.style.display = 'flex';
        highlightText(message, query);
      } else {
        message.style.display = 'none';
      }
    });
  }

  function highlightText(message, query) {
    const content = message.querySelector('.message-content');
    const text = content.textContent;
    const highlightedText = text.replace(
      new RegExp(query, 'gi'),
      match => `<span class="message-highlight">${match}</span>`
    );
    content.innerHTML = highlightedText;
  }

  function deleteAllMessages() {
    if (confirm('Are you sure you want to delete all conversations? This action cannot be undone.')) {
      localStorage.removeItem('conversations');
      window.location.reload(); // Reload the page to reset everything
      showToast('All conversations cleared');
    }
  }

  function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('visible');
    
    setTimeout(() => {
      toast.classList.remove('visible');
    }, duration);
  }

  // Add this new function
  function sendMessage() {
    const promptInput = document.getElementById('promptInput');
    const message = promptInput.value.trim();
    if (message) {
      chatManager.sendMessage(message);
      promptInput.value = '';
      promptInput.style.height = 'auto';
    }
  }

  // Initialize the chat interface
  document.addEventListener('DOMContentLoaded', () => {
    // Start a new conversation if there are no existing ones
    if (chatManager.conversations.length === 0) {
      chatManager.startNewConversation();
    } else {
      // Load the most recent conversation
      chatManager.loadMessages(chatManager.conversations[0].id);
    }
  });

  // Add keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // CMD/Ctrl + Enter to send message
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      sendMessage();
    }
    
    // Escape to close search
    if (e.key === 'Escape') {
      const searchContainer = document.getElementById('searchContainer');
      if (searchContainer.classList.contains('visible')) {
        toggleSearch();
      }
    }
  });

  // Add smooth scrolling
  function scrollToBottom() {
    const messagesContainer = document.getElementById('messagesContainer');
    messagesContainer.scrollTo({
      top: messagesContainer.scrollHeight,
      behavior: 'smooth'
    });
  }

  // Add these functions to handle sidebar toggle and settings
  function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');
    sidebar.classList.toggle('hidden');
    
    // Save preference
    localStorage.setItem('sidebarHidden', sidebar.classList.contains('hidden'));
  }

  function openSettings() {
    const modal = document.getElementById('settingsModal');
    modal.classList.add('visible');
    
    // Set current model in settings
    const currentModel = chatManager.currentModel;
    document.querySelector(`input[value="${currentModel}"]`).checked = true;
  }

  function closeSettings() {
    const modal = document.getElementById('settingsModal');
    modal.classList.remove('visible');
  }

  // Update the changeModel function
  function changeModel(value) {
    chatManager.changeModel(value);
    closeSettings();
    showToast('Model updated successfully');
  }

  // Add to the DOMContentLoaded event listener
  document.addEventListener('DOMContentLoaded', () => {
    // Restore sidebar state
    const sidebarHidden = localStorage.getItem('sidebarHidden') === 'true';
    if (sidebarHidden) {
      document.getElementById('sidebar').classList.add('hidden');
    }
    
    // Close modal when clicking outside
    const modal = document.getElementById('settingsModal');
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeSettings();
      }
    });
    
    // Close settings with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('visible')) {
        closeSettings();
      }
    });
  });