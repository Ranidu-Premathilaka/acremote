import { Router } from 'express';
import { createUser, authenticateUser, generateJWT, getUserFromToken } from './auth.js';
import { ADMIN_CONFIG } from './config.js';
import { usersByEmail } from './db.js';
const router = Router();
/**
 * Initialize admin user on first run
 */
async function initializeAdminUser() {
    if (!usersByEmail.has(ADMIN_CONFIG.email)) {
        try {
            await createUser(ADMIN_CONFIG.email, ADMIN_CONFIG.password);
            console.log(`✅ Admin user created: ${ADMIN_CONFIG.email}`);
            console.log('⚠️  Change the default password via ADMIN_PASSWORD env var!');
        }
        catch (error) {
            console.error('Failed to create admin user:', error);
        }
    }
}
// Initialize on module load
initializeAdminUser();
/**
 * POST /api/auth/signup
 * Disabled - single admin user only
 */
router.post('/signup', async (req, res) => {
    res.status(403).json({
        error: 'Signup is disabled. This system supports a single admin user only.',
        adminEmail: ADMIN_CONFIG.email
    });
});
/**
 * POST /api/auth/signin
 * Sign in with email and password
 */
router.post('/signin', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Validation
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        // Authenticate user
        const user = await authenticateUser(email, password);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        // Generate JWT token
        const token = generateJWT(user);
        res.json({
            message: 'Signed in successfully',
            token,
            user: {
                id: user.id,
                email: user.email,
                createdAt: user.createdAt
            }
        });
    }
    catch (error) {
        console.error('Signin error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * GET /api/auth/me
 * Get current user info from token
 */
router.get('/me', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const token = authHeader.substring(7);
        const user = getUserFromToken(token);
        if (!user) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        res.json({
            user: {
                id: user.id,
                email: user.email,
                createdAt: user.createdAt
            }
        });
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
export default router;
