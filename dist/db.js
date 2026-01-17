import { put, del, list } from '@vercel/blob';
// In-memory cache with Blob persistence
// This gives us fast access while maintaining persistence
const cache = new Map();
// Vercel Blob storage helpers with in-memory cache
const BLOB_PREFIX = {
    USER: 'user/',
    USER_BY_EMAIL: 'user-email/',
    OAUTH_CLIENT: 'oauth-client/',
    OAUTH_TOKEN: 'oauth-token/',
    OAUTH_TOKEN_BY_REFRESH: 'oauth-refresh/',
    AUTH_CODE: 'auth-code/'
};
// Helper to get blob URL from cache or list
async function getBlobUrl(path) {
    const cacheKey = `url:${path}`;
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }
    try {
        const { blobs } = await list({ prefix: path });
        if (blobs.length > 0) {
            cache.set(cacheKey, blobs[0].url);
            return blobs[0].url;
        }
    }
    catch (error) {
        console.error('Error listing blobs:', error);
    }
    return null;
}
// Helper function to get data from blob
async function getFromBlob(path) {
    // Check memory cache first
    if (cache.has(path)) {
        return cache.get(path);
    }
    try {
        const blobUrl = await getBlobUrl(path);
        if (!blobUrl)
            return null;
        const response = await fetch(blobUrl);
        if (!response.ok)
            return null;
        const data = await response.json();
        cache.set(path, data);
        return data;
    }
    catch (error) {
        console.error('Error reading from blob:', error);
        return null;
    }
}
// Helper function to store data in blob
async function putToBlob(path, data) {
    try {
        const jsonString = JSON.stringify(data);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const result = await put(path, blob, { access: 'public' });
        // Update caches
        cache.set(path, data);
        cache.set(`url:${path}`, result.url);
    }
    catch (error) {
        console.error('Error writing to blob:', error);
        throw error;
    }
}
// Helper to delete from blob
async function deleteFromBlob(path) {
    try {
        await del(path);
        cache.delete(path);
        cache.delete(`url:${path}`);
    }
    catch (error) {
        console.error('Error deleting from blob:', error);
    }
}
// Users
export const users = {
    async get(id) {
        const user = await getFromBlob(`${BLOB_PREFIX.USER}${id}.json`);
        if (user && user.createdAt) {
            user.createdAt = new Date(user.createdAt);
        }
        return user;
    },
    async set(id, user) {
        await putToBlob(`${BLOB_PREFIX.USER}${id}.json`, user);
    },
    async delete(id) {
        await deleteFromBlob(`${BLOB_PREFIX.USER}${id}.json`);
    }
};
export const usersByEmail = {
    async get(email) {
        const user = await getFromBlob(`${BLOB_PREFIX.USER_BY_EMAIL}${email}.json`);
        if (user && user.createdAt) {
            user.createdAt = new Date(user.createdAt);
        }
        return user;
    },
    async set(email, user) {
        await putToBlob(`${BLOB_PREFIX.USER_BY_EMAIL}${email}.json`, user);
    },
    async delete(email) {
        await deleteFromBlob(`${BLOB_PREFIX.USER_BY_EMAIL}${email}.json`);
    }
};
// OAuth Clients
export const oauth2Clients = {
    async get(clientId) {
        return await getFromBlob(`${BLOB_PREFIX.OAUTH_CLIENT}${clientId}.json`);
    },
    async set(clientId, client) {
        await putToBlob(`${BLOB_PREFIX.OAUTH_CLIENT}${clientId}.json`, client);
    },
    async delete(clientId) {
        await deleteFromBlob(`${BLOB_PREFIX.OAUTH_CLIENT}${clientId}.json`);
    }
};
// OAuth Tokens
export const oauth2Tokens = {
    async get(accessToken) {
        const token = await getFromBlob(`${BLOB_PREFIX.OAUTH_TOKEN}${accessToken}.json`);
        if (token) {
            token.expiresAt = new Date(token.expiresAt);
            token.createdAt = new Date(token.createdAt);
        }
        return token;
    },
    async set(accessToken, token) {
        await putToBlob(`${BLOB_PREFIX.OAUTH_TOKEN}${accessToken}.json`, token);
    },
    async delete(accessToken) {
        await deleteFromBlob(`${BLOB_PREFIX.OAUTH_TOKEN}${accessToken}.json`);
    }
};
export const oauth2TokensByRefresh = {
    async get(refreshToken) {
        const token = await getFromBlob(`${BLOB_PREFIX.OAUTH_TOKEN_BY_REFRESH}${refreshToken}.json`);
        if (token) {
            token.expiresAt = new Date(token.expiresAt);
            token.createdAt = new Date(token.createdAt);
        }
        return token;
    },
    async set(refreshToken, token) {
        await putToBlob(`${BLOB_PREFIX.OAUTH_TOKEN_BY_REFRESH}${refreshToken}.json`, token);
    },
    async delete(refreshToken) {
        await deleteFromBlob(`${BLOB_PREFIX.OAUTH_TOKEN_BY_REFRESH}${refreshToken}.json`);
    }
};
// Authorization Codes
export const authorizationCodes = {
    async get(code) {
        const authCode = await getFromBlob(`${BLOB_PREFIX.AUTH_CODE}${code}.json`);
        if (authCode) {
            authCode.expiresAt = new Date(authCode.expiresAt);
            authCode.createdAt = new Date(authCode.createdAt);
        }
        return authCode;
    },
    async set(code, authCode) {
        await putToBlob(`${BLOB_PREFIX.AUTH_CODE}${code}.json`, authCode);
    },
    async delete(code) {
        await deleteFromBlob(`${BLOB_PREFIX.AUTH_CODE}${code}.json`);
    }
};
// Initialize with a sample OAuth2 client for Google Home
async function initializeDefaultClient() {
    try {
        console.log('🔍 Checking for default OAuth2 client...');
        const existingClient = await oauth2Clients.get('google-home-client');
        if (!existingClient) {
            console.log('📝 Creating default OAuth2 client...');
            await oauth2Clients.set('google-home-client', {
                clientId: 'google-home-client',
                clientSecret: 'your-client-secret-change-this', // Change this in production!
                redirectUris: ['https://oauth-redirect.googleusercontent.com/r/acremote-0b610']
            });
            console.log('✅ Initialized default OAuth2 client');
        }
        else {
            console.log('✅ Default OAuth2 client already exists');
        }
    }
    catch (error) {
        console.error('❌ Failed to initialize default OAuth2 client:', error);
        console.error('Make sure BLOB_READ_WRITE_TOKEN environment variable is set');
    }
}
// Call initialization
initializeDefaultClient().catch(console.error);
