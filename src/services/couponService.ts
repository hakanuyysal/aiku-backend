import Coupon, { ICoupon } from "../models/Coupon";
import { Types } from "mongoose";
import { BadRequestError, NotFoundError } from "../utils/errors";

export class CouponService {
  async createCoupon(
    code: string,
    planType: string,
    discountRate: number
  ): Promise<ICoupon> {
    const existingCoupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (existingCoupon) {
      throw new BadRequestError("Coupon code already exists");
    }

    const coupon = new Coupon({
      code: code.toUpperCase(),
      planType,
      discountRate,
    });

    return await coupon.save();
  }

  async validateCoupon(
    code: string,
    userId: string,
    planType: string
  ): Promise<ICoupon> {
    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon) {
      throw new NotFoundError("Coupon not found");
    }

    if (!coupon.isActive) {
      throw new BadRequestError("This coupon is no longer valid");
    }

    if (coupon.usedBy.some((id) => id.toString() === userId)) {
      throw new BadRequestError("You have already used this coupon");
    }

    if (coupon.planType !== planType) {
      throw new BadRequestError("This coupon is not valid for the selected plan");
    }

    return coupon;
  }

  async applyCoupon(couponCode: string, userId: string): Promise<ICoupon> {
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
    if (!coupon) {
      throw new NotFoundError("Coupon not found");
    }

    coupon.usedBy.push(userId);
    return await coupon.save();
  }

  async listCoupons(isActive?: boolean): Promise<ICoupon[]> {
    const query = isActive !== undefined ? { isActive } : {};
    return await Coupon.find(query);
  }

  async deactivateCoupon(code: string): Promise<ICoupon> {
    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (!coupon) {
      throw new NotFoundError("Coupon not found");
    }

    coupon.isActive = false;
    return await coupon.save();
  }
}
