// Simple in-memory database (replace with real database in production)
export interface User {
  id: string
  email: string
  password: string // hashed
  createdAt: Date
}

export interface OAuth2Client {
  clientId: string
  clientSecret: string
  redirectUris: string[]
}

export interface OAuth2Token {
  accessToken: string
  refreshToken: string
  userId: string
  clientId: string
  expiresAt: Date
  createdAt: Date
}

export interface AuthorizationCode {
  code: string
  userId: string
  clientId: string
  redirectUri: string
  expiresAt: Date
  createdAt: Date
}

// In-memory storage
export const users: Map<string, User> = new Map()
export const usersByEmail: Map<string, User> = new Map()
export const oauth2Clients: Map<string, OAuth2Client> = new Map()
export const oauth2Tokens: Map<string, OAuth2Token> = new Map()
export const authorizationCodes: Map<string, AuthorizationCode> = new Map()

// Initialize with a sample OAuth2 client for Google Home
oauth2Clients.set('google-home-client', {
  clientId: 'google-home-client',
  clientSecret: 'your-client-secret-change-this', // Change this in production!
  redirectUris: ['https://oauth-redirect.googleusercontent.com/r/acremote-0b610']
})
