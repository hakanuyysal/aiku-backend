// src/routes/claimRequestRoutes.ts

import { Router } from 'express';
import {
    requestClaim,
    listClaimRequests,
    approveClaimRequest,
    rejectClaimRequest,
    listMyClaimRequests
} from '../controllers/claimRequestController';
import { protect } from '../middleware/auth';

const router = Router();

// Kullanıcı: bir şirkete claim talebi oluşturma
// POST /api/claim-requests/:companyId
router.post('/:companyId', protect, requestClaim);

// Admin: tüm claim taleplerini listeleme
// GET /api/claim-requests
router.get('/', protect, listClaimRequests);

router.get('/my', protect, listMyClaimRequests);

// Admin: bir talebi onaylama
// PATCH /api/claim-requests/:id/approve
router.patch('/:id/approve', protect, approveClaimRequest);

// Admin: bir talebi reddetme
// PATCH /api/claim-requests/:id/reject
router.patch('/:id/reject', protect, rejectClaimRequest);

export default router;
