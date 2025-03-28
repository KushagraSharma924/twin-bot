import express from 'express';
import authRoutes from './auth.js';
import emailRoutes from './email.js';
import aiRoutes from './ai.js';
import calendarRoutes from './calendar.js';
import conversationRoutes from './conversation.js';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

router.use('/auth', authRoutes);
router.use('/email', emailRoutes);
router.use('/ai', aiRoutes);
router.use('/calendar', calendarRoutes);
router.use('/conversations', conversationRoutes);

// Make sure static files are served
router.use(express.static(path.join(__dirname, '../public')));

export default router; 