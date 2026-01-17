import { put, del } from '@vercel/blob';
// Vercel Blob storage helpers
const BLOB_PREFIX = {
    USER: 'user/',
    USER_BY_EMAIL: 'user-email/',
    OAUTH_CLIENT: 'oauth-client/',
    OAUTH_TOKEN: 'oauth-token/',
    OAUTH_TOKEN_BY_REFRESH: 'oauth-refresh/',
    AUTH_CODE: 'auth-code/'
};
// Helper function to get data from blob
async function getFromBlob(path) {
    try {
        const response = await fetch(`https://blob.vercel-storage.com/${path}`);
        if (!response.ok)
            return null;
        const data = await response.json();
        return data;
    }
    catch (error) {
        return null;
    }
}
// Helper function to store data in blob
async function putToBlob(path, data) {
    const jsonString = JSON.stringify(data);
    const blob = new Blob([jsonString], { type: 'application/json' });
    await put(path, blob, { access: 'public' });
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
        await del(`${BLOB_PREFIX.USER}${id}.json`);
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
        await del(`${BLOB_PREFIX.USER_BY_EMAIL}${email}.json`);
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
        await del(`${BLOB_PREFIX.OAUTH_CLIENT}${clientId}.json`);
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
        await del(`${BLOB_PREFIX.OAUTH_TOKEN}${accessToken}.json`);
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
        await del(`${BLOB_PREFIX.OAUTH_TOKEN_BY_REFRESH}${refreshToken}.json`);
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
        await del(`${BLOB_PREFIX.AUTH_CODE}${code}.json`);
    }
};
// Initialize with a sample OAuth2 client for Google Home
async function initializeDefaultClient() {
    const existingClient = await oauth2Clients.get('google-home-client');
    if (!existingClient) {
        await oauth2Clients.set('google-home-client', {
            clientId: 'google-home-client',
            clientSecret: 'your-client-secret-change-this', // Change this in production!
            redirectUris: ['https://oauth-redirect.googleusercontent.com/r/acremote-0b610']
        });
        console.log('✅ Initialized default OAuth2 client');
    }
}
// Call initialization
initializeDefaultClient().catch(console.error);
