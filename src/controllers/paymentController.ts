import axios from 'axios';
import express from 'express';
import { User } from '../models/User';
import mongoose from 'mongoose';

export const processPayment = async (req: express.Request, res: express.Response) => {
    try {
        // @ts-expect-error - req.user tipini IUser olarak kabul ediyoruz
        const userId = req.user?._id;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Oturum açmanız gerekiyor'
            });
        }
        
        const { amount, currency, token, subscriptionPlan, subscriptionPeriod } = req.body;

        // Kullanıcıyı bul ve abonelik bilgilerini güncelle
        const user = await User.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Kullanıcı bulunamadı'
            });
        }
        
        // Abonelik planı ve periyodunu güncelle
        if (subscriptionPlan) {
            user.subscriptionPlan = subscriptionPlan;
        }
        
        if (subscriptionPeriod) {
            user.subscriptionPeriod = subscriptionPeriod;
        }

        let paymentSuccess = false;
        let paymentResponse = null;
        let paymentError = null;

        try {
            // Ödeme işlemi
            const response = await axios.post('https://api.param.com/payments', {
                amount,
                currency,
                token,
            });
            
            paymentSuccess = response.data && response.data.success;
            paymentResponse = response.data;
        } catch (error: any) {
            paymentError = error.message;
            console.error('Ödeme işlemi sırasında hata:', error);
        }
        
        // Ödeme geçmişine ekle (başarılı veya başarısız)
        if (!user.paymentHistory) user.paymentHistory = [];
        user.paymentHistory.push({
            amount: amount || 0,
            date: new Date(),
            status: paymentSuccess ? 'success' : 'failed',
            transactionId: (paymentResponse && paymentResponse.transactionId) || Date.now().toString(),
            description: `${user.subscriptionPlan} planı için ${user.subscriptionPeriod === 'monthly' ? 'aylık' : 'yıllık'} ödeme ${paymentSuccess ? 'başarılı' : 'başarısız'}`
        });
        
        // Abonelik durumunu güncelle
        if (paymentSuccess) {
            // Eğer startup planı seçilmişse, her zaman trial durumuna ayarla
            if (user.subscriptionPlan === 'startup') {
                user.subscriptionStatus = 'trial';
                const trialEndDate = new Date();
                trialEndDate.setMonth(trialEndDate.getMonth() + 3);
                user.trialEndsAt = trialEndDate;
                user.nextPaymentDate = trialEndDate;
            } else {
                user.subscriptionStatus = 'active';
                
                // Bir sonraki ödeme tarihini belirle
                const nextPaymentDate = new Date();
                if (user.subscriptionPeriod === 'monthly') {
                    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
                } else {
                    nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
                }
                user.nextPaymentDate = nextPaymentDate;
                // Trial süresini kaldır
                user.trialEndsAt = undefined;
            }
            
            user.lastPaymentDate = new Date();
        } else {
            // Ödeme başarısız olsa bile, startup planı için trial durumunu ayarla
            if (user.subscriptionPlan === 'startup') {
                user.subscriptionStatus = 'trial';
                const trialEndDate = new Date();
                trialEndDate.setMonth(trialEndDate.getMonth() + 3);
                user.trialEndsAt = trialEndDate;
                user.nextPaymentDate = trialEndDate;
            } else {
                // Diğer planlar için pending durumunda bırak
                user.subscriptionStatus = 'pending';
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
                        isSubscriptionActive: user.isSubscriptionActive
                    }
                }
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'Ödeme işlemi başarısız',
                error: paymentError,
                data: {
                    subscription: {
                        plan: user.subscriptionPlan,
                        period: user.subscriptionPeriod,
                        status: user.subscriptionStatus,
                        startDate: user.subscriptionStartDate,
                        trialEndsAt: user.trialEndsAt,
                        nextPaymentDate: user.nextPaymentDate,
                        isSubscriptionActive: user.isSubscriptionActive
                    }
                }
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Ödeme işlemi sırasında bir hata oluştu',
            error: (error as Error).message,
        });
    }
}; 