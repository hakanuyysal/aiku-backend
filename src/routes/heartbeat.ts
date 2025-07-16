import { Router, Request, Response } from 'express';
import { protect } from '../middleware/auth';
import { User, IUser } from '../models/User';

const router = Router();

router.post('/', protect, async (req: Request, res: Response) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const user = req.user as IUser;
    const userId = user.id;

    try {
        await User.findByIdAndUpdate(userId, {
            $set: { lastSeen: new Date(), isOnline: true }
        });
        // console.log(`[Heartbeat] User ${userId} marked online at ${new Date().toISOString()}`);
        res.sendStatus(200);
    } catch (err) {
        console.error('Heartbeat error:', err);
        res.sendStatus(500);
    }
});

export default router;
