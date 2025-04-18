# Chatbot Server

A modern Node.js server application for managing email retrieval and interaction with AI services.

## Project Structure

```
/chatbot
├── server.js              # Main server entry point
├── server/                # Server code
│   ├── config/            # Configuration settings
│   ├── controllers/       # Business logic controllers
│   ├── db/                # Database related code
│   │   └── schemas/       # SQL schema files
│   ├── middleware/        # Express middleware
│   ├── routes/            # API routes definitions
│   │   ├── auth.js        # Authentication routes
│   │   ├── email.js       # Email routes
│   │   ├── calendar.js    # Calendar routes
│   │   └── ai.js          # AI routes
│   ├── services/          # Service modules
│   │   ├── emailService.js      # Email functionality
│   │   ├── calendarService.js   # Calendar functionality
│   │   ├── aiService.js         # AI functionality
│   │   └── ...            # Other service modules
│   └── utils/             # Utility functions
└── public/                # Static files for frontend
```

## Features

- OAuth-based email authentication
- Email fetching via IMAP
- Mailbox management
- Calendar integration with Google Calendar
- AI integration with OpenAI and Google Gemini

## API Endpoints

- **Authentication**
  - `/api/auth/login` - User login
  - `/api/auth/register` - User registration
  - `/api/auth/profile` - Get/update user profile

- **Email**
  - `/api/email/fetch` - Fetch emails from mailbox
  - `/api/email/mailboxes` - List available mailboxes
  - `/api/email/oauth2/authorize` - Start OAuth2 flow
  - `/api/email/oauth2/callback` - OAuth2 callback
  - `/api/email/config` - Get email configuration

- **Calendar**
  - `/api/calendar/create-event` - Create a calendar event
  - `/api/calendar/events` - Get calendar events
  - `/api/calendar/holidays` - Get holidays

- **AI**
  - `/api/ai/gemini` - Generate text with Google Gemini
  - `/api/ai/openai` - Generate text with OpenAI
  - `/api/ai/embed` - Create text embeddings

## Getting Started

1. Install dependencies:
   ```
   npm install
   ```

2. Configure environment variables:
   ```
   cp server/.env.example server/.env
   ```

3. Start the server:
   ```
   node server.js
   ```

The server will be available at http://localhost:5002.