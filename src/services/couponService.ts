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
      throw new BadRequestError("Kupon kodu zaten mevcut");
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
      throw new NotFoundError("Kupon bulunamadı");
    }

    if (!coupon.isActive) {
      throw new BadRequestError("Bu kupon artık geçerli değil");
    }

    if (coupon.usedBy.some((id) => id.toString() === userId)) {
      throw new BadRequestError("Bu kuponu daha önce kullandınız");
    }

    if (coupon.planType !== planType) {
      throw new BadRequestError("Bu kupon seçilen plan için geçerli değil");
    }

    return coupon;
  }

  async applyCoupon(code: string, userId: string): Promise<ICoupon> {
    const coupon = await Coupon.findOne({ code: code.toUpperCase() });
    if (!coupon) {
      throw new NotFoundError("Kupon bulunamadı");
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
      throw new NotFoundError("Kupon bulunamadı");
    }

    coupon.isActive = false;
    return await coupon.save();
  }
}
