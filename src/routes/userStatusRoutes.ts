import express from 'express';
import {
  getOnlineUsers,
  getUserStatus,
  getUsersStatus,
  updateLastSeen,
  getOnlineUsersCount
} from '../controllers/userStatusController';

const router = express.Router();

// Get online users list
router.get('/online', getOnlineUsers);

// Get online users count
router.get('/online/count', getOnlineUsersCount);

// Get specific user status
router.get('/:userId', getUserStatus);

// Get multiple users status
router.post('/batch', getUsersStatus);

// Update current user's last seen (requires authentication)
router.put('/last-seen', updateLastSeen);

export default router;