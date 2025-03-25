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

### Services

Service modules contain reusable business logic:
- `services/emailService.js` - Email fetching, IMAP connections
- `services/calendarService.js` - Calendar integration
- `services/nlpService.js` - Natural language processing
- `services/supabaseService.js` - Database operations
- `services/reinforcementLearningService.js` - ML/RL functionality

## Running the Server

```bash
# Install dependencies
npm install

# Start the server
node server.js
```

The server will be available at http://localhost:5002 by default.