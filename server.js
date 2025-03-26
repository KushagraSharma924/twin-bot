import express from 'express';
import cors from 'cors';
import { config } from './server/config/index.js';
import './server/db/initialize.js'; // Run database initialization

// Import middleware
import { authMiddleware, adminMiddleware, emailMiddleware } from './server/middleware/auth.js';

// Import routes
import authRoutes from './server/routes/auth.js';
import emailRoutes from './server/routes/email.js';
import aiRoutes from './server/routes/ai.js';
import calendarRoutes from './server/routes/calendar.js';

// Create Express app
const app = express();
const PORT = config.port;

// Middleware
app.use(cors());
app.use(express.json());

// Static files
app.use(express.static('public'));

// Apply auth middleware to protected routes
app.use('/api/auth', authRoutes);
app.use('/api/email', emailMiddleware, emailRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);
app.use('/api/calendar', authMiddleware, calendarRoutes);
app.use('/api/twin', authMiddleware);
app.use('/api/browser', authMiddleware);
app.use('/api/user', authMiddleware);
app.use('/api/admin', adminMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: process.env.npm_package_version || '1.0.0' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${config.env}`);
  
  // Display available routes
  console.log('\nAvailable routes:');
  console.log('- GET /health');
  console.log('- POST /api/auth/login');
  console.log('- POST /api/auth/register');
  console.log('- GET /api/auth/profile');
  console.log('- POST /api/email/fetch');
  console.log('- POST /api/email/mailboxes');
  console.log('- GET /api/email/config');
  console.log('- POST /api/ai/gemini');
  console.log('- POST /api/ai/openai');
  console.log('- POST /api/ai/embed');
  console.log('- POST /api/calendar/create-event');
  console.log('- GET /api/calendar/events');
  console.log('- GET /api/calendar/holidays');
}); 