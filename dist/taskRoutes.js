import { Router } from 'express';
import { ADMIN_CONFIG } from './config.js';
import { taskQueue, currentACState, updateACState } from './taskQueue.js';
const router = Router();
/**
 * GET /tasks
 * Retrieve and pop tasks from the queue
 * Protected by secret key
 */
router.get('/', (req, res) => {
    const secretKey = req.headers['x-secret-key'] || req.query.secret;
    if (!secretKey || secretKey !== ADMIN_CONFIG.taskSecretKey) {
        return res.status(401).json({ error: 'Invalid or missing secret key' });
    }
    // Get all unprocessed tasks
    const unprocessedTasks = taskQueue.filter(task => !task.processed);
    // Mark tasks as processed
    unprocessedTasks.forEach(task => {
        task.processed = true;
    });
    res.json({
        count: unprocessedTasks.length,
        currentState: currentACState
    });
});
/**
 * POST /tasks/state
 * Update AC state from external device
 * Protected by secret key
 */
router.post('/state', (req, res) => {
    const secretKey = req.headers['x-secret-key'] || req.body.secret;
    if (!secretKey || secretKey !== ADMIN_CONFIG.taskSecretKey) {
        return res.status(401).json({ error: 'Invalid or missing secret key' });
    }
    const newState = req.body.state;
    if (!newState || typeof newState !== 'object') {
        return res.status(400).json({ error: 'Invalid state object' });
    }
    // Update the state
    updateACState(newState);
    res.json({
        message: 'State updated successfully',
        currentState: currentACState
    });
});
/**
 * GET /tasks/history
 * Get all tasks including processed ones
 * Protected by secret key
 */
router.get('/history', (req, res) => {
    const secretKey = req.headers['x-secret-key'] || req.query.secret;
    if (!secretKey || secretKey !== ADMIN_CONFIG.taskSecretKey) {
        return res.status(401).json({ error: 'Invalid or missing secret key' });
    }
    const limit = parseInt(req.query.limit) || 50;
    res.json({
        count: taskQueue.length,
        tasks: taskQueue.slice(-limit).reverse()
    });
});
/**
 * DELETE /tasks
 * Clear all processed tasks
 * Protected by secret key
 */
router.delete('/', (req, res) => {
    const secretKey = req.headers['x-secret-key'] || req.body.secret;
    if (!secretKey || secretKey !== ADMIN_CONFIG.taskSecretKey) {
        return res.status(401).json({ error: 'Invalid or missing secret key' });
    }
    const beforeCount = taskQueue.length;
    // Remove processed tasks
    for (let i = taskQueue.length - 1; i >= 0; i--) {
        if (taskQueue[i].processed) {
            taskQueue.splice(i, 1);
        }
    }
    const afterCount = taskQueue.length;
    res.json({
        message: 'Processed tasks cleared',
        removed: beforeCount - afterCount,
        remaining: afterCount
    });
});
export default router;
