import { Router, Request, Response } from 'express'
import { createUser, authenticateUser, generateJWT, getUserFromToken } from './auth.js'
import { ADMIN_CONFIG } from './config.js'
import { usersByEmail } from './db.js'

const router = Router()

/**
 * Initialize admin user on first run
 */
async function initializeAdminUser() {
  if (!usersByEmail.has(ADMIN_CONFIG.email)) {
    try {
      await createUser(ADMIN_CONFIG.email, ADMIN_CONFIG.password)
      console.log(`✅ Admin user created: ${ADMIN_CONFIG.email}`)
      console.log('⚠️  Change the default password via ADMIN_PASSWORD env var!')
    } catch (error) {
      console.error('Failed to create admin user:', error)
    }
  }
}

// Initialize on module load
initializeAdminUser()

/**
 * GET /api/auth/signin-page
 * Show signin page
 */
router.get('/signin-page', (req: Request, res: Response) => {
  res.type('html').send(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>Admin Sign In</title>
        <style>
          body { font-family: system-ui; max-width: 400px; margin: 100px auto; padding: 20px; }
          h1 { text-align: center; }
          .form-group { margin-bottom: 15px; }
          label { display: block; margin-bottom: 5px; font-weight: bold; }
          input { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
          button { width: 100%; padding: 10px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; }
          button:hover { background: #0052a3; }
          .error { color: red; margin-top: 10px; text-align: center; }
        </style>
      </head>
      <body>
        <h1>🔐 Admin Sign In</h1>
        <form id="signinForm">
          <div class="form-group">
            <label for="email">Email:</label>
            <input type="email" id="email" name="email" required />
          </div>
          <div class="form-group">
            <label for="password">Password:</label>
            <input type="password" id="password" name="password" required />
          </div>
          <button type="submit">Sign In</button>
          <div id="error" class="error"></div>
        </form>

        <script>
          document.getElementById('signinForm').addEventListener('submit', async (e) => {
            e.preventDefault()
            const email = document.getElementById('email').value
            const password = document.getElementById('password').value
            const errorDiv = document.getElementById('error')
            
            try {
              const res = await fetch('/api/auth/signin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
              })
              
              const data = await res.json()
              
              if (!res.ok) {
                errorDiv.textContent = data.error || 'Sign in failed'
                return
              }
              
              // Redirect to home with token
              window.location.href = '/?token=' + data.token
            } catch (error) {
              errorDiv.textContent = 'An error occurred. Please try again.'
            }
          })
        </script>
      </body>
    </html>
  `)
})

/**
 * POST /api/auth/signup
 * Disabled - single admin user only
 */
router.post('/signup', async (req: Request, res: Response) => {
  res.status(403).json({ 
    error: 'Signup is disabled. This system supports a single admin user only.',
    adminEmail: ADMIN_CONFIG.email
  })
})

/**
 * POST /api/auth/signin
 * Sign in with email and password
 */
router.post('/signin', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    // Authenticate user
    const user = await authenticateUser(email, password)

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    // Generate JWT token
    const token = generateJWT(user)

    res.json({
      message: 'Signed in successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt
      }
    })
  } catch (error) {
    console.error('Signin error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/auth/me
 * Get current user info from token
 */
router.get('/me', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const token = authHeader.substring(7)
    const user = getUserFromToken(token)

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt
      }
    })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
