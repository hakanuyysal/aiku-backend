import { Request, Response } from 'express';
import { CouponService } from '../services/couponService';
import { validateRequest } from '../middleware/validateRequest';
import { z } from 'zod';

const couponService = new CouponService();

// Validation schemas
const createCouponSchema = z.object({
  code: z.string().min(3).max(20),
  planType: z.enum(['STARTUP_MONTHLY', 'STARTUP_YEARLY', 'BUSINESS_MONTHLY', 'BUSINESS_YEARLY', 'INVESTOR_MONTHLY', 'INVESTOR_YEARLY']),
  discountRate: z.number().min(0).max(100),
});

const validateCouponSchema = z.object({
  couponCode: z.string(),
  planType: z.enum(['STARTUP_MONTHLY', 'STARTUP_YEARLY', 'BUSINESS_MONTHLY', 'BUSINESS_YEARLY', 'INVESTOR_MONTHLY', 'INVESTOR_YEARLY'])
});

export class CouponController {
  async createCoupon(req: Request, res: Response) {
    const { code, planType, discountRate } = await validateRequest(req.body, createCouponSchema);
    const coupon = await couponService.createCoupon(code, planType, discountRate);
    res.status(201).json(coupon);
  }

  async validateCoupon(req: Request, res: Response) {
    const { couponCode, planType } = await validateRequest(req.body, validateCouponSchema);
    const userId = req.user.id;
    
    const coupon = await couponService.validateCoupon(couponCode, userId, planType);
    res.json({
      isValid: true,
      discountRate: coupon.discountRate,
      planType: coupon.planType,
    });
  }

  async applyCoupon(req: Request, res: Response) {
    const { couponCode } = await validateRequest(req.body, validateCouponSchema);
    const userId = req.user.id;
    
    const coupon = await couponService.applyCoupon(couponCode, userId);
    res.json(coupon);
  }

  async listCoupons(req: Request, res: Response) {
    const isActive = req.query.isActive === 'true' ? true : 
                    req.query.isActive === 'false' ? false : 
                    undefined;
    
    const coupons = await couponService.listCoupons(isActive);
    res.json(coupons);
  }

  async deactivateCoupon(req: Request, res: Response) {
    const { code } = req.params;
    const coupon = await couponService.deactivateCoupon(code);
    res.json(coupon);
  }
} 