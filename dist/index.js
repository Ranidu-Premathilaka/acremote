import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './authRoutes.js';
import oauthRoutes from './oauthRoutes.js';
import fulfillmentRoutes from './fulfillmentRoutes.js';
import taskRoutes from './taskRoutes.js';
import { ADMIN_CONFIG } from './config.js';
import { getUserFromToken } from './auth.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Request/Response logging
app.use((req, res, next) => {
    const start = Date.now();
    console.log(`\n📥 [${new Date().toISOString()}] ${req.method} ${req.path}`);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    if (Object.keys(req.query).length > 0) {
        console.log('Query:', JSON.stringify(req.query, null, 2));
    }
    if (req.body && Object.keys(req.body).length > 0) {
        console.log('Body:', JSON.stringify(req.body, null, 2));
    }
    const originalSend = res.send;
    const originalJson = res.json;
    res.send = function (body) {
        const duration = Date.now() - start;
        console.log(`📤 [${new Date().toISOString()}] Response ${res.statusCode} (${duration}ms)`);
        console.log('Response Body:', typeof body === 'string' ? body : JSON.stringify(body, null, 2));
        return originalSend.call(this, body);
    };
    res.json = function (body) {
        const duration = Date.now() - start;
        console.log(`📤 [${new Date().toISOString()}] Response ${res.statusCode} (${duration}ms)`);
        console.log('Response JSON:', JSON.stringify(body, null, 2));
        return originalJson.call(this, body);
    };
    next();
});
// Authentication middleware
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = req.query.token || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);
    if (!token) {
        return res.status(401).type('html').send(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>Login Required</title>
          <style>
            body { font-family: system-ui; max-width: 400px; margin: 100px auto; padding: 20px; text-align: center; }
            button { padding: 10px 20px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
            button:hover { background: #0052a3; }
          </style>
        </head>
        <body>
          <h1>🔒 Authentication Required</h1>
          <p>Please sign in to access this page</p>
          <button onclick="window.location.href='/api/auth/signin-page'">Sign In</button>
        </body>
      </html>
    `);
    }
    const user = getUserFromToken(token);
    if (!user) {
        return res.status(401).type('html').send(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8"/>
          <title>Invalid Token</title>
          <style>
            body { font-family: system-ui; max-width: 400px; margin: 100px auto; padding: 20px; text-align: center; }
            button { padding: 10px 20px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
            button:hover { background: #0052a3; }
          </style>
        </head>
        <body>
          <h1>❌ Invalid or Expired Token</h1>
          <p>Your session has expired. Please sign in again.</p>
          <button onclick="window.location.href='/api/auth/signin-page'">Sign In</button>
        </body>
      </html>
    `);
    }
    next();
}
// Home route - HTML (protected)
app.get('/', requireAuth, (req, res) => {
    res.type('html').send(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>AC Remote Control</title>
        <link rel="stylesheet" href="/style.css" />
        <style>
          body { font-family: system-ui; max-width: 800px; margin: 50px auto; padding: 20px; }
          .section { margin: 30px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
          h2 { color: #0066cc; }
          code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; }
          .endpoint { margin: 10px 0; padding: 10px; background: #f9f9f9; border-left: 3px solid #0066cc; }
          .method { font-weight: bold; color: #0066cc; }
        </style>
      </head>
      <body>
        <h1>🌡️ AC Remote Control System</h1>
        <p>Single-user authentication with Google Home integration</p>

        <div class="section">
          <h2>👤 Admin Account</h2>
          <p>Authenticated as admin</p>
          <p>Configure via environment variables:</p>
          <ul>
            <li><code>ADMIN_EMAIL</code> - Admin email address</li>
            <li><code>ADMIN_PASSWORD</code> - Admin password</li>
            <li><code>TASK_SECRET_KEY</code> - Secret key for task endpoint</li>
          </ul>
        </div>

        <div class="section">
          <h2>🔐 Authentication</h2>
          <div class="endpoint">
            <span class="method">POST</span> <code>/api/auth/signin</code><br>
            Sign in to get JWT token
          </div>
          <div class="endpoint">
            <span class="method">GET</span> <code>/api/auth/me</code><br>
            Get current user info (requires Bearer token)
          </div>
        </div>

        <div class="section">
          <h2>🔑 OAuth2 (Google Home)</h2>
          <div class="endpoint">
            <span class="method">GET</span> <code>/oauth/authorize</code><br>
            Authorization endpoint for Google Home
          </div>
          <div class="endpoint">
            <span class="method">POST</span> <code>/oauth/token</code><br>
            Token exchange endpoint
          </div>
        </div>

        <div class="section">
          <h2>🏠 Google Home Fulfillment</h2>
          <div class="endpoint">
            <span class="method">POST</span> <code>/fulfillment</code><br>
            Handle SYNC, QUERY, and EXECUTE intents (requires OAuth token)
          </div>
        </div>

        <div class="section">
          <h2>📋 Task Queue</h2>
          <div class="endpoint">
            <span class="method">GET</span> <code>/tasks</code><br>
            Retrieve pending tasks (requires X-Secret-Key header)
          </div>
          <div class="endpoint">
            <span class="method">POST</span> <code>/tasks/state</code><br>
            Update AC state (requires X-Secret-Key header)
          </div>
          <div class="endpoint">
            <span class="method">GET</span> <code>/tasks/history</code><br>
            View task history (requires X-Secret-Key header)
          </div>
          <div class="endpoint">
            <span class="method">DELETE</span> <code>/tasks</code><br>
            Clear processed tasks (requires X-Secret-Key header)
          </div>
        </div>

        <div class="section">
          <h2>⚙️ Setup</h2>
          <p><strong>1. Configure Google Actions Console:</strong></p>
          <ul>
            <li>Authorization URL: <code>https://YOUR_DOMAIN/oauth/authorize</code></li>
            <li>Token URL: <code>https://YOUR_DOMAIN/oauth/token</code></li>
            <li>Fulfillment URL: <code>https://YOUR_DOMAIN/fulfillment</code></li>
            <li>Client ID: <code>google-home-client</code></li>
          </ul>
          <p><strong>2. Test AC control:</strong></p>
          <p>"Hey Google, turn on the air conditioner"</p>
          <p>"Hey Google, set AC to 22 degrees"</p>
          <p>"Hey Google, set AC fan speed to high"</p>
        </div>
      </body>
    </html>
  `);
});
app.get('/about', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'components', 'about.htm'));
});
// Example API endpoint - JSON
app.get('/api-data', (req, res) => {
    res.json({
        message: 'Here is some sample API data',
        items: ['apple', 'banana', 'cherry'],
    });
});
// Health check
app.get('/healthz', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Mount authentication routes
app.use('/api/auth', authRoutes);
// Mount OAuth2 routes
app.use('/oauth', oauthRoutes);
// Mount Google Home fulfillment
app.use('/fulfillment', fulfillmentRoutes);
// Mount task queue routes
app.use('/tasks', taskRoutes);
// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));
// Start server if not imported as module
const PORT = process.env.PORT || 3000;
if (import.meta.url === `file://${process.argv[1]}`) {
    app.listen(PORT, () => {
        console.log(`\n🌡️  AC Remote Control Server`);
        console.log(`Server running on http://localhost:${PORT}`);
        console.log(`\n👤 Admin: ${ADMIN_CONFIG.email}`);
        console.log(`🔑 Task Secret: ${ADMIN_CONFIG.taskSecretKey}`);
        console.log('\n📡 Endpoints:');
        console.log(`  POST http://localhost:${PORT}/api/auth/signin`);
        console.log(`  POST http://localhost:${PORT}/oauth/authorize`);
        console.log(`  POST http://localhost:${PORT}/fulfillment`);
        console.log(`  GET  http://localhost:${PORT}/tasks`);
    });
}
export default app;
