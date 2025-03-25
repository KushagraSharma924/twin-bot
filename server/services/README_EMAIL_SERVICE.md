# Email Service

This service provides functionality to fetch emails from a user's email account, list mailboxes, mark emails as read, move emails, and get mailbox statistics.

## Setup

1. Make sure to install the required dependencies:
   ```bash
   npm install imapflow mailparser
   ```

2. Run the database migration script to create the email_metadata table:
   ```bash
   psql -U your_supabase_username -d your_supabase_database < email-schema.sql
   ```

## Usage

### Client-side configuration

To use the email service, you need to provide the user's email credentials in the following format:

```javascript
const credentials = {
  host: 'imap.example.com',  // IMAP server hostname
  port: 993,                 // IMAP server port (default: 993 for secure IMAP)
  secure: true,              // Use secure connection (default: true)
  user: 'user@example.com',  // User email address
  password: 'your-password'  // User email password or app-specific password
};
```

### Common IMAP server settings

| Provider       | IMAP Server                  | Port  |
|----------------|------------------------------|-------|
| Gmail          | imap.gmail.com               | 993   |
| Outlook/Hotmail| outlook.office365.com        | 993   |
| Yahoo Mail     | imap.mail.yahoo.com          | 993   |
| AOL            | imap.aol.com                 | 993   |
| Zoho Mail      | imap.zoho.com                | 993   |
| ProtonMail     | imap.protonmail.ch           | 993   |
| iCloud         | imap.mail.me.com             | 993   |

**Note:** For services like Gmail, you may need to generate an app-specific password instead of using the account password directly.

### API Endpoints

#### Fetch Emails

```javascript
// Example client-side code
const response = await fetch('/api/email/fetch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`
  },
  body: JSON.stringify({
    credentials: {
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      user: 'user@gmail.com',
      password: 'app-password-here'
    },
    options: {
      limit: 20,           // Number of emails to fetch (default: 20)
      mailbox: 'INBOX',    // Mailbox to fetch from (default: 'INBOX')
      unseen: false        // Fetch only unseen messages (default: false)
    },
    saveMetadata: true     // Save email metadata to the database (optional)
  })
});

const data = await response.json();
const emails = data.emails;
```

#### List Mailboxes

```javascript
const response = await fetch('/api/email/mailboxes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`
  },
  body: JSON.stringify({
    credentials: {
      // Email credentials
    }
  })
});

const data = await response.json();
const mailboxes = data.mailboxes;
```

#### Mark Email as Read

```javascript
await fetch('/api/email/mark-read', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`
  },
  body: JSON.stringify({
    credentials: {
      // Email credentials
    },
    mailbox: 'INBOX',
    uid: 12345  // Email UID
  })
});
```

#### Move Email to Another Mailbox

```javascript
await fetch('/api/email/move', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`
  },
  body: JSON.stringify({
    credentials: {
      // Email credentials
    },
    sourceMailbox: 'INBOX',
    targetMailbox: 'Archive',
    uid: 12345  // Email UID
  })
});
```

#### Get Mailbox Statistics

```javascript
const response = await fetch('/api/email/stats', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${userToken}`
  },
  body: JSON.stringify({
    credentials: {
      // Email credentials
    },
    mailbox: 'INBOX'  // Optional, defaults to 'INBOX'
  })
});

const data = await response.json();
const stats = data.stats;  // { total: 100, unseen: 5 }
```

## Security Considerations

1. **Never store user email passwords in your database**. The credentials should be provided by the client and used only for the duration of the API request.

2. **Encourage users to use app-specific passwords** instead of their main account passwords, especially for services like Gmail.

3. **Use HTTPS** for all API requests to ensure credentials are encrypted during transmission.

4. Consider implementing **OAuth2 authentication** for services that support it (like Gmail) instead of password-based authentication.

## Error Handling

The email service functions throw errors that are caught by the API routes and returned as JSON responses with appropriate HTTP status codes. Common errors include:

- Invalid credentials
- Connection failures
- Mailbox not found
- Permission issues

Always handle these errors gracefully in your client-side code.

## Additional Resources

- [ImapFlow Documentation](https://imapflow.com/)
- [Mailparser Documentation](https://nodemailer.com/extras/mailparser/)
- [IMAP Protocol RFC](https://tools.ietf.org/html/rfc3501) 