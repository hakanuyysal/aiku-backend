import express from 'express';
import { CouponController, createCouponSchema, validateCouponSchema, applyCouponSchema } from '../controllers/couponController';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';

const router = express.Router();
const couponController = new CouponController();

// Routes (admin kontrolü olmadan)
router.post('/', authenticateToken, validateRequest(createCouponSchema), couponController.createCoupon);
router.get('/', authenticateToken, couponController.listCoupons);
router.delete('/:code', authenticateToken, couponController.deactivateCoupon);

// User routes
router.post('/validate', authenticateToken, validateRequest(validateCouponSchema), couponController.validateCoupon);
router.post('/apply', authenticateToken, validateRequest(applyCouponSchema), couponController.applyCoupon);

export default router; 