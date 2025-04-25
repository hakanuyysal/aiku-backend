import express from 'express';
import { CouponController } from '../controllers/couponController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const couponController = new CouponController();

// Routes (admin kontrolü olmadan)
router.post('/', authenticateToken, couponController.createCoupon);
router.get('/', authenticateToken, couponController.listCoupons);
router.delete('/:code', authenticateToken, couponController.deactivateCoupon);

// User routes
router.post('/validate', authenticateToken, couponController.validateCoupon);
router.post('/apply', authenticateToken, couponController.applyCoupon);

export default router; 