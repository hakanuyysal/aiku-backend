// @ts-nocheck - Typescript hatalarını görmezden gel
import express from "express";
import { User, IUser } from "../models/User";
import SubscriptionService from "../services/SubscriptionService";
import mongoose from "mongoose";

/**
 * Tüm abonelik planlarını listeler
 */
export const getSubscriptionPlans = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const plans = SubscriptionService.getSubscriptionPlans();

    res.status(200).json({
      success: true,
      data: plans,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Abonelik planları alınırken bir hata oluştu",
      error: error.message,
    });
  }
};

/**
 * Kullanıcının mevcut abonelik bilgilerini getirir
 */
export const getUserSubscription = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    // @ts-expect-error - req.user tipini IUser olarak kabul ediyoruz
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Oturum açmanız gerekiyor",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı",
      });
    }

    // Abonelik planı bilgilerini al
    const planDetails =
      SubscriptionService.getSubscriptionPlans()[
        user.subscriptionPlan || "startup"
      ];

    res.status(200).json({
      success: true,
      data: {
        subscriptionStatus: user.subscriptionStatus,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionPeriod: user.subscriptionPeriod,
        subscriptionAmount: user.subscriptionAmount,
        subscriptionStartDate: user.subscriptionStartDate,
        trialEndsAt: user.trialEndsAt,
        nextPaymentDate: user.nextPaymentDate,
        lastPaymentDate: user.lastPaymentDate,
        autoRenewal: user.autoRenewal,
        planDetails: planDetails,
        isSubscriptionActive: user.isSubscriptionActive,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Abonelik bilgileri alınırken bir hata oluştu",
      error: error.message,
    });
  }
};

/**
 * Kullanıcının abonelik planını değiştirir
 */
export const changeSubscriptionPlan = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Oturum açmanız gerekiyor",
      });
    }

    const { plan, period } = req.body;

    // Plan ve periyod kontrolü
    if (!plan || !["startup", "business", "investor"].includes(plan)) {
      return res.status(400).json({
        success: false,
        message: "Geçersiz abonelik planı",
      });
    }

    if (!period || !["monthly", "yearly"].includes(period)) {
      return res.status(400).json({
        success: false,
        message: "Geçersiz abonelik periyodu",
      });
    }

    // Kullanıcıyı bul
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı",
      });
    }

    // Abonelik planlarını al
    const subscriptionPlans = SubscriptionService.getSubscriptionPlans();

    // Kullanıcının daha önce bir aboneliği olup olmadığını kontrol et
    const isFirstTimeSubscription =
      !user.paymentHistory || user.paymentHistory.length === 0;

    // Abonelik planını ve periyodunu güncelle
    user.subscriptionPlan = plan as "startup" | "business" | "investor";
    user.subscriptionPeriod = period as "monthly" | "yearly";

    // Eğer startup planı seçilmişse ve kullanıcının ilk aboneliği ise free trial uygula
    if (plan === "startup") {
      const planPricing =
        subscriptionPlans.startup.pricing[period as "monthly" | "yearly"];

      // İlk abonelik ise ve freeTrial sadece ilk abonelikte geçerliyse
      if (
        isFirstTimeSubscription &&
        "isFirstTimeOnly" in planPricing &&
        planPricing.isFirstTimeOnly
      ) {
        user.subscriptionStatus = "trial";
        const trialEndDate = new Date();
        const trialPeriod =
          "trialPeriod" in planPricing ? planPricing.trialPeriod : 6;
        trialEndDate.setMonth(trialEndDate.getMonth() + trialPeriod);
        user.trialEndsAt = trialEndDate;
        user.nextPaymentDate = trialEndDate;
      } else {
        // Daha önce abonelik yapmış bir kullanıcıysa
        user.subscriptionStatus = "pending"; // Ödeme yapılana kadar pending
        user.trialEndsAt = undefined; // Trial süresini kaldır

        // Bir sonraki ödeme tarihini şimdi olarak ayarla (hemen ödeme alınacak)
        user.nextPaymentDate = new Date();
      }
    } else if (period === "yearly") {
      // Business veya Investor planında yıllık abonelikte ek süre ekle
      user.subscriptionStatus = "pending"; // Ödeme yapılana kadar pending
      user.trialEndsAt = undefined; // Trial süresini kaldır

      // Bir sonraki ödeme tarihini şimdi olarak ayarla (hemen ödeme alınacak)
      user.nextPaymentDate = new Date();
    } else {
      // Aylık Business veya Investor planı
      user.subscriptionStatus = "pending"; // Ödeme yapılana kadar pending
      user.trialEndsAt = undefined; // Trial süresini kaldır

      // Bir sonraki ödeme tarihini şimdi olarak ayarla (hemen ödeme alınacak)
      user.nextPaymentDate = new Date();
    }

    // Abonelik başlangıç tarihini güncelle
    user.subscriptionStartDate = new Date();

    await user.save();

    // Abonelik planı bilgilerini al
    // @ts-expect-error - Planlar any tipinde olduğundan indexleme hatası görmezden geliniyor
    const planDetails = SubscriptionService.getSubscriptionPlans()[plan];

    res.status(200).json({
      success: true,
      message: "Abonelik planı başarıyla değiştirildi",
      data: {
        subscriptionPlan: user.subscriptionPlan,
        subscriptionPeriod: user.subscriptionPeriod,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionAmount: user.subscriptionAmount,
        subscriptionStartDate: user.subscriptionStartDate,
        trialEndsAt: user.trialEndsAt,
        nextPaymentDate: user.nextPaymentDate,
        planDetails: planDetails,
        isSubscriptionActive: user.isSubscriptionActive,
        isFirstTimeSubscription: isFirstTimeSubscription,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Abonelik planı değiştirilirken bir hata oluştu",
      error: error.message,
    });
  }
};

/**
 * Kullanıcının otomatik yenileme ayarını değiştirir
 */
export const toggleAutoRenewal = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    // @ts-expect-error - req.user tipini IUser olarak kabul ediyoruz
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Oturum açmanız gerekiyor",
      });
    }

    const { autoRenewal } = req.body;

    if (typeof autoRenewal !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Geçersiz otomatik yenileme değeri",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı",
      });
    }

    user.autoRenewal = autoRenewal;
    await user.save();

    res.status(200).json({
      success: true,
      message: `Otomatik yenileme ${autoRenewal ? "açıldı" : "kapatıldı"}`,
      data: {
        autoRenewal: user.autoRenewal,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Otomatik yenileme ayarı değiştirilirken bir hata oluştu",
      error: error.message,
    });
  }
};

/**
 * Kullanıcının ödeme geçmişini getirir
 */
export const getPaymentHistory = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    // @ts-expect-error - req.user tipini IUser olarak kabul ediyoruz
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Oturum açmanız gerekiyor",
      });
    }

    const user = await User.findById(userId).select("paymentHistory");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı",
      });
    }

    res.status(200).json({
      success: true,
      data: user.paymentHistory || [],
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Ödeme geçmişi alınırken bir hata oluştu",
      error: error.message,
    });
  }
};

/**
 * Aboneliği iptal eder
 */
export const cancelSubscription = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    // @ts-expect-error - req.user tipini IUser olarak kabul ediyoruz
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Oturum açmanız gerekiyor",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı",
      });
    }

    // Aboneliği iptal et
    user.subscriptionStatus = "cancelled";
    user.autoRenewal = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Abonelik başarıyla iptal edildi",
      data: {
        subscriptionStatus: user.subscriptionStatus,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Abonelik iptal edilirken bir hata oluştu",
      error: error.message,
    });
  }
};
