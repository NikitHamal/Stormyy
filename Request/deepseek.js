// DeepSeek API handler
const DEEPSEEK_API = {
    baseUrl: 'http://localhost:3000/deepseek-proxy',
    cookies: 'smidV2=2025012809360624ede068faadb34f345bb58c843a557c0053d9fe4f7e4f780; .thumbcache_6b2e5483f9d858d7c661c5e276b6a6ae=c243jEXUIBRIY5HYCTTw171S3aydFrtsDe5a7LnzkeD6hXcRqBeXnm+JPh1gHICvcVQScijTBS9STQpee7ru/A%3D%3D; intercom-device-id-guh50jw4=9ffa8c24-a7ac-4962-8545-fe7c64428ae6; Hm_lvt_1fff341d7a963a4043e858ef0e19a17c=1738417634,1738503069,1738567588,1738930569; Hm_lvt_fb5acee01d9182aabb2b61eb816d24ff=1738926232,1739202462,1739540408,1739620744; HWWAFSESTIME=1740999984773; HWWAFSESID=4d64ec3a6232bcc512d; ds_session_id=b3c69661780148f484ab1ee19df738f1; cf_clearance=YEUodtbUz5U2p6qEQJlczoqLabYekJvxH122DLkWmJ0-1741003110-1.2.1.1-0ZyAJihQht2CCyfb99bYBkEbaXsgSpW4vThcYXeDoBGJQsHVVjosyz5WAhAqImsZdx3WcUqeYemNziw.EOo5fDajXwkPxo5PzAQAKuExKm9YX.XYG6SbDcr8dNDnYEq2KwIH0LFSBnLQsEkO.If5owZijgolU7hGOFfhAJC.7N6ZGt8O_4TZiYMlO6eaIGNRnb2UH_._VrJouK_wYMW3yKRl7IjOKqcAOSYsIA4KyWSWbX99WuySCZ8RCH84hvMsumqYu3f0PM5arXVJyMDi1otuF04ZPxPbPiDVWGuZ32hwN4OuphSHuMrhyORDR3eD.P1CRmvr4L8_1xItFZi2f995m4TGUQaeXZFK8b6eB_hxP.lXCcYD538mOuisqywIBF9kOEVGqnJycuYWOPggm2n8hmWWQ1Py0dHd2L.OtrY; intercom-session-guh50jw4=YlBtU3ZHKytuY2F1blZpdnYxV2FFWEFjY0JFb3RYakNBQlppUTZnd0NTVFZHbFdXRDA3Qk1XUWJBM0ZjVHNwcnlRVzBlUlJMdWhueFZzUWN4Q1JRdmlsSXVyVGNjZHV1Sm05OXMzazQ5MEE9LS12OHN2M0NQUlZxUXh0d3ExeFByYk93PT0=--2693c4d17ee24b9d354c12fc6b9df613d21b4eee; __cf_bm=q6LNO2gaS4oWhvdnmSvfX5L1kuWWH3VWMTqBgyqj3m8-1741007657-1.0.1.1-8wKAya2SXScAfm0lJJJoVxQFn1YX0SQfg7QdNMV4FYk4HsYxLGSjrgeCzHhNd5p4DzhvlbwAAqgPSMe04IRGG4TGHIzj.zbS2QccNKHnon0',
    authToken: 'AUXtcPXwKSNpg/gCziP8a3TKGyJn/X88NUxR41mLkLonXl7kqUIcf9rtaepkVuqU',
    defaultHeaders: {
        'accept': '*/*',
        'content-type': 'application/json',
        'target-url': 'https://chat.deepseek.com/api/v0'
    },

    // Initialize session data
    sessionData: {
        id: null,
        created: null,
        parent_message_id: null
    },

    // Get PoW challenge
    async getPowChallenge(targetPath) {
        const headers = {
            ...this.defaultHeaders,
            'target-url': 'https://chat.deepseek.com/api/v0/chat/create_pow_challenge'
        };

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ target_path: targetPath })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data?.data?.biz_data?.challenge;
        } catch (error) {
            console.error('Error getting PoW challenge:', error);
            throw error;
        }
    },

    // Solve PoW challenge
    async solveChallenge(challenge) {
        // This is where we'll implement the DeepSeekHashV1 algorithm
        // For now, we'll use a Web Worker to do the computation
        return new Promise((resolve, reject) => {
            const worker = new Worker('pow-worker.js');
            worker.postMessage(challenge);
            worker.onmessage = (e) => {
                if (e.data.error) {
                    reject(new Error(e.data.error));
                } else {
                    resolve(e.data.solution);
                }
            };
            worker.onerror = (e) => reject(new Error('Worker error: ' + e.message));
        });
    },

    // Create a new chat session
    async createSession() {
        const headers = {
            ...this.defaultHeaders,
            'target-url': 'https://chat.deepseek.com/api/v0/chat_session/create'
        };

        try {
            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ character_id: null })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data?.data?.biz_data?.id) {
                this.sessionData = {
                    id: data.data.biz_data.id,
                    created: Date.now(),
                    parent_message_id: null
                };
                localStorage.setItem('deepseek_session', JSON.stringify(this.sessionData));
                return this.sessionData;
            }
            throw new Error('Failed to create session');
        } catch (error) {
            console.error('Error creating DeepSeek session:', error);
            throw error;
        }
    },

    // Get current session info
    async getSessionInfo() {
        try {
            const storedSession = localStorage.getItem('deepseek_session');
            if (storedSession) {
                this.sessionData = JSON.parse(storedSession);
            }
            return this.sessionData;
        } catch (error) {
            console.error('Error getting session info:', error);
            return this.sessionData;
        }
    },

    // Send a chat message and get streaming response
    async sendMessage(message, options = {}) {
        const {
            forceNewSession = false,
            useSearch = true,
            useTools = true
        } = options;

        try {
            // Create new session if needed
            if (forceNewSession || !this.sessionData.id) {
                await this.createSession();
            }

            const headers = {
                ...this.defaultHeaders,
                'accept': 'text/event-stream',
                'target-url': 'https://chat.deepseek.com/api/v0/chat/completion'
            };

            const chatData = {
                messages: [{
                    role: 'user',
                    content: message
                }],
                chat_session_id: this.sessionData.id,
                use_search: useSearch,
                use_tools: useTools
            };

            if (this.sessionData.parent_message_id && !forceNewSession) {
                chatData.parent_message_id = this.sessionData.parent_message_id;
            }

            // Get and solve PoW challenge first
            const challenge = await this.getPowChallenge('/api/v0/chat/completion');
            if (challenge) {
                const solution = await this.solveChallenge(challenge);
                chatData.pow_solution = solution;
            }

            const response = await fetch(this.baseUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(chatData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            return {
                async *[Symbol.asyncIterator]() {
                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            
                            if (done) {
                                if (buffer.length > 0) {
                                    yield processEventData(buffer);
                                }
                                return;
                            }

                            buffer += decoder.decode(value, { stream: true });
                            const lines = buffer.split('\n');
                            
                            buffer = lines.pop() || '';

                            for (const line of lines) {
                                if (line.startsWith('data: ')) {
                                    const eventData = processEventData(line.slice(6));
                                    if (eventData.message_id) {
                                        this.sessionData.parent_message_id = eventData.message_id;
                                        localStorage.setItem('deepseek_session', JSON.stringify(this.sessionData));
                                    }
                                    yield eventData;
                                }
                            }
                        }
                    } finally {
                        reader.releaseLock();
                    }
                }
            };
        } catch (error) {
            console.error('Error sending message to DeepSeek:', error);
            throw error;
        }
    }
};

// Helper function to process event data
function processEventData(data) {
    try {
        return JSON.parse(data);
    } catch (error) {
        console.error('Error parsing event data:', error);
        return { error: 'Failed to parse event data' };
    }
}

// Export the API handler
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DEEPSEEK_API;
} else {
    window.DEEPSEEK_API = DEEPSEEK_API;
} 