class ResearchManager {
            constructor() {
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

                const urlParams = new URLSearchParams(window.location.search);
                const query = urlParams.get('query');
                if (query) {
                    this.conductResearch(query);
                }
                
                this.setupEventListeners();
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

            async fetchImages(query) {
                try {
                    const response = await fetch(`https://api.paxsenix.biz.id/ai/images?text=${encodeURIComponent(query)}`);
                    const data = await response.json();
                    return data.images || [];
                } catch (error) {
                    console.error('Error fetching images:', error);
                    return [];
                }
            }

            async conductResearch(query) {
                this.showLoader();
                this.resultsContainer.style.display = 'block';
                this.combinedResults.innerHTML = '<div class="generating-text">Generating response...</div>';
                this.activeResponses = 0;
                
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
                const wrapper = document.createElement('div');
                wrapper.className = 'combined-content fade-in';
                wrapper.innerHTML = content;
                
                // Remove the "Generating" text if it exists
                const generatingText = this.combinedResults.querySelector('.generating-text');
                if (generatingText) {
                    generatingText.remove();
                }
                
                this.combinedResults.innerHTML = '';
                this.combinedResults.appendChild(wrapper);
            }

            updateProgress(progress) {
                const progressBar = document.querySelector('.research-progress');
                if (progressBar) {
                    progressBar.style.width = `${progress}%`;
                }
            }

            updateSideContent(sources, images) {
                // Update sources list
                const sourcesList = document.getElementById('sourcesList');
                if (sourcesList && sources && sources.length > 0) {
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
                            const normalizedSource = {
                                url: source.url,
                                name: source.name || source.title || new URL(source.url).hostname,
                                domain: new URL(source.url).hostname
                            };
                            
                            if (!acc.some(s => s.url === normalizedSource.url)) {
                                acc.push(normalizedSource);
                            }
                            return acc;
                        }, [])
                        // Sort sources by domain for better organization
                        .sort((a, b) => a.domain.localeCompare(b.domain));

                    if (validSources.length > 0) {
                        sourcesList.innerHTML = validSources.map(source => {
                            const faviconUrl = `https://www.google.com/s2/favicons?domain=${source.domain}&sz=32`;
                            return `
                                <a href="${source.url}" class="source-item-compact" target="_blank" rel="noopener noreferrer">
                                    <img src="${faviconUrl}" class="source-favicon" alt="" 
                                        onerror="this.onerror=null; this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🔗</text></svg>'"/>
                                    <div class="source-info">
                                        <span class="source-name">${source.name}</span>
                                        <span class="source-domain">${source.domain}</span>
                                    </div>
                                </a>
                            `;
                        }).join('');
                        
                        document.querySelector('.sources-card').style.display = 'block';
                    }
                }

                // Update images grid
                const imageGrid = document.getElementById('imageGrid');
                if (imageGrid && images.length > 0) {
                    imageGrid.innerHTML = images.map(image => `
                        <div class="image-item">
                            <img src="${image.url}" alt="${image.title || 'Related image'}" 
                                loading="lazy" onerror="this.style.display='none'"/>
                        </div>
                    `).join('');
                }
            }

            async finalizeDisplay(content, sources) {
                // Save the content for context
                this.contextContent = content;
                
                // Hide loader and progress
                this.hideLoader();
                
                // Update final content without sources (they'll be in sidebar)
                this.updateStreamingContent(content);
                
                // Enable follow-up section
                document.querySelector('.follow-up-section').style.opacity = '1';
                
                // Generate suggested follow-ups
                this.generateSuggestedFollowUps(sources);

                // Update side content with sources
                const urlParams = new URLSearchParams(window.location.search);
                const query = urlParams.get('query');
                if (query) {
                    const images = await this.fetchImages(query);
                    this.updateSideContent(sources, images);
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
                        
                        // Update sources if any
                        if (data.sources && data.sources.length > 0) {
                            this.updateSideContent(data.sources, []);
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

            showLoader() {
                this.loader.style.display = 'flex';
                this.resultsContainer.style.display = 'none';
            }

            hideLoader() {
                this.loader.style.display = 'none';
                this.resultsContainer.style.display = 'block';
            }
        }

        const researchManager = new ResearchManager();
        window.researchManager = researchManager;