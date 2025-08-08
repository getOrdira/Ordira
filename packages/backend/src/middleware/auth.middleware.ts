import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  userId?: string
}

const JWT_SECRET = process.env.JWT_SECRET!
if (!JWT_SECRET) {
  throw new Error('Missing JWT_SECRET environment variable!')
}

/**
 * Middleware to authenticate requests using a JWT Bearer token.
 * Populates `req.userId` with the token’s `sub` claim.
 */
export function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void | Response /* ← allow returning a Response */ {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ error: 'No Authorization header provided.' })
  }

  const [scheme, token] = authHeader.split(' ')
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Malformed Authorization header.' })
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string }
    req.userId = payload.sub
    return next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' })
  }
}
