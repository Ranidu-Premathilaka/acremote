# Authentication & OAuth2 Setup Guide

This application now includes user authentication and OAuth2 integration for Google Home.

## Quick Start

1. **Start the server:**
   ```bash
   npm run dev
   # or
   node src/index.ts
   ```

2. **The server will run on:** `http://localhost:3000`

## Authentication Endpoints

### 1. Sign Up (Create Account)
```bash
POST http://localhost:3000/api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-here",
    "email": "user@example.com",
    "createdAt": "2026-01-17T..."
  }
}
```

### 2. Sign In
```bash
POST http://localhost:3000/api/auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "yourpassword"
}
```

### 3. Get Current User
```bash
GET http://localhost:3000/api/auth/me
Authorization: Bearer YOUR_JWT_TOKEN
```

## OAuth2 Setup for Google Home

### Configuration Steps

1. **Update OAuth2 Client Settings**
   
   Edit [src/db.ts](src/db.ts#L42-L46) and update:
   - `clientSecret`: Change to a secure random string
   - `redirectUris`: Update with your actual Google project redirect URI
   
   ```typescript
   oauth2Clients.set('google-home-client', {
     clientId: 'google-home-client',
     clientSecret: 'YOUR-SECURE-SECRET-HERE',
     redirectUris: ['https://oauth-redirect.googleusercontent.com/r/YOUR_PROJECT_ID']
   })
   ```

2. **Set JWT Secret**
   
   In production, set the `JWT_SECRET` environment variable:
   ```bash
   export JWT_SECRET="your-very-secure-secret-key"
   ```

### OAuth2 Endpoints

#### Authorization Endpoint
```
GET /oauth/authorize?client_id=google-home-client&redirect_uri=YOUR_REDIRECT_URI&state=STATE&response_type=code
```

This endpoint shows a login form where users authenticate and authorize Google Home access.

#### Token Endpoint
```bash
POST /oauth/token
Content-Type: application/json

{
  "grant_type": "authorization_code",
  "code": "authorization-code-from-redirect",
  "client_id": "google-home-client",
  "client_secret": "your-client-secret",
  "redirect_uri": "YOUR_REDIRECT_URI"
}
```

**Response:**
```json
{
  "access_token": "uuid-token",
  "refresh_token": "uuid-refresh-token",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

#### Refresh Token
```bash
POST /oauth/token
Content-Type: application/json

{
  "grant_type": "refresh_token",
  "refresh_token": "your-refresh-token",
  "client_id": "google-home-client",
  "client_secret": "your-client-secret"
}
```

## Google Home Integration

### In Google Actions Console:

1. Go to **Account Linking** section
2. Select **OAuth** and **Authorization Code** flow
3. Fill in:
   - **Client ID**: `google-home-client`
   - **Client Secret**: (the secret you set in db.ts)
   - **Authorization URL**: `https://YOUR_DOMAIN/oauth/authorize`
   - **Token URL**: `https://YOUR_DOMAIN/oauth/token`

### Testing Locally with ngrok:

```bash
# Install ngrok
brew install ngrok

# Start your server
node src/index.ts

# In another terminal, expose it
ngrok http 3000
```

Use the ngrok HTTPS URL as YOUR_DOMAIN in the Google Actions Console.

## Security Notes

⚠️ **Important for Production:**

1. **Replace in-memory storage** with a real database (PostgreSQL, MongoDB, etc.)
2. **Change default secrets** in [src/db.ts](src/db.ts) and set `JWT_SECRET` env var
3. **Use HTTPS** in production (required by Google)
4. **Add rate limiting** to prevent brute force attacks
5. **Implement proper session management**
6. **Add email verification** for new signups
7. **Store hashed passwords** (already implemented with bcrypt)

## Testing the API

### Example: Complete Flow

1. **Create an account:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123"}'
   ```

2. **Sign in:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/signin \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123"}'
   ```

3. **Test OAuth2 authorization in browser:**
   ```
   http://localhost:3000/oauth/authorize?client_id=google-home-client&redirect_uri=https://oauth-redirect.googleusercontent.com/r/YOUR_PROJECT_ID&state=test123&response_type=code
   ```

## Project Structure

```
src/
├── index.ts          # Main Express server
├── auth.ts           # Authentication utilities (JWT, bcrypt)
├── authRoutes.ts     # User signup/signin endpoints
├── oauthRoutes.ts    # OAuth2 authorization flow
└── db.ts             # In-memory database (replace in production)
```
