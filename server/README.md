# Server Architecture

## Directory Structure

- **config/** - Configuration settings and environment variables
- **controllers/** - Business logic for routes
- **db/** - Database setup and schema files
- **middleware/** - Express middleware functions
- **routes/** - API route definitions
- **services/** - Reusable service modules for business logic
- **utils/** - Utility/helper functions
- **server.js** - Main application entry point

## Key Components

### Config

The `config/index.js` file centralizes all configuration settings and environment variables. It exports:
- Configuration objects for different services
- Initialized clients (Supabase, OAuth)

### Database

The `db/initialize.js` file handles all database table creation and verification. It ensures the application has all required tables with proper constraints.

### Middleware

The `middleware/auth.js` file contains:
- Regular authentication middleware
- Admin-specific authentication middleware
- Email route middleware (with OAuth callback bypass)

### Routes

Each route file defines a specific set of API endpoints:
- `routes/auth.js` - Authentication, user management, profiles
- `routes/email.js` - Email fetching, mailboxes, OAuth flows
- `routes/ai.js` - AI text generation and embeddings
- `routes/calendar.js` - Calendar events and holidays

### Services

Service modules contain reusable business logic:
- `services/emailService.js` - Email fetching, IMAP connections
- `services/calendarService.js` - Calendar integration with Google Calendar
- `services/aiService.js` - AI services with Gemini and OpenAI
- `services/supabaseService.js` - Database operations
- `services/reinforcementLearningService.js` - ML/RL functionality

## Ollama Integration

The AI service now supports using Ollama LLM for all AI functions. This allows you to run the AI model locally instead of relying on cloud-based services like Google Gemini.

### Setup Ollama

1. Install Ollama by following instructions at [https://ollama.ai/](https://ollama.ai/)
2. Start the Ollama service locally
3. Pull a model (e.g., `ollama pull llama3`)

### Configuration

Configure the Ollama settings in the `.env` file:

```
# Ollama Configuration
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3
```

- `OLLAMA_HOST`: The URL where your Ollama server is running
- `OLLAMA_MODEL`: The name of the model you want to use (must be pulled locally)

### Available Models

You can use any model that Ollama supports, such as:
- llama3
- mistral
- vicuna
- gemma
- etc.

To use a different model, just update the `OLLAMA_MODEL` environment variable or pull a new model with `ollama pull <model-name>`.

## Running the Server

```bash
# Install dependencies
npm install

# Start the server
node server.js
```

The server will be available at http://localhost:5002 by default.