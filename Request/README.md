# Kimi API Proxy Server

This project provides a proxy server to access the Kimi API from your browser while avoiding CORS restrictions.

## Setup Instructions

1. Make sure you have [Node.js](https://nodejs.org/) installed
2. Open a terminal in the `Request` folder
3. Install dependencies:
   ```
   npm install
   ```
4. Start the proxy server:
   ```
   node server.js
   ```
5. The server will run at http://localhost:3000

## How to Use

1. The proxy server redirects requests to the Kimi API
2. Open the request interface at: http://localhost:3000/request.html
3. Go to the Kimi tab in the interface
4. Set your cookies in the "Cookies & Cloudflare" tab if needed
5. For the Kimi API, use the following:
   - Target URL: `https://kimi.moonshot.cn/api/chat-messages`
   - Method: POST
   - Headers: (The necessary headers are set automatically)
   - Body:
     ```json
     {
       "prompt": "Your prompt here",
       "stream": true
     }
     ```

## Troubleshooting

If you encounter issues:

1. Check the browser console for error messages
2. Verify that the proxy server is running
3. Make sure you're using the correct API endpoint format
4. Check that your request body is properly formatted
5. The Kimi API might have rate limits or require authentication in some cases 