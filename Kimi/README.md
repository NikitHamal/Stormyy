# Kimi Chat Interface

A modern chat interface for interacting with the Kimi AI model.

## Setup Instructions

### Quick Start

1. Install dependencies:
   ```
   npm install
   ```

2. Start the server:
   ```
   npm start
   ```

3. Open the interface in your browser:
   ```
   http://localhost:3000
   ```

### Troubleshooting

If you see `Cannot find module 'express'` or similar errors:

```
npm install express body-parser cors node-fetch@2
```

**Important:** Make sure to use version 2 of node-fetch, as version 3 requires ES modules.

### Using the API Directly

If you prefer not to use the proxy server:

1. Open the app in your browser by directly opening the `index.html` file
2. Go to Settings and uncheck "Use Proxy Server"
3. Save the settings

## Features

- Real-time chat with Kimi AI
- Settings customization (model selection, web search)
- Local storage for chat history
- View raw API responses
- Beautiful UI with animations
- Loading indicators and reasoning visualization

## API Configuration

In the Settings modal, you can configure:

- Model selection (Kimi or K1.5)
- Web search capabilities
- Research mode
- Device ID, Session ID, and Traffic ID
- Proxy server options 