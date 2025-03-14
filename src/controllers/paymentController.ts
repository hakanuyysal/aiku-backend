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

        // Ödeme işlemi
        const response = await axios.post('https://api.param.com/payments', {
            amount,
            currency,
            token,
        });
        
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
        
        // Ödeme başarılıysa abonelik durumunu güncelle
        if (response.data && response.data.success) {
            // Eğer startup planı seçilmişse ve daha önce trial durumunda değilse
            if (user.subscriptionPlan === 'startup' && user.subscriptionStatus !== 'trial') {
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
            }
            
            // Ödeme geçmişine ekle
            if (!user.paymentHistory) user.paymentHistory = [];
            user.paymentHistory.push({
                amount: amount,
                date: new Date(),
                status: 'success',
                transactionId: response.data.transactionId || Date.now().toString(),
                description: `${user.subscriptionPlan} planı için ${user.subscriptionPeriod === 'monthly' ? 'aylık' : 'yıllık'} ödeme`
            });
            
            user.lastPaymentDate = new Date();
            user.subscriptionStartDate = new Date();
            
            await user.save();
        }

        res.status(200).json({
            success: true,
            data: {
                paymentResult: response.data,
                subscription: {
                    plan: user.subscriptionPlan,
                    period: user.subscriptionPeriod,
                    status: user.subscriptionStatus,
                    startDate: user.subscriptionStartDate,
                    trialEndsAt: user.trialEndsAt,
                    nextPaymentDate: user.nextPaymentDate
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Ödeme işlemi başarısız',
            error: (error as Error).message,
        });
    }
}; 