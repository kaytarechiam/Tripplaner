import { Request, Response, NextFunction } from 'express'
import { getSupabaseAdmin } from '../services/supabase.js'

/**
 * Express middleware that verifies a Supabase JWT from the Authorization header.
 * Attaches `req.user` and `req.supabase` (admin client, skips RLS) on success.
 * Returns 401 if token is missing/invalid.
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authorization header missing or invalid' })
    return
  }

  const token = authHeader.slice(7) // strip "Bearer "

  if (!token) {
    res.status(401).json({ message: 'Token is empty' })
    return
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    console.error('[auth middleware] Supabase admin client not initialized — check server .env')
    res.status(503).json({ message: 'Auth service unavailable' })
    return
  }

  // Verify the JWT and extract the user
  supabase.auth.getUser(token)
    .then(({ data, error }) => {
      if (error || !data.user) {
        console.warn('[auth middleware] Token verification failed:', error?.message)
        res.status(401).json({ message: 'Invalid or expired token' })
        return
      }

      // Attach user + admin client to request for downstream handlers
      ;(req as Request & { user: typeof data.user; supabaseAdmin: typeof supabase }).user = data.user
      ;(req as Request & { user: typeof data.user; supabaseAdmin: typeof supabase }).supabaseAdmin = supabase
      next()
    })
    .catch((err) => {
      console.error('[auth middleware] Unexpected error:', err)
      res.status(500).json({ message: 'Internal auth error' })
    })
}

/**
 * Optional: attach Supabase user without requiring auth.
 * Useful for routes that *can* run as guest but get extra context if logged in.
 */
export function attachUser(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    next()
    return
  }

  const token = authHeader.slice(7)
  if (!token) {
    next()
    return
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) {
    next()
    return
  }

  supabase.auth.getUser(token)
    .then(({ data }) => {
      if (data.user) {
        ;(req as Request & { user: typeof data.user }).user = data.user
      }
      next()
    })
    .catch(() => {
      // Don't fail on error — just continue without user context
      next()
    })
}
