import express from 'express';
import authRoutes from './auth.js';
import emailRoutes from './email.js';
import aiRoutes from './ai.js';
import calendarRoutes from './calendar.js';
import conversationRoutes from './conversation.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/email', emailRoutes);
router.use('/ai', aiRoutes);
router.use('/calendar', calendarRoutes);
router.use('/conversations', conversationRoutes);

export default router; 