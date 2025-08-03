import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Manufacturer } from '../models/manufacturer.model';

const JWT_SECRET = process.env.MFG_JWT_SECRET!;

/**
 * Extend Express’s Request with `userId` for a manufacturer.
 */
export interface AuthRequest extends Request {
  userId?: string;
}

/**
 * Middleware to authenticate manufacturers via JWT Bearer token.
 * On success, populates `req.userId` with the manufacturer’s ID.
 */
export async function authenticateManufacturer(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No Authorization header provided.' });
  }
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Malformed Authorization header.' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { id: string };
    const mfg     = await Manufacturer.findById(payload.id);
    if (!mfg) {
      return res.status(401).json({ error: 'Manufacturer not found.' });
    }

    req.userId = payload.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

