# Migration to Vercel Blob Storage

## Overview
The application has been migrated from in-memory storage to **Vercel Blob** for persistent data storage. This fixes the "refresh token not found" error that occurred after server restarts.

## Why Vercel Blob?
- **Persistent storage**: Data survives server restarts
- **Serverless-friendly**: Works perfectly with Vercel deployments
- **Simple API**: Easy to use put/get/delete operations
- **No infrastructure management**: Fully managed by Vercel

## Setup Instructions

### 1. Create a Vercel Blob Store

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on **Storage** tab
3. Click **Create Database** → **Blob**
4. Name your store (e.g., "acremote-storage")

### 2. Get Environment Variables

After creating the Blob store:
1. Go to your Blob store page
2. Click the **`.env.local`** tab
3. Copy the environment variables shown

You'll see something like:
```bash
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_AbCdEf123..."
```

### 3. Add to Your Environment

**For local development:**
Create a `.env` file in the project root:
```bash
cp .env.example .env
```

Then add your Vercel Blob token to `.env`.

**For Vercel deployment:**
1. Go to your project settings on Vercel
2. Navigate to **Environment Variables**
3. Add the `BLOB_READ_WRITE_TOKEN` from step 2

### 4. Deploy

Push your changes to trigger a deployment:
```bash
git add .
git commit -m "Migrate to Vercel Blob storage"
git push
```

Or deploy manually:
```bash
npm run build
vercel --prod
```

## What Changed

### Database Structure
All storage now uses async operations and stores data as JSON files in Blob:

```typescript
// Before (in-memory)
users.set(id, user)
const user = users.get(id)

// After (Vercel Blob)
await users.set(id, user)  // Stores as user/{id}.json
const user = await users.get(id)  // Fetches user/{id}.json
```

### Files Modified
- `src/db.ts` - Complete rewrite to use Vercel Blob
- `src/auth.ts` - Made async: `createUser`, `authenticateUser`, `getUserFromToken`
- `src/authRoutes.ts` - Updated to use async calls
- `src/oauthRoutes.ts` - All routes now async
- `src/fulfillmentRoutes.ts` - Token verification now async

### Data Stored in Blob
Each piece of data is stored as a separate JSON file:
- **Users** (`user/*.json`) - User accounts
- **Users by email** (`user-email/*.json`) - Email lookup index
- **OAuth clients** (`oauth-client/*.json`) - OAuth2 client registrations
- **Access tokens** (`oauth-token/*.json`) - OAuth2 access tokens
- **Refresh tokens** (`oauth-refresh/*.json`) - OAuth2 refresh tokens (fixes the error!)
- **Auth codes** (`auth-code/*.json`) - Temporary authorization codes

## Benefits

✅ **Refresh tokens persist** - No more "refresh token not found" errors after restarts
✅ **User data persists** - No need to re-create admin account
✅ **OAuth sessions survive** - Google Home stays connected
✅ **Simple architecture** - Just JSON files in blob storage
✅ **Scalable** - Works across multiple serverless instances

## Testing

After deployment, test the full OAuth flow:
1. Link your Google Home account
2. Restart the server
3. Try using a command - it should still work!
4. Wait for token to expire and refresh - should succeed now

## Troubleshooting

**"Could not connect to Blob"**
- Check that `BLOB_READ_WRITE_TOKEN` environment variable is set correctly
- Verify Blob store is active in Vercel dashboard

**"Unauthorized" errors**
- Check token is correct
- Ensure token hasn't been regenerated

**Still seeing "refresh token not found"**
- Clear all old tokens by restarting and re-linking Google Home
- Check logs to verify tokens are being stored
