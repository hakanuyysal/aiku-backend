import axios from "axios";
import express from "express";
import { User } from "../models/User";
import mongoose from "mongoose";
import SubscriptionService from "../services/SubscriptionService";

export const processPayment = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const userId = req.user?._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Oturum açmanız gerekiyor"
      });
    }
    
    const { amount, currency, token, subscriptionPlan, subscriptionPeriod } = req.body;

    // Kullanıcıyı bul ve abonelik bilgilerini güncelle
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı"
      });
    }
    
    // Abonelik planlarını al
    const subscriptionPlans = SubscriptionService.getSubscriptionPlans();
    
    // Kullanıcının daha önce bir aboneliği olup olmadığını kontrol et
    const isFirstTimeSubscription = 
      !user.paymentHistory || user.paymentHistory.length === 0;
    
    // Abonelik planı ve periyodunu güncelle
    if (subscriptionPlan && ['startup', 'business', 'investor'].includes(subscriptionPlan)) {
      user.subscriptionPlan = subscriptionPlan as 'startup' | 'business' | 'investor';
    }
    
    if (subscriptionPeriod && ['monthly', 'yearly'].includes(subscriptionPeriod)) {
      user.subscriptionPeriod = subscriptionPeriod as 'monthly' | 'yearly';
    }

    let paymentSuccess = false;
    let paymentResponse = null;
    let paymentError = null;

    try {
      // Ödeme işlemi
      const response = await axios.post("https://api.param.com/payments", {
        amount,
        currency,
        token,
      });
      
      paymentSuccess = response.data && response.data.success;
      paymentResponse = response.data;
    } catch (error: any) {
      paymentError = error.message;
      console.error("Ödeme işlemi sırasında hata:", error);
    }
    
    // Ödeme geçmişine ekle (başarılı veya başarısız)
    if (!user.paymentHistory) user.paymentHistory = [];
    user.paymentHistory.push({
      amount: amount || 0,
      date: new Date(),
      status: paymentSuccess ? "success" : "failed",
      transactionId: (paymentResponse && paymentResponse.transactionId) || Date.now().toString(),
      description: `${user.subscriptionPlan} planı için ${user.subscriptionPeriod === "monthly" ? "aylık" : "yıllık"} ödeme ${paymentSuccess ? "başarılı" : "başarısız"}`,
      plan: user.subscriptionPlan || undefined,
      period: user.subscriptionPeriod
    });
    
    // Abonelik durumunu güncelle
    if (paymentSuccess) {
      // Eğer startup planı seçilmişse ve ilk abonelikse trial durumuna ayarla
      if (user.subscriptionPlan === "startup" && isFirstTimeSubscription) {
        const planPricing = user.subscriptionPeriod ? 
          subscriptionPlans.startup.pricing[user.subscriptionPeriod] : 
          null;
        
        const hasTrial = planPricing && "isFirstTimeOnly" in planPricing && planPricing.isFirstTimeOnly;
        const trialPeriod = planPricing && "trialPeriod" in planPricing ? planPricing.trialPeriod : 3;
        
        if (hasTrial) {
          user.subscriptionStatus = "trial";
          const trialEndDate = new Date();
          trialEndDate.setMonth(trialEndDate.getMonth() + trialPeriod);
          user.trialEndsAt = trialEndDate;
          user.nextPaymentDate = trialEndDate;
        } else {
          // Free trial yoksa aktif duruma geçir
          user.subscriptionStatus = "active";
          user.trialEndsAt = undefined;
          
          // Bir sonraki ödeme tarihini belirle (aylık)
          const nextPaymentDate = new Date();
          nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
          user.nextPaymentDate = nextPaymentDate;
        }
      } else if (user.subscriptionPeriod === "yearly" && user.subscriptionPlan) {
        // Yıllık abonelik için
        user.subscriptionStatus = "active";
        user.trialEndsAt = undefined;
        
        // Bir sonraki ödeme tarihini belirle (yıllık + extra aylar)
        const nextPaymentDate = new Date();
        
        // Extra ay sayısını belirle
        let extraMonths = 0;
        if (user.subscriptionPlan === "business" || user.subscriptionPlan === "investor") {
          extraMonths = 3; // Yıllık abonelikte ekstra 3 ay
        }
        
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 12 + extraMonths);
        user.nextPaymentDate = nextPaymentDate;
      } else {
        // Diğer durumlarda (aylık business/investor)
        user.subscriptionStatus = "active";
        
        // Bir sonraki ödeme tarihini belirle (aylık)
        const nextPaymentDate = new Date();
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
        user.nextPaymentDate = nextPaymentDate;
        
        // Trial süresini kaldır
        user.trialEndsAt = undefined;
      }
      
      user.lastPaymentDate = new Date();
    } else {
      // Ödeme başarısız olsa bile, startup planı için ve ilk abonelikse trial durumunu ayarla
      if (user.subscriptionPlan === "startup" && isFirstTimeSubscription) {
        const planPricing = user.subscriptionPeriod ? 
          subscriptionPlans.startup.pricing[user.subscriptionPeriod] : 
          null;
        
        const hasTrial = planPricing && "isFirstTimeOnly" in planPricing && planPricing.isFirstTimeOnly;
        const trialPeriod = planPricing && "trialPeriod" in planPricing ? planPricing.trialPeriod : 3;
        
        if (hasTrial) {
          user.subscriptionStatus = "trial";
          const trialEndDate = new Date();
          trialEndDate.setMonth(trialEndDate.getMonth() + trialPeriod);
          user.trialEndsAt = trialEndDate;
          user.nextPaymentDate = trialEndDate;
        } else {
          // Diğer planlar için pending durumunda bırak
          user.subscriptionStatus = "pending";
        }
      } else {
        // Diğer planlar için pending durumunda bırak
        user.subscriptionStatus = "pending";
      }
    }
    
    // Abonelik başlangıç tarihini her durumda güncelle
    user.subscriptionStartDate = new Date();
    
    // Değişiklikleri kaydet
    await user.save();

    // Yanıt döndür
    if (paymentSuccess) {
      res.status(200).json({
        success: true,
        data: {
          paymentResult: paymentResponse,
          subscription: {
            plan: user.subscriptionPlan,
            period: user.subscriptionPeriod,
            status: user.subscriptionStatus,
            startDate: user.subscriptionStartDate,
            trialEndsAt: user.trialEndsAt,
            nextPaymentDate: user.nextPaymentDate,
            isSubscriptionActive: user.isSubscriptionActive,
            isFirstTimeSubscription: isFirstTimeSubscription
          }
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Ödeme işlemi başarısız",
        error: paymentError,
        data: {
          subscription: {
            plan: user.subscriptionPlan,
            period: user.subscriptionPeriod,
            status: user.subscriptionStatus,
            startDate: user.subscriptionStartDate,
            trialEndsAt: user.trialEndsAt,
            nextPaymentDate: user.nextPaymentDate,
            isSubscriptionActive: user.isSubscriptionActive,
            isFirstTimeSubscription: isFirstTimeSubscription
          }
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Ödeme işlemi sırasında bir hata oluştu",
      error: (error as Error).message,
    });
  }
};

/**
 * Ücretsiz abonelik için ödeme bilgisini kaydeder
 */
export const recordFreePayment = async (
  req: express.Request,
  res: express.Response
) => {
  try {
    const userId = req.user?._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Oturum açmanız gerekiyor"
      });
    }
    
    const { 
      amount, 
      description, 
      planName, 
      billingCycle, 
      originalPrice, 
      billingInfo,
      isFirstPayment,
      paymentDate
    } = req.body;

    // Kullanıcıyı bul
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı"
      });
    }
    
    // Plan tipini belirle
    let subscriptionPlan: 'startup' | 'business' | 'investor' | null = null;
    if (planName.toLowerCase().includes('startup')) {
      subscriptionPlan = 'startup';
    } else if (planName.toLowerCase().includes('business')) {
      subscriptionPlan = 'business';
    } else if (planName.toLowerCase().includes('investor')) {
      subscriptionPlan = 'investor';
    }
    
    // Abonelik periyodunu belirle
    const subscriptionPeriod = billingCycle === 'monthly' ? 'monthly' : 'yearly';
    
    // Abonelik durumunu güncelle
    user.subscriptionPlan = subscriptionPlan;
    user.subscriptionPeriod = subscriptionPeriod;
    user.subscriptionStatus = 'active';
    user.subscriptionStartDate = new Date(paymentDate) || new Date();
    user.isSubscriptionActive = true;
    user.lastPaymentDate = new Date(paymentDate) || new Date();
    
    // Bir sonraki ödeme tarihini belirle
    const nextPaymentDate = new Date(paymentDate) || new Date();
    if (subscriptionPeriod === 'monthly') {
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
    } else {
      nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
    }
    user.nextPaymentDate = nextPaymentDate;
    
    // İlk abonelik ise ve startup planı ise trial durumunu ayarla
    if (isFirstPayment && subscriptionPlan === 'startup') {
      const subscriptionPlans = SubscriptionService.getSubscriptionPlans();
      const planPricing = subscriptionPeriod ? 
        subscriptionPlans.startup.pricing[subscriptionPeriod] : 
        null;
      
      const hasTrial = planPricing && "isFirstTimeOnly" in planPricing && planPricing.isFirstTimeOnly;
      const trialPeriod = planPricing && "trialPeriod" in planPricing ? planPricing.trialPeriod : 3;
      
      if (hasTrial) {
        user.subscriptionStatus = "trial";
        const trialEndDate = new Date(paymentDate) || new Date();
        trialEndDate.setMonth(trialEndDate.getMonth() + trialPeriod);
        user.trialEndsAt = trialEndDate;
        user.nextPaymentDate = trialEndDate;
      }
    }
    
    // Ödeme geçmişine ekle
    if (!user.paymentHistory) user.paymentHistory = [];
    user.paymentHistory.push({
      amount: amount || 0,
      date: new Date(paymentDate) || new Date(),
      status: 'success',
      transactionId: `free-${Date.now()}`,
      description: description || `Ücretsiz abonelik: ${planName}`,
      plan: subscriptionPlan || undefined,
      period: subscriptionPeriod
    });
    
    // Değişiklikleri kaydet
    await user.save();
    
    res.status(200).json({
      success: true,
      data: {
        subscription: {
          plan: user.subscriptionPlan,
          period: user.subscriptionPeriod,
          status: user.subscriptionStatus,
          startDate: user.subscriptionStartDate,
          trialEndsAt: user.trialEndsAt,
          nextPaymentDate: user.nextPaymentDate,
          isSubscriptionActive: user.isSubscriptionActive
        },
        paymentHistory: user.paymentHistory[user.paymentHistory.length - 1]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Ücretsiz abonelik kaydı sırasında bir hata oluştu",
      error: (error as Error).message,
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
