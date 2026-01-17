import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getUserFromToken } from './auth.js';
import { oauth2Clients, oauth2Tokens, oauth2TokensByRefresh, authorizationCodes } from './db.js';
const router = Router();
/**
 * GET /oauth/authorize
 * OAuth2 authorization endpoint
 * This is where Google Home will redirect users to authenticate
 */
router.get('/authorize', (req, res) => {
    const { client_id, redirect_uri, state, response_type } = req.query;
    // Validate required parameters
    if (!client_id || !redirect_uri || !state || response_type !== 'code') {
        return res.status(400).json({
            error: 'invalid_request',
            error_description: 'Missing or invalid required parameters'
        });
    }
    // Validate client
    const client = oauth2Clients.get(client_id);
    if (!client) {
        console.error('Invalid client_id:', client_id);
        return res.status(401).json({
            error: 'invalid_client',
            error_description: 'Invalid client_id'
        });
    }
    // Validate redirect_uri
    console.log('Checking redirect_uri:', redirect_uri);
    console.log('Allowed redirectUris:', client.redirectUris);
    if (!client.redirectUris.includes(redirect_uri)) {
        console.error('Redirect URI not in allowed list');
        return res.status(400).json({
            error: 'invalid_request',
            error_description: `Invalid redirect_uri. Got: ${redirect_uri}, Expected one of: ${client.redirectUris.join(', ')}`
        });
    }
    // Show authorization page
    res.type('html').send(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>Authorize App</title>
        <link rel="stylesheet" href="/style.css" />
        <style>
          .auth-container {
            max-width: 500px;
            margin: 50px auto;
            padding: 30px;
            border: 1px solid #ddd;
            border-radius: 8px;
            background: white;
          }
          .form-group {
            margin-bottom: 15px;
          }
          label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
          }
          input {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
          }
          button {
            width: 100%;
            padding: 10px;
            background: #4285f4;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
          }
          button:hover {
            background: #357ae8;
          }
          .error {
            color: red;
            margin-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="auth-container">
          <h1>Authorize Google Home</h1>
          <p>Sign in to connect your account with Google Home</p>
          
          <form id="authForm">
            <div class="form-group">
              <label for="email">Email:</label>
              <input type="email" id="email" name="email" required />
            </div>
            
            <div class="form-group">
              <label for="password">Password:</label>
              <input type="password" id="password" name="password" required />
            </div>
            
            <button type="submit">Authorize</button>
            <div id="error" class="error"></div>
          </form>
        </div>

        <script>
          document.getElementById('authForm').addEventListener('submit', async (e) => {
            e.preventDefault()
            
            const email = document.getElementById('email').value
            const password = document.getElementById('password').value
            const errorDiv = document.getElementById('error')
            
            try {
              // Sign in
              const signInRes = await fetch('/api/auth/signin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
              })
              
              const signInData = await signInRes.json()
              
              if (!signInRes.ok) {
                errorDiv.textContent = signInData.error || 'Sign in failed'
                return
              }
              
              // Get authorization code
              const authRes = await fetch('/oauth/grant', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': 'Bearer ' + signInData.token
                },
                body: JSON.stringify({
                  client_id: '${client_id}',
                  redirect_uri: '${redirect_uri}',
                  state: '${state}'
                })
              })
              
              const authData = await authRes.json()
              
              if (!authRes.ok) {
                errorDiv.textContent = authData.error || 'Authorization failed'
                return
              }
              
              // Redirect back to Google with the code
              window.location.href = authData.redirect_url
            } catch (error) {
              errorDiv.textContent = 'An error occurred. Please try again.'
            }
          })
        </script>
      </body>
    </html>
  `);
});
/**
 * POST /oauth/grant
 * Grant authorization code after user signs in
 */
router.post('/grant', (req, res) => {
    try {
        const { client_id, redirect_uri, state } = req.body;
        // Get user from token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }
        const token = authHeader.substring(7);
        const user = getUserFromToken(token);
        if (!user) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        // Validate client
        const client = oauth2Clients.get(client_id);
        if (!client) {
            return res.status(401).json({ error: 'Invalid client_id' });
        }
        // Validate redirect_uri
        if (!client.redirectUris.includes(redirect_uri)) {
            return res.status(400).json({ error: 'Invalid redirect_uri' });
        }
        // Generate authorization code
        const code = uuidv4();
        const authCode = {
            code,
            userId: user.id,
            clientId: client_id,
            redirectUri: redirect_uri,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
            createdAt: new Date()
        };
        authorizationCodes.set(code, authCode);
        // Build redirect URL
        const redirectUrl = new URL(redirect_uri);
        redirectUrl.searchParams.set('code', code);
        redirectUrl.searchParams.set('state', state);
        res.json({ redirect_url: redirectUrl.toString() });
    }
    catch (error) {
        console.error('Grant error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
/**
 * POST /oauth/token
 * Exchange authorization code for access token
 */
router.post('/token', (req, res) => {
    try {
        const { grant_type, code, client_id, client_secret, redirect_uri } = req.body;
        // Validate grant_type
        if (grant_type === 'authorization_code') {
            // Validate required parameters
            if (!code || !client_id || !client_secret) {
                return res.status(400).json({
                    error: 'invalid_request',
                    error_description: 'Missing required parameters'
                });
            }
            // Validate client
            const client = oauth2Clients.get(client_id);
            if (!client || client.clientSecret !== client_secret) {
                return res.status(401).json({
                    error: 'invalid_client',
                    error_description: 'Invalid client credentials'
                });
            }
            // Get authorization code
            const authCode = authorizationCodes.get(code);
            if (!authCode) {
                return res.status(400).json({
                    error: 'invalid_grant',
                    error_description: 'Invalid authorization code'
                });
            }
            // Check if code is expired
            if (authCode.expiresAt < new Date()) {
                authorizationCodes.delete(code);
                return res.status(400).json({
                    error: 'invalid_grant',
                    error_description: 'Authorization code expired'
                });
            }
            // Validate client_id and redirect_uri
            if (authCode.clientId !== client_id || authCode.redirectUri !== redirect_uri) {
                return res.status(400).json({
                    error: 'invalid_grant',
                    error_description: 'Authorization code mismatch'
                });
            }
            // Delete the used code
            authorizationCodes.delete(code);
            // Generate tokens
            const accessToken = uuidv4();
            const refreshToken = uuidv4();
            const token = {
                accessToken,
                refreshToken,
                userId: authCode.userId,
                clientId: client_id,
                expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
                createdAt: new Date()
            };
            oauth2Tokens.set(accessToken, token);
            oauth2TokensByRefresh.set(refreshToken, token);
            res.json({
                access_token: accessToken,
                refresh_token: refreshToken,
                token_type: 'Bearer',
                expires_in: 3600
            });
        }
        else if (grant_type === 'refresh_token') {
            const { refresh_token, client_id, client_secret } = req.body;
            if (!refresh_token || !client_id || !client_secret) {
                return res.status(400).json({
                    error: 'invalid_request',
                    error_description: 'Missing required parameters'
                });
            }
            // Validate client
            const client = oauth2Clients.get(client_id);
            if (!client || client.clientSecret !== client_secret) {
                return res.status(401).json({
                    error: 'invalid_client',
                    error_description: 'Invalid client credentials'
                });
            }
            const existingToken = oauth2TokensByRefresh.get(refresh_token);
            if (!existingToken) {
                console.error('Refresh token not found:', refresh_token);
                return res.status(400).json({
                    error: 'invalid_grant',
                    error_description: 'Invalid refresh token'
                });
            }
            // Validate client matches
            if (existingToken.clientId !== client_id) {
                console.error('Client ID mismatch for refresh token');
                return res.status(400).json({
                    error: 'invalid_grant',
                    error_description: 'Invalid refresh token'
                });
            }
            // Delete old tokens
            oauth2Tokens.delete(existingToken.accessToken);
            oauth2TokensByRefresh.delete(existingToken.refreshToken);
            // Generate new tokens
            const accessToken = uuidv4();
            const newRefreshToken = uuidv4();
            const newToken = {
                accessToken,
                refreshToken: newRefreshToken,
                userId: existingToken.userId,
                clientId: client_id,
                expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
                createdAt: new Date()
            };
            oauth2Tokens.set(accessToken, newToken);
            oauth2TokensByRefresh.set(newRefreshToken, newToken);
            console.log('Refresh token success, new tokens generated');
            res.json({
                access_token: accessToken,
                refresh_token: newRefreshToken,
                token_type: 'Bearer',
                expires_in: 3600
            });
        }
        else {
            res.status(400).json({
                error: 'unsupported_grant_type',
                error_description: 'Only authorization_code and refresh_token grant types are supported'
            });
        }
    }
    catch (error) {
        console.error('Token error:', error);
        res.status(500).json({ error: 'server_error' });
    }
});
export default router;
