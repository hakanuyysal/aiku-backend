import express from 'express';
import {
  createComplaint,
  getUserComplaints,
  getAllComplaints,
  updateComplaintStatus,
} from '../controllers/complaintController';
import { protect, adminProtect } from '../middleware/auth';
import { check } from 'express-validator';

const router = express.Router();

// Yeni bir şikayet oluşturma
// POST /api/complaints
router.post(
  '/',
  protect,
  [
    check('messageId', 'Message ID is required').not().isEmpty(),
    check('complaintType', 'Complaint type is required').not().isEmpty(),
  ],
  createComplaint
);

// Kullanıcının kendi şikayetlerini getirme
// GET /api/complaints/user
router.get('/user', protect, getUserComplaints);

// Admin: Tüm şikayetleri getirme
// GET /api/complaints/all
router.get('/all', protect, adminProtect, getAllComplaints);

// Admin: Şikayet durumunu güncelleme
// PATCH /api/complaints/:complaintId
router.patch(
  '/:complaintId',
  protect,
  adminProtect,
  [
    check('status', 'Status is required').isIn([
      'pending',
      'reviewed',
      'resolved',
      'rejected',
    ]),
  ],
  updateComplaintStatus
);

export default router; 