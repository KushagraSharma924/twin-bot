/**
 * Research API Routes
 * Handles endpoints for research automation features
 */

import express from 'express';
import { researchService } from '../services/researchService.js';
import { authMiddleware } from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * @route GET /api/research/documents
 * @desc Get research documents for the current user
 * @access Private
 */
router.get('/documents', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const options = {
      type: req.query.type,
      category: req.query.category,
      query: req.query.query,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      sort: req.query.sort || 'dateAdded',
      order: req.query.order || 'desc'
    };

    const result = await researchService.getResearchDocuments(userId, options);
    return res.json(result);
  } catch (error) {
    logger.error('Error fetching research documents', { error: error.message });
    return res.status(500).json({ error: 'Error fetching research documents' });
  }
});

/**
 * @route GET /api/research/documents/:id
 * @desc Get a specific research document
 * @access Private
 */
router.get('/documents/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const documentId = req.params.id;

    const document = await researchService.getResearchDocumentById(userId, documentId);
    
    if (!document) {
      return res.status(404).json({ error: 'Research document not found' });
    }

    return res.json(document);
  } catch (error) {
    logger.error('Error fetching research document', { error: error.message });
    return res.status(500).json({ error: 'Error fetching research document' });
  }
});

/**
 * @route POST /api/research/realtime
 * @desc Start a real-time research process
 * @access Private
 */
router.post(
  '/realtime',
  authMiddleware,
  [
    body('query').notEmpty().withMessage('Research query is required'),
    body('sources').isArray({ min: 1 }).withMessage('At least one source is required'),
    body('maxResults').optional().isInt({ min: 1, max: 100 }).withMessage('Max results must be between 1 and 100')
  ],
  async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user.id;
      const { query, sources, maxResults, category } = req.body;

      const processId = await researchService.startRealtimeResearch(
        userId,
        query,
        sources,
        maxResults || 10,
        category
      );

      return res.json({ processId });
    } catch (error) {
      logger.error('Error starting real-time research', { error: error.message });
      return res.status(500).json({ error: 'Error starting real-time research' });
    }
  }
);

/**
 * @route POST /api/research/synthesis
 * @desc Start a knowledge synthesis process
 * @access Private
 */
router.post(
  '/synthesis',
  authMiddleware,
  [
    body('topic').notEmpty().withMessage('Synthesis topic is required'),
    body('documents').optional().isArray().withMessage('Documents must be an array'),
    body('depth').optional().isIn(['low', 'medium', 'high']).withMessage('Depth must be low, medium, or high')
  ],
  async (req, res) => {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user.id;
      const { topic, documents, depth, category } = req.body;

      const processId = await researchService.startKnowledgeSynthesis(
        userId,
        topic,
        documents || [],
        depth || 'medium',
        category
      );

      return res.json({ processId });
    } catch (error) {
      logger.error('Error starting knowledge synthesis', { error: error.message });
      return res.status(500).json({ error: 'Error starting knowledge synthesis' });
    }
  }
);

/**
 * @route GET /api/research/process/:id
 * @desc Get status of a research process
 * @access Private
 */
router.get('/process/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const processId = req.params.id;

    const result = await researchService.getProcessStatus(userId, processId);
    
    if (result.status === 'not_found') {
      return res.status(404).json({ error: 'Research process not found' });
    }

    return res.json(result);
  } catch (error) {
    logger.error('Error fetching research process status', { error: error.message });
    return res.status(500).json({ error: 'Error fetching research process status' });
  }
});

/**
 * @route PUT /api/research/documents/:id
 * @desc Update a research document
 * @access Private
 */
router.put('/documents/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const documentId = req.params.id;
    const updates = req.body;

    // Remove any protected fields from updates
    delete updates.id;
    delete updates.user_id;
    delete updates.process_id;
    delete updates.created_at;

    const document = await researchService.updateResearchDocument(userId, documentId, updates);
    
    if (!document) {
      return res.status(404).json({ error: 'Research document not found' });
    }

    return res.json(document);
  } catch (error) {
    logger.error('Error updating research document', { error: error.message });
    return res.status(500).json({ error: 'Error updating research document' });
  }
});

/**
 * @route DELETE /api/research/documents/:id
 * @desc Delete a research document
 * @access Private
 */
router.delete('/documents/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const documentId = req.params.id;

    await researchService.deleteResearchDocument(userId, documentId);
    
    return res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting research document', { error: error.message });
    return res.status(500).json({ error: 'Error deleting research document' });
  }
});

/**
 * @route GET /api/research/interests
 * @desc Get user's research interests extracted from chat history
 * @access Private
 */
router.get('/interests', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's research interests based on chat history
    const interests = await researchService.getUserInterestsFromChatHistory(userId);
    
    return res.json({ interests });
  } catch (error) {
    logger.error('Error fetching research interests', { error: error.message });
    return res.status(500).json({ error: 'Error fetching research interests' });
  }
});

export default router; 