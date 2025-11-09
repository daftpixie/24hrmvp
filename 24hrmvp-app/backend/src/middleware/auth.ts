import { Request, Response, NextFunction } from 'express';
import { verifyQuickAuthJWT } from '../services/quickAuth';
import { prisma } from '../db/client';

export interface AuthRequest extends Request {
  user?: {
    fid: number;
    userId: string;
    username: string;
  };
}

export async function authenticateUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'No authorization token provided',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    const result = await verifyQuickAuthJWT(token);

    if (!result.success || !result.payload) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
      return;
    }

    // Find or create user in database
    const user = await prisma.user.upsert({
      where: { fid: result.payload.fid },
      update: {
        username: result.payload.username,
        displayName: result.payload.displayName,
        pfpUrl: result.payload.pfpUrl,
        custodyAddress: result.payload.custody,
        verifications: result.payload.verifications,
      },
      create: {
        fid: result.payload.fid,
        username: result.payload.username,
        displayName: result.payload.displayName,
        pfpUrl: result.payload.pfpUrl,
        custodyAddress: result.payload.custody,
        verifications: result.payload.verifications,
      },
    });

    req.user = {
      fid: user.fid,
      userId: user.id,
      username: user.username,
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
    return;
  }
}

export function optionalAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  authenticateUser(req, res, (_err) => {
    // Continue even if auth fails
    next();
  }).catch(() => next());
}
