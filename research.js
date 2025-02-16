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

        // Get query from URL and start research
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('query');
        if (query) {
            this.conductResearch(query);
        }
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

            if (data.ok) {
                return {
                    ok: true,
                    result: data.answer || data.result || data.text || JSON.stringify(data)
                };
            } else {
                throw new Error(data.message || 'Invalid response from API');
            }
        } catch (error) {
            console.error(`Error fetching from ${endpoint}:`, error);
            return { 
                ok: false,
                error: error.message || 'Failed to fetch results' 
            };
        }
    }

    async conductResearch(query) {
        this.showLoader();
        this.resultsContainer.style.display = 'none';

        try {
            // Make API calls sequentially to avoid overwhelming the server
            const results = [];
            for (const [key, endpoint] of Object.entries(this.apiEndpoints)) {
                try {
                    const data = await this.fetchFromAPI(endpoint, query);
                    results.push({ source: key, data });
                    if (data.ok) {
                        console.log(`Got valid result from ${key}`);
                    }
                } catch (error) {
                    console.error(`Error with ${key}:`, error);
                    results.push({ 
                        source: key, 
                        data: { ok: false, error: error.message } 
                    });
                }
            }

            const hasValidResults = results.some(result => result.data.ok);
            
            if (hasValidResults) {
                this.displayResults(results);
            } else {
                throw new Error('No valid results from any API');
            }
        } catch (error) {
            console.error('Research error:', error);
            this.handleError(error.message);
            // Go back to previous page if no valid results
            setTimeout(() => {
                window.history.back();
            }, 2000);
        } finally {
            this.hideLoader();
        }
    }

    handleError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = `Research failed: ${message}. Returning to chat...`;
        this.resultsContainer.innerHTML = '';
        this.resultsContainer.appendChild(errorDiv);
    }

    showLoader() {
        this.loader.style.display = 'flex';
    }

    hideLoader() {
        this.loader.style.display = 'none';
        this.resultsContainer.style.display = 'block';
    }

    displayResults(results) {
        results.forEach(({ source, data }) => {
            const container = document.getElementById(`${source}Results`);
            if (container) {
                const content = container.querySelector('.content');
                content.innerHTML = this.formatResult(data);
                container.classList.add('fade-in');
            }
        });
    }

    formatResult(data) {
        if (!data.ok || data.error) {
            return `<p class="error">${data.error || 'Failed to get results'}</p>`;
        }
        // Format the result with proper line breaks and styling
        return `
            <div class="result-content">
                ${data.result.replace(/\n/g, '<br>')}
                ${this.formatSources(data.sources)}
            </div>
        `;
    }

    formatSources(sources) {
        if (!sources || !Array.isArray(sources)) return '';
        return `
            <div class="sources-section">
                <h4>Sources:</h4>
                <ul>
                    ${sources.map(source => `
                        <li><a href="${source.url}" target="_blank">${source.name}</a></li>
                    `).join('')}
                </ul>
            </div>
        `;
    }
}

// Initialize research manager
const researchManager = new ResearchManager();
window.researchManager = researchManager; 