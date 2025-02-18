document.addEventListener('DOMContentLoaded', function() {
    // Create ResearchManager instance first
    const researchManager = new ResearchManager();
    window.researchManager = researchManager;

    // Then set up the UI handlers
    const titleSetup = document.getElementById('titleSetup');
    const titleInput = titleSetup.querySelector('.title-input');
    const startResearchBtn = titleSetup.querySelector('.start-research');
    const currentTitle = document.getElementById('currentTitle');
    const welcomeScreen = document.getElementById('welcomeScreen');
    const followUpSection = document.querySelector('.follow-up-section');
    
    // Initially hide the follow-up section
    if (followUpSection) {
        followUpSection.style.display = 'none';
    }

    // Handle example prompts
    document.querySelectorAll('.example-prompt').forEach(button => {
        button.addEventListener('click', () => {
            titleInput.value = button.textContent;
            startResearchBtn.click();
        });
    });

    // Check if there's already a research topic
    const currentTopic = sessionStorage.getItem('researchTopic');
    if (currentTopic) {
        researchManager.showResearchTitle(currentTopic);
        researchManager.conductResearch(currentTopic);
        welcomeScreen.style.display = 'none';
    }

    startResearchBtn.addEventListener('click', function() {
        const topic = titleInput.value.trim();
        if (topic) {
            researchManager.showResearchTitle(topic);
            sessionStorage.setItem('researchTopic', topic);
            welcomeScreen.style.display = 'none';
            researchManager.conductResearch(topic);
        }
    });

    titleInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            startResearchBtn.click();
        }
    });
});

class ResearchManager {
            constructor() {
        // Initialize history first
        this.history = JSON.parse(localStorage.getItem('researchHistory')) || [];
        
                this.apiEndpoints = {
                    aoyo: 'https://api.paxsenix.biz.id/ai/aoyo',
                    felo: 'https://api.paxsenix.biz.id/ai/felo',
                    turboseek: 'https://api.paxsenix.biz.id/ai/turboseek',
                    duckassist: 'https://api.paxsenix.biz.id/ai/duckassist'
                };
                this.loader = document.getElementById('researchLoader');
                this.resultsContainer = document.getElementById('resultsContainer');
                this.combinedResults = document.getElementById('combinedResults');
                this.activeResponses = 0;
                this.totalResponses = Object.keys(this.apiEndpoints).length;
                this.sessionId = null;
                this.contextContent = '';

        // Set up UI and event listeners
        this.setupEventListeners();
        this.setupHistoryUI();
        this.setupBrowserNavigation();

        // Hide follow-up section initially
        const followUpSection = document.querySelector('.follow-up-section');
        if (followUpSection) {
            followUpSection.style.display = 'none';
        }

        // Check URL params after everything is initialized
                const urlParams = new URLSearchParams(window.location.search);
                const query = urlParams.get('query');
                if (query) {
            const existingResearch = this.history.find(item => 
                item.topic.toLowerCase() === query.toLowerCase());
            if (existingResearch) {
                this.loadResearch(existingResearch);
            } else {
                    this.conductResearch(query);
                }
        }
    }

    showResearchTitle(topic) {
        const titleSetup = document.getElementById('titleSetup');
        const currentTitle = document.getElementById('currentTitle');
        
        titleSetup.style.display = 'none';
        currentTitle.textContent = topic;
        currentTitle.style.display = 'block';
            }

            async fetchFromAPI(endpoint, query) {
                try {
                    const response = await fetch(`${endpoint}?text=${encodeURIComponent(query)}`, {
                        method: 'GET',
                        headers: {
                            'Accept': '*/*'
                        }
                    });
                    
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const data = await response.json();
                    console.log(`Response from ${endpoint}:`, data);
                    
                    return {
                        ok: data.ok,
                        result: data.answer || data.result || data.text || JSON.stringify(data),
                        sources: data.sources || []
                    };
                } catch (error) {
                    console.error(`Error fetching from ${endpoint}:`, error);
                    return { 
                        ok: false,
                        error: error.message || 'Failed to fetch results' 
                    };
                }
            }

            async conductResearch(query) {
        // First check if we already have this research
        const existingResearch = this.history.find(item => 
            item.topic.toLowerCase() === query.toLowerCase());

        if (existingResearch) {
            // Load from history instead of making API calls
            this.loadResearch(existingResearch);
            return;
        }

        const welcomeScreen = document.getElementById('welcomeScreen');
        if (welcomeScreen) {
            welcomeScreen.style.display = 'none';
        }

                this.showLoader();
                this.resultsContainer.style.display = 'block';
                this.combinedResults.innerHTML = '<div class="generating-text">Generating response...</div>';
                this.activeResponses = 0;
        
        // Show the research title
        this.showResearchTitle(query);
                
                let allSources = [];
                let combinedContent = '';

                for (const [key, endpoint] of Object.entries(this.apiEndpoints)) {
                    this.fetchFromAPI(endpoint, query).then(data => {
                        this.activeResponses++;
                        
                        if (data.ok) {
                            // Add new content with a typing animation
                            const newContent = this.formatMarkdown(data.result || data.answer);
                            combinedContent += newContent;
                            
                            // Update the display with animation
                            this.updateStreamingContent(combinedContent);
                            
                            // Collect sources from all possible locations
                            if (data.sources) {
                                allSources = [...allSources, ...data.sources];
                            }
                            if (data.source) {  // some APIs use 'source' instead of 'sources'
                                allSources = [...allSources, ...data.source];
                            }
                            if (data.results) {  // some APIs include sources in 'results'
                                const resultSources = data.results.filter(item => item.url && item.name);
                                allSources = [...allSources, ...resultSources];
                            }
                        }

                        // Update progress
                        const progress = (this.activeResponses / this.totalResponses) * 100;
                        this.updateProgress(progress);

                        // If all responses are in, finalize the display
                        if (this.activeResponses === this.totalResponses) {
                            this.finalizeDisplay(combinedContent, allSources);
                        }
                    }).catch(error => {
                        console.error(`Error with ${key}:`, error);
                        this.activeResponses++;
                        
                        // Update progress even on error
                        const progress = (this.activeResponses / this.totalResponses) * 100;
                        this.updateProgress(progress);
                    });
                }
            }

            updateStreamingContent(content) {
                // Remove any existing content
                this.combinedResults.innerHTML = '';
                
                // Create wrapper with proper classes
                const wrapper = document.createElement('div');
                wrapper.className = 'combined-content fade-in';
                
                // Apply glass morphism styles programmatically to ensure they're applied
                wrapper.style.background = 'rgba(20, 20, 20, 0.7)';
                wrapper.style.backdropFilter = 'blur(20px)';
                wrapper.style.WebkitBackdropFilter = 'blur(20px)'; // For Safari
                wrapper.style.borderRadius = '24px';
                wrapper.style.padding = '2rem';
                wrapper.style.border = '1px solid rgba(255, 255, 255, 0.1)';
                wrapper.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
                
                // Set the formatted content
                wrapper.innerHTML = content;
                
                // Append to results container
                this.combinedResults.appendChild(wrapper);
            }

            updateProgress(progress) {
                const progressBar = document.querySelector('.research-progress');
                if (progressBar) {
                    progressBar.style.width = `${progress}%`;
                }
            }

            updateSideContent(sources, images) {
        const sourcesCard = document.querySelector('.sources-card');
        const imagesCard = document.querySelector('.images-card');
                const sourcesList = document.getElementById('sourcesList');
        const imageGrid = document.getElementById('imageGrid');

        // Handle sources
        if (sources && sources.length > 0) {
                    // Filter and deduplicate sources
                    const validSources = sources
                        .filter(source => {
                            return source && 
                                   typeof source === 'object' && 
                                   source.url && 
                                   (source.name || source.title) && 
                                   source.url.startsWith('http');
                        })
                        .reduce((acc, source) => {
                    if (!acc.some(s => s.url === source.url)) {
                        acc.push(source);
                            }
                            return acc;
                }, []);

                    if (validSources.length > 0) {
                sourcesList.innerHTML = this.formatSourcesList(validSources);
                sourcesCard.style.display = 'block';
            } else {
                sourcesCard.style.display = 'none';
            }
        } else {
            sourcesCard.style.display = 'none';
        }

        // Handle images
        if (images && images.length > 0) {
            imageGrid.innerHTML = this.formatImagesGrid(images);
            imagesCard.style.display = 'block';
                } else {
            imagesCard.style.display = 'none';
                }
            }

            async finalizeDisplay(content, sources) {
        const followUpSection = document.querySelector('.follow-up-section');
        if (content && content.trim()) {
            this.contextContent = content;
            this.hideLoader();
            
            // Format the content before displaying
            const formattedContent = this.formatContent(content);
            this.updateStreamingContent(formattedContent);
            
            // Save to history with formatted content
            const currentTopic = document.getElementById('currentTitle').textContent;
            const historyItem = {
                topic: currentTopic,
                date: new Date().toISOString(),
                content: formattedContent, // Save formatted content
                sources: sources || [],
                images: sources ? await this.crawlImagesFromSources(sources) : []
            };
            
            // Update history
            const existingIndex = this.history.findIndex(item => item.topic === currentTopic);
            if (existingIndex !== -1) {
                this.history[existingIndex] = historyItem;
            } else {
                this.history.unshift(historyItem);
            }
            
            // Keep only last 20 items
            if (this.history.length > 20) {
                this.history = this.history.slice(0, 20);
            }
            
            localStorage.setItem('researchHistory', JSON.stringify(this.history));
            
            // Show and enable follow-up section
            if (followUpSection) {
                followUpSection.style.display = 'block';
                followUpSection.style.opacity = '1';
            }
            
            this.generateSuggestedFollowUps(sources);

            if (sources && sources.length > 0) {
                const imageUrls = await this.crawlImagesFromSources(sources);
                this.updateSideContent(sources, imageUrls);
            }
        } else {
            // Hide follow-up section if no content
            if (followUpSection) {
                followUpSection.style.display = 'none';
            }
            this.hideLoader();
            this.combinedResults.innerHTML = '<div class="error-message">No results found. Please try a different query.</div>';
        }
    }

    formatMarkdown(text) {
        if (!text) return '';
        
        return text
            // Headers
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            
            // Lists
            .replace(/^\* (.*$)/gm, '<li>$1</li>')
            .replace(/^- (.*$)/gm, '<li>$1</li>')
            .replace(/^(\d+\.) (.*$)/gm, '<li>$1 $2</li>')
            
            // Wrap lists in ul/ol
            .replace(/(<li>.*<\/li>)\n/g, '<ul>$1</ul>')
            
            // Bold and Italic
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            
            // Code blocks
            .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            
            // Blockquotes
            .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
            
            // Links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
            
            // Paragraphs
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')
            
            // Wrap in paragraph if not already wrapped
            .replace(/^(.+)$/gm, '<p>$1</p>');
    }

    formatSources(sources) {
        if (!sources || !sources.length) return '';
        
        // Filter out invalid sources and deduplicate by URL
        const validSources = sources
            .filter(source => source && source.url && source.name)
            .reduce((acc, source) => {
                if (!acc.some(s => s.url === source.url)) {
                    acc.push(source);
                }
                return acc;
            }, []);

        if (validSources.length === 0) return '';

        return `
            <div class="source-links">
                <h4>Sources</h4>
                ${validSources.map(source => {
                    const domain = new URL(source.url).hostname;
                    const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
                    return `
                        <a href="${source.url}" class="source-item" target="_blank" rel="noopener noreferrer">
                            <img src="${faviconUrl}" class="source-favicon" alt="" 
                                onerror="this.onerror=null; this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🔗</text></svg>'"/>
                            <span>${source.name}</span>
                        </a>
                    `;
                }).join('')}
            </div>
        `;
    }

    setupEventListeners() {
        const followUpInput = document.getElementById('followUpInput');
        const askFollowUpButton = document.getElementById('askFollowUp');

        followUpInput.addEventListener('input', (e) => {
            askFollowUpButton.disabled = !e.target.value.trim();
        });

        askFollowUpButton.addEventListener('click', async () => {
            const query = followUpInput.value.trim();
            if (query) {
                // Save the question to the display
                const questionHtml = `
                    <div class="user-question">
                        <strong>Your question:</strong> ${query}
                    </div>
                `;
                this.combinedResults.innerHTML += questionHtml;

                // Show loading state
                followUpInput.value = '';
                askFollowUpButton.disabled = true;
                askFollowUpButton.innerHTML = 'Thinking...';

                // Handle the follow-up
                await this.handleFollowUp(query);

                // Reset button
                askFollowUpButton.innerHTML = 'Ask';
            }
        });

        // Share button functionality
        document.querySelector('.share-button').addEventListener('click', () => {
            navigator.clipboard.writeText(window.location.href)
                .then(() => alert('URL copied to clipboard!'))
                .catch(err => console.error('Failed to copy URL:', err));
        });

        // Add touch event handling
        followUpInput.addEventListener('touchstart', (e) => {
            e.target.focus();
        });

        // Improve mobile scrolling
        document.querySelectorAll('.sources-card, .image-grid').forEach(element => {
            let touchStartY;
            
            element.addEventListener('touchstart', (e) => {
                touchStartY = e.touches[0].clientY;
            }, { passive: true });

            element.addEventListener('touchmove', (e) => {
                const touchY = e.touches[0].clientY;
                const scrollTop = element.scrollTop;
                const scrollHeight = element.scrollHeight;
                const clientHeight = element.clientHeight;

                if (scrollTop === 0 && touchY > touchStartY) {
                    e.preventDefault();
                }

                if (scrollTop + clientHeight >= scrollHeight && touchY < touchStartY) {
                    e.preventDefault();
                }
            }, { passive: false });
        });

        // Handle orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                window.scrollTo(0, 0);
                this.updateLayout();
            }, 100);
        });
    }

    generateSuggestedFollowUps(sources) {
        const suggestions = sources.reduce((acc, source) => {
            if (source.similar_questions) {
                acc.push(...source.similar_questions);
            }
            return acc;
        }, []).slice(0, 4);

        const suggestedFollows = document.getElementById('suggestedFollows');
        suggestedFollows.innerHTML = suggestions.map(suggestion => 
            `<button onclick="researchManager.conductResearch('${suggestion}')">${suggestion}</button>`
        ).join('');
    }

    async handleFollowUp(query) {
        try {
            const endpoint = 'https://api.paxsenix.biz.id/ai/gemini';
            
            // Prepare the context and query
            let messageText = query;
            if (!this.sessionId) {
                let truncatedContext = this.contextContent;
                if (truncatedContext.length > 1000) {
                    truncatedContext = 
                        truncatedContext.substring(0, 500) + 
                        "\n...[content truncated]...\n" + 
                        truncatedContext.substring(truncatedContext.length - 500);
                }
                messageText = `Previous research summary: ${this.contextContent} Follow-up question: ${query}`;
            }

            const requestBody = {
                model: "gemini-2.0-flash-thinking-exp",
                contents: [
                    {
                        role: "user",
                        parts: [
                            {
                                text: messageText
                            }
                        ]
                    }
                ]
            };

            if (this.sessionId) {
                requestBody.session_id = this.sessionId;
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();
            
            if (data.ok) {
                // Save session ID for future queries
                if (data.session_id) {
                    this.sessionId = data.session_id;
                }
                
                // Get the response text from the message array
                let responseText = '';
                if (data.message && Array.isArray(data.message)) {
                    responseText = data.message.map(msg => msg.text).join('\n');
                }
                
                if (!responseText) {
                    throw new Error('No valid response content found');
                }

                // Update the display with the new response
                const formattedResponse = this.formatMarkdown(responseText);
                this.combinedResults.innerHTML += `
                    <div class="ai-response">
                        ${formattedResponse}
                    </div>
                `;
                
                // If there are sources, crawl images from them
                if (data.sources && data.sources.length > 0) {
                    // Call the new image crawling endpoint
                    const imageUrls = await this.crawlImagesFromSources(data.sources);
                    
                    // Update the display with both sources and images
                    this.updateSideContent(data.sources, imageUrls);
                }
            } else {
                throw new Error(data.message || 'Failed to get response');
            }
        } catch (error) {
            console.error('Follow-up error:', error);
            this.combinedResults.innerHTML += `
                <div class="error-message">
                    Sorry, couldn't get an answer. Please try rephrasing your question.
                </div>
            `;
        }
    }

    // Add new method to crawl images from sources
    async crawlImagesFromSources(sources) {
        try {
            // Filter valid URLs from sources
            const sourceUrls = sources
                .filter(source => source.url)
                .map(source => source.url);

            console.log('Source URLs to crawl:', sourceUrls); // Debug log

            if (sourceUrls.length === 0) {
                console.log('No valid source URLs found'); // Debug log
                return [];
            }

            // Update endpoint to use your domain
            const response = await fetch('/api/crawl-images', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ urls: sourceUrls })
            });

            console.log('Crawler response status:', response.status); // Debug log

            if (!response.ok) {
                throw new Error(`Failed to crawl images: ${response.status}`);
            }

            const data = await response.json();
            console.log('Crawler response data:', data); // Debug log
            return data.images || [];

        } catch (error) {
            console.error('Error crawling images:', error);
            return [];
        }
    }

    showLoader() {
        this.loader.style.display = 'flex';
        this.resultsContainer.style.display = 'none';
    }

    hideLoader() {
        this.loader.style.display = 'none';
        this.resultsContainer.style.display = 'block';
    }

    // Add new methods for image actions
    async downloadImage(url) {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = url.split('/').pop() || 'image';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Error downloading image:', error);
        }
    }

    async copyImageUrl(url) {
        try {
            await navigator.clipboard.writeText(url);
            this.showToast('Image URL copied to clipboard!');
        } catch (error) {
            console.error('Error copying URL:', error);
        }
    }

    showImageModal(url) {
        const modal = document.createElement('div');
        modal.className = 'image-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <img src="${url}" alt="Full size image">
                <div class="modal-actions">
                    <button onclick="window.researchManager.downloadImage('${url}')">Download</button>
                    <button onclick="window.researchManager.copyImageUrl('${url}')">Copy URL</button>
                    <button onclick="this.closest('.image-modal').remove()">Close</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast-message';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // Add new method for layout updates
    updateLayout() {
        const isMobile = window.innerWidth <= 768;
        const sourcesList = document.getElementById('sourcesList');
        const imageGrid = document.getElementById('imageGrid');

        if (isMobile) {
            sourcesList.style.maxHeight = '200px';
            imageGrid.style.maxHeight = '300px';
        } else {
            sourcesList.style.maxHeight = '';
            imageGrid.style.maxHeight = '';
        }
    }

    setupHistoryUI() {
        const historyButton = document.querySelector('.history-button');
        const historyMenu = document.getElementById('historyMenu');
        const historyList = document.getElementById('historyList');
        const clearHistoryBtn = document.querySelector('.clear-history');
        const newResearchBtn = document.querySelector('.new-research');
        const titleSetup = document.getElementById('titleSetup');

        // Toggle history menu
        historyButton.addEventListener('click', (e) => {
            e.stopPropagation();
            historyMenu.classList.toggle('show');
            this.updateHistoryList();
        });

        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!historyMenu.contains(e.target) && !historyButton.contains(e.target)) {
                historyMenu.classList.remove('show');
            }
        });

        // Clear history
        clearHistoryBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all research history?')) {
                this.history = [];
                localStorage.setItem('researchHistory', JSON.stringify(this.history));
                this.updateHistoryList();
            }
        });

        // New research
        newResearchBtn.addEventListener('click', () => {
            this.startNewResearch();
        });
    }

    startNewResearch() {
        const titleSetup = document.getElementById('titleSetup');
        const currentTitle = document.getElementById('currentTitle');
        const welcomeScreen = document.getElementById('welcomeScreen');
        const researchLoader = document.getElementById('researchLoader');
        const resultsContainer = document.getElementById('resultsContainer');
        const sourcesCard = document.querySelector('.sources-card');
        const imagesCard = document.querySelector('.images-card');
        const followUpSection = document.querySelector('.follow-up-section');
        const titleInput = document.querySelector('.title-input');
        
        // Reset UI
        titleSetup.style.display = 'flex';
        currentTitle.style.display = 'none';
        welcomeScreen.style.display = 'block';
        researchLoader.style.display = 'none';
        resultsContainer.style.display = 'none';
        sourcesCard.style.display = 'none';
        imagesCard.style.display = 'none';
        followUpSection.style.display = 'none';
        
        // Clear input and results
        titleInput.value = '';
        this.combinedResults.innerHTML = '';
        document.getElementById('historyMenu').classList.remove('show');

        // Also update URL to remove query parameter
        const url = new URL(window.location);
        url.searchParams.delete('query');
        window.history.pushState({}, '', url);
    }

    updateHistoryList() {
        const historyList = document.getElementById('historyList');
        historyList.innerHTML = this.history.map((item, index) => `
            <div class="history-item" data-index="${index}">
                <div class="history-item-content">
                    <span class="history-topic">${item.topic}</span>
                    <span class="history-date">${new Date(item.date).toLocaleDateString()}</span>
                </div>
                <button class="delete-history" title="Delete" onclick="event.stopPropagation();">
                    <svg viewBox="0 0 24 24" width="16" height="16">
                        <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                </button>
            </div>
        `).join('');

        // Add click handlers
        historyList.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                const research = this.history[index];
                this.loadResearch(research);
            });
        });

        historyList.querySelectorAll('.delete-history').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.history-item').dataset.index);
                this.deleteHistoryItem(index);
            });
        });
    }

    loadResearch(research) {
        const titleSetup = document.getElementById('titleSetup');
        const currentTitle = document.getElementById('currentTitle');
        const sourcesCard = document.querySelector('.sources-card');
        const imagesCard = document.querySelector('.images-card');
        const resultsContainer = document.getElementById('resultsContainer');
        const followUpSection = document.querySelector('.follow-up-section');
        
        // Update URL without reloading
        const url = new URL(window.location);
        url.searchParams.set('query', research.topic);
        window.history.pushState({}, '', url);
        
        // Update UI
        titleSetup.style.display = 'none';
        currentTitle.textContent = research.topic;
        currentTitle.style.display = 'block';
        
        document.getElementById('historyMenu').classList.remove('show');
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('researchLoader').style.display = 'none';
        
        // Reset the display
        this.combinedResults.innerHTML = '';
        sourcesCard.style.display = 'none';
        imagesCard.style.display = 'none';
        
        // Load saved content
        if (research.content) {
            resultsContainer.style.display = 'block';
            // Don't format again if already formatted
            if (research.content.includes('combined-content')) {
                this.combinedResults.innerHTML = research.content;
            } else {
                this.combinedResults.innerHTML = this.formatContent(research.content);
            }
            
            // Show follow-up section
            if (followUpSection) {
                followUpSection.style.display = 'block';
                followUpSection.style.opacity = '1';
            }
            
            // Update side content if available
            if (research.sources && research.sources.length > 0) {
                this.updateSideContent(research.sources, research.images || []);
            }
        } else {
            // If somehow we don't have content, conduct new research
            this.conductResearch(research.topic);
        }
    }

    formatContent(content) {
        // First apply markdown formatting if needed
        content = this.formatMarkdown(content);
        
        // Wrap the entire content in combined-content class
        content = `<div class="combined-content">${content}</div>`;
        
        // Add proper paragraph spacing
        content = content.replace(/<\/p><p>/g, '</p><br><p>');
        
        // Add spacing after headers
        content = content.replace(/<\/h[1-3]>/g, '$&<br>');
        
        // Add spacing after lists
        content = content.replace(/<\/ul>/g, '$&<br>');
        content = content.replace(/<\/ol>/g, '$&<br>');
        
        return content;
    }

    deleteHistoryItem(index) {
        if (confirm('Delete this research from history?')) {
            this.history.splice(index, 1);
            localStorage.setItem('researchHistory', JSON.stringify(this.history));
            this.updateHistoryList();
        }
    }

    // Add method to handle browser back/forward
    setupBrowserNavigation() {
        window.addEventListener('popstate', () => {
            const urlParams = new URLSearchParams(window.location.search);
            const query = urlParams.get('query');
            
            if (query) {
                const existingResearch = this.history.find(item => 
                    item.topic.toLowerCase() === query.toLowerCase());
                if (existingResearch) {
                    this.loadResearch(existingResearch);
                } else {
                    this.conductResearch(query);
                }
            } else {
                this.startNewResearch();
            }
        });
    }

    formatSourcesList(sources) {
        return sources.map(source => {
            const domain = new URL(source.url).hostname;
            const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
            return `
                <a href="${source.url}" class="source-item-compact" target="_blank" rel="noopener noreferrer">
                    <img src="${faviconUrl}" class="source-favicon" alt="" 
                        onerror="this.onerror=null; this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🔗</text></svg>'"/>
                    <div class="source-info">
                        <span class="source-name">${source.name || source.title}</span>
                        <span class="source-domain">${domain}</span>
                    </div>
                </a>
            `;
        }).join('');
    }

    formatImagesGrid(images) {
        return images.map(imageUrl => `
            <div class="image-item">
                <img src="${imageUrl}" 
                     alt="Related content" 
                     loading="lazy" 
                     onerror="this.parentElement.style.display='none'"
                     onclick="window.researchManager.showImageModal('${imageUrl}')"
                />
                <div class="image-actions">
                    <button onclick="window.researchManager.downloadImage('${imageUrl}')" title="Download">
                        <svg viewBox="0 0 24 24" width="24" height="24">
                            <path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                        </svg>
                    </button>
                    <button onclick="window.researchManager.copyImageUrl('${imageUrl}')" title="Copy URL">
                        <svg viewBox="0 0 24 24" width="24" height="24">
                            <path fill="currentColor" d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                        </svg>
                    </button>
                </div>
            </div>
        `).join('');
    }
}