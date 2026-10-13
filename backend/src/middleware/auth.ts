import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../db/database';

const JWT_SECRET = process.env.JWT_SECRET || 'goflyp_jwt_secret_alliance_university_campus_ride_split_2026_super_secure';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: 'captain' | 'rider' | 'both' | 'admin';
  isVerified: boolean;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. No token provided.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const userRow = db.prepare(`
      SELECT id, email, full_name, role, is_verified 
      FROM users 
      WHERE id = ?
    `).get(decoded.id) as any;

    if (!userRow) {
      res.status(401).json({ error: 'Invalid session. User no longer exists.' });
      return;
    }

    req.user = {
      id: userRow.id,
      email: userRow.email,
      fullName: userRow.full_name,
      role: userRow.role,
      isVerified: Boolean(userRow.is_verified),
    };

    next();
  } catch (err) {
    res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
  }
}

export function requireCaptain(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  if (req.user.role !== 'captain' && req.user.role !== 'both' && req.user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden. Captain role permissions required to publish or manage rides.' });
    return;
  }

  next();
}

export function requireRider(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  if (req.user.role !== 'rider' && req.user.role !== 'both' && req.user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden. Rider role permissions required to search or book seats.' });
    return;
  }

  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden. Administrator authorization required.' });
    return;
  }

  next();
}

export function requireVerifiedStudent(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user || !req.user.isVerified) {
    res.status(403).json({
      error: 'Campus verification required. Please submit your Alliance University student ID for approval.',
      needsVerification: true,
    });
    return;
  }

  next();
}
