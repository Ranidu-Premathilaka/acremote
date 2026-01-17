// In-memory storage
export const users = new Map();
export const usersByEmail = new Map();
export const oauth2Clients = new Map();
export const oauth2Tokens = new Map();
export const authorizationCodes = new Map();
// Initialize with a sample OAuth2 client for Google Home
oauth2Clients.set('google-home-client', {
    clientId: 'google-home-client',
    clientSecret: 'your-client-secret-change-this', // Change this in production!
    redirectUris: ['https://oauth-redirect.googleusercontent.com/r/acremote-0b610']
});
