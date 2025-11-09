import express, { Response } from 'express';
import { authenticateUser, AuthRequest } from '../middleware/auth';

const router = express.Router();

// Verify JWT and return user data
router.post('/verify', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'No user found',
      });
    }

    return res.json({
      success: true,
      data: {
        fid: req.user.fid,
        userId: req.user.userId,
        username: req.user.username,
      },
    });
  } catch (error) {
    console.error('Verify error:', error);
    return res.status(500).json({
      success: false,
      error: 'Verification failed',
    });
  }
});

// Get current user profile
router.get('/me', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
    }

    return res.json({
      success: true,
      data: req.user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get user',
    });
  }
});

export default router;
