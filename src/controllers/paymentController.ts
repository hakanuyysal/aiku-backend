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
