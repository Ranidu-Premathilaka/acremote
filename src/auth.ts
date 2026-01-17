import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { users, usersByEmail, User } from './db.js'

// JWT secret - in production, use environment variable!
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'

export interface JWTPayload {
  userId: string
  email: string
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

/**
 * Create a user account
 */
export async function createUser(email: string, password: string): Promise<User> {
  // Check if user already exists
  const existingUser = await usersByEmail.get(email)
  if (existingUser) {
    throw new Error('User already exists')
  }

  // Hash password
  const hashedPassword = await hashPassword(password)

  // Create user
  const user: User = {
    id: uuidv4(),
    email,
    password: hashedPassword,
    createdAt: new Date()
  }

  // Store user
  await users.set(user.id, user)
  await usersByEmail.set(user.email, user)

  return user
}

/**
 * Authenticate a user
 */
export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const user = await usersByEmail.get(email)
  if (!user) {
    return null
  }

  const isValid = await verifyPassword(password, user.password)
  if (!isValid) {
    return null
  }

  return user
}

/**
 * Generate JWT token for a user
 */
export function generateJWT(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    email: user.email
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

/**
 * Verify JWT token
 */
export function verifyJWT(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch (error) {
    return null
  }
}

/**
 * Get user from JWT token
 */
export async function getUserFromToken(token: string): Promise<User | null> {
  const payload = verifyJWT(token)
  if (!payload) {
    return null
  }

  return (await users.get(payload.userId)) || null
}
