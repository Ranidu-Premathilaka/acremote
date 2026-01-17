import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './authRoutes.js';
import oauthRoutes from './oauthRoutes.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Home route - HTML
app.get('/', (req, res) => {
    res.type('html').send(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>Express on Vercel</title>
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body>
        <nav>
          <a href="/">Home</a>
          <a href="/about">About</a>
          <a href="/api-data">API Data</a>
          <a href="/healthz">Health</a>
        </nav>
        <h1>Welcome to Express on Vercel 🚀</h1>
        <p>This is a minimal example without a database or forms.</p>
        <img src="/logo.png" alt="Logo" width="120" />
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
// Serve static files
app.use(express.static(path.join(__dirname, '..', 'public')));
// Start server if not imported as module
const PORT = process.env.PORT || 3000;
if (import.meta.url === `file://${process.argv[1]}`) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log('\n🔐 Authentication endpoints:');
        console.log(`  POST http://localhost:${PORT}/api/auth/signup`);
        console.log(`  POST http://localhost:${PORT}/api/auth/signin`);
        console.log(`  GET  http://localhost:${PORT}/api/auth/me`);
        console.log('\n🔑 OAuth2 endpoints (for Google Home):');
        console.log(`  GET  http://localhost:${PORT}/oauth/authorize`);
        console.log(`  POST http://localhost:${PORT}/oauth/token`);
    });
}
export default app;
