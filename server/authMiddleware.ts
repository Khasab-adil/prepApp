import { Request, Response, NextFunction } from 'express';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';
import firebaseConfig from '../firebase-applet-config.json';

if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const adminAuth = getAuth();

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ error: 'Missing authentication token.' });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.user = decoded;
    return next();
  } catch (err) {
    console.error('Token verification failed:', err instanceof Error ? err.message : 'Unknown error');
    return res.status(401).json({ error: 'Invalid or expired session token. Please sign in again.' });
  }
}

// Sliding-window in-memory rate limiter for AI endpoints (per user UID)
const userRequestTimestamps = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 25;

export function aiRateLimiter(req: AuthRequest, res: Response, next: NextFunction) {
  const key = req.user?.uid || req.ip || 'anonymous';
  const now = Date.now();
  const timestamps = (userRequestTimestamps.get(key) || []).filter((ts) => now - ts < WINDOW_MS);

  if (timestamps.length >= MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      error: 'AI request rate limit reached. Please wait a few seconds before sending another request.',
    });
  }

  timestamps.push(now);
  userRequestTimestamps.set(key, timestamps);
  return next();
}
