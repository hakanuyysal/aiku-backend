import { Request, Response } from "express";
import { CouponService } from "../services/couponService";
import { z } from "zod";

const couponService = new CouponService();

// Validation schemas
export const createCouponSchema = z.object({
  code: z
    .string()
    .min(3, "Coupon code must be at least 3 characters")
    .max(20, "Coupon code must be at most 20 characters"),
  planType: z.enum([
    "STARTUP_MONTHLY",
    "STARTUP_YEARLY",
    "BUSINESS_MONTHLY",
    "BUSINESS_YEARLY",
    "INVESTOR_MONTHLY",
    "INVESTOR_YEARLY",
  ]),
  discountRate: z
    .number()
    .min(0, "Discount rate must be at least 0")
    .max(100, "Discount rate must be at most 100"),
});

export const validateCouponSchema = z.object({
  couponCode: z.string(),
  planType: z.enum([
    "STARTUP_MONTHLY",
    "STARTUP_YEARLY",
    "BUSINESS_MONTHLY",
    "BUSINESS_YEARLY",
    "INVESTOR_MONTHLY",
    "INVESTOR_YEARLY",
  ]),
});

export const applyCouponSchema = z.object({
  couponCode: z.string(),
  planType: z.enum([
    "STARTUP_MONTHLY",
    "STARTUP_YEARLY",
    "BUSINESS_MONTHLY",
    "BUSINESS_YEARLY",
    "INVESTOR_MONTHLY",
    "INVESTOR_YEARLY",
  ]),
});

type CreateCouponType = z.infer<typeof createCouponSchema>;
type ValidateCouponType = z.infer<typeof validateCouponSchema>;
type ApplyCouponType = z.infer<typeof applyCouponSchema>;

export class CouponController {
  async createCoupon(req: Request, res: Response) {
    try {
      const { code, planType, discountRate } = req.body as CreateCouponType;
      
      const coupon = await couponService.createCoupon(
        code,
        planType,
        discountRate
      );
      res.status(201).json(coupon);
    } catch (error) {
      const err = error as Error;
      res.status(400).json({ error: err.message });
    }
  }

  async validateCoupon(req: Request, res: Response) {
    try {
      const { couponCode, planType } = req.body as ValidateCouponType;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const coupon = await couponService.validateCoupon(
        couponCode,
        userId,
        planType
      );
      res.json({
        isValid: true,
        discountRate: coupon.discountRate,
        planType: coupon.planType,
      });
    } catch (error) {
      const err = error as Error;
      res.status(400).json({ error: err.message });
    }
  }

  async applyCoupon(req: Request, res: Response) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Oturum açmanız gerekiyor",
        });
      }

      const { couponCode, planType } = req.body as ApplyCouponType;
      const userId = req.user.id;

      if (!couponCode) {
        return res.status(400).json({
          success: false,
          message: "Kupon kodu gereklidir",
        });
      }

      await couponService.validateCoupon(couponCode, userId, planType);
      const coupon = await couponService.applyCoupon(couponCode, userId);
      
      res.json({
        success: true,
        coupon,
      });
    } catch (error) {
      const err = error as Error & { status?: number };
      res.status(err.status || 400).json({
        success: false,
        message: err.message || "Kupon uygulanırken bir hata oluştu",
      });
    }
  }

  async listCoupons(req: Request, res: Response) {
    const isActive =
      req.query.isActive === "true"
        ? true
        : req.query.isActive === "false"
        ? false
        : undefined;

    const coupons = await couponService.listCoupons(isActive);
    res.json(coupons);
  }

  async deactivateCoupon(req: Request, res: Response) {
    const { code } = req.params;
    const coupon = await couponService.deactivateCoupon(code);
    res.json(coupon);
  }
}
