"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const User_1 = require("../models/User");
/**
 * Abonelik servis yönetimi
 * Bu servis, abonelik sürelerini takip eder ve otomatik yenileme işlemlerini gerçekleştirir
 */
class SubscriptionService {
    /**
     * Deneme süresi dolan Startup kullanıcılarının ödeme işlemlerini kontrol eder
     * Cron job ile düzenli olarak çalıştırılmalıdır (örn: günlük)
     */
    checkTrialEndingUsers() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Deneme süresi bugün veya daha önce biten 'trial' durumundaki kullanıcıları bul
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const users = yield User_1.User.find({
                    subscriptionStatus: 'trial',
                    trialEndsAt: { $lte: today }
                });
                console.log(`${users.length} kullanıcının deneme süresi dolmuş, otomatik ödeme kontrol ediliyor...`);
                for (const user of users) {
                    // Her kullanıcı için otomatik ödeme kontrolü yap
                    yield user.checkAutoRenewal();
                }
                return {
                    success: true,
                    processedCount: users.length
                };
            }
            catch (error) {
                console.error('Abonelik kontrolü sırasında hata:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });
    }
    /**
     * Aktif aboneliklerin periyodik ödemelerini kontrol eder
     * Cron job ile düzenli olarak çalıştırılmalıdır (örn: günlük)
     */
    checkRecurringPayments() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Ödeme tarihi bugün veya daha önce olan 'active' durumundaki kullanıcıları bul
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const users = yield User_1.User.find({
                    subscriptionStatus: 'active',
                    nextPaymentDate: { $lte: today },
                    autoRenewal: true
                });
                console.log(`${users.length} kullanıcının ödeme tarihi gelmiş, otomatik ödeme işlemi yapılıyor...`);
                let successCount = 0;
                let failCount = 0;
                // Abonelik planlarını al
                const subscriptionPlans = this.getSubscriptionPlans();
                for (const user of users) {
                    try {
                        // Ödeme işlemini yap
                        const paymentResult = yield user.processPayment();
                        if (paymentResult.success) {
                            // Ödeme başarılı ise bir sonraki ödeme tarihini ileri al
                            const nextBillingDate = new Date();
                            // Abonelik periyoduna göre bir sonraki ödeme tarihini belirle
                            if (user.subscriptionPeriod === 'monthly') {
                                nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
                            }
                            else if (user.subscriptionPeriod === 'yearly') {
                                // Yıllık abonelik için extra ayları da dikkate al
                                let extraMonths = 0;
                                // Tüm planlar için extraMonths değerini alma
                                if (user.subscriptionPlan === 'startup') {
                                    // Startup planı için extraMonths yok, standart 12 ay
                                    extraMonths = 0;
                                }
                                else if (user.subscriptionPlan === 'business' || user.subscriptionPlan === 'investor') {
                                    // Business ve Investor planları için extraMonths var
                                    extraMonths = 3; // Sabit 3 ay olarak belirtilmiş
                                }
                                nextBillingDate.setMonth(nextBillingDate.getMonth() + 12 + extraMonths);
                            }
                            user.nextPaymentDate = nextBillingDate;
                            user.lastPaymentDate = new Date();
                            // Ödeme geçmişine ekle
                            if (!user.paymentHistory)
                                user.paymentHistory = [];
                            user.paymentHistory.push({
                                amount: user.subscriptionAmount || 0,
                                date: new Date(),
                                status: 'success',
                                transactionId: paymentResult.transactionId,
                                description: `Otomatik ${user.subscriptionPeriod === 'monthly' ? 'aylık' : 'yıllık'} abonelik ödemesi`,
                                plan: user.subscriptionPlan || undefined,
                                period: user.subscriptionPeriod
                            });
                            yield user.save();
                            successCount++;
                        }
                        else {
                            // Başarısız ödeme
                            if (!user.paymentHistory)
                                user.paymentHistory = [];
                            user.paymentHistory.push({
                                amount: user.subscriptionAmount || 0,
                                date: new Date(),
                                status: 'failed',
                                description: `Otomatik ${user.subscriptionPeriod === 'monthly' ? 'aylık' : 'yıllık'} abonelik ödemesi başarısız`,
                                plan: user.subscriptionPlan || undefined,
                                period: user.subscriptionPeriod
                            });
                            // Başarısız ödeme sayısına göre abonelik durumunu değiştirebiliriz
                            // Örnek: 3 kez başarısız ödeme sonrası iptal etme gibi
                            yield user.save();
                            failCount++;
                        }
                    }
                    catch (error) {
                        console.error(`${user._id} ID'li kullanıcı için ödeme işlemi başarısız:`, error);
                        failCount++;
                    }
                }
                return {
                    success: true,
                    totalProcessed: users.length,
                    successCount,
                    failCount
                };
            }
            catch (error) {
                console.error('Periyodik ödemelerin kontrolü sırasında hata:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });
    }
    /**
     * Kullanıcının abonelik planını değiştirir
     * @param userId Kullanıcı ID
     * @param plan Abonelik planı (startup, business, investor)
     * @param period Abonelik periyodu (monthly, yearly)
     * @deprecated Bu metod artık controller'da doğrudan kullanıcıyı güncellemek için kullanılıyor
     */
    changeSubscriptionPlan(userId, plan, period) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const user = yield User_1.User.findById(userId);
                if (!user) {
                    throw new Error('Kullanıcı bulunamadı');
                }
                // Abonelik planını ve periyodunu güncelle
                user.subscriptionPlan = plan;
                user.subscriptionPeriod = period;
                // Eğer startup planı seçilmişse, her zaman trial durumuna ayarla
                if (plan === 'startup') {
                    user.subscriptionStatus = 'trial';
                    const trialEndDate = new Date();
                    trialEndDate.setMonth(trialEndDate.getMonth() + 3);
                    user.trialEndsAt = trialEndDate;
                    user.nextPaymentDate = trialEndDate;
                }
                else {
                    // Startup dışında bir plan seçilmişse
                    user.subscriptionStatus = 'pending'; // Ödeme yapılana kadar pending
                    user.trialEndsAt = undefined; // Trial süresini kaldır
                    // Bir sonraki ödeme tarihini şimdi olarak ayarla (hemen ödeme alınacak)
                    user.nextPaymentDate = new Date();
                }
                // Abonelik başlangıç tarihini güncelle
                user.subscriptionStartDate = new Date();
                yield user.save();
                return {
                    success: true,
                    user: {
                        _id: user._id,
                        subscriptionPlan: user.subscriptionPlan,
                        subscriptionPeriod: user.subscriptionPeriod,
                        subscriptionAmount: user.subscriptionAmount,
                        subscriptionStatus: user.subscriptionStatus,
                        subscriptionStartDate: user.subscriptionStartDate,
                        trialEndsAt: user.trialEndsAt,
                        nextPaymentDate: user.nextPaymentDate
                    }
                };
            }
            catch (error) {
                console.error('Abonelik planı değiştirme sırasında hata:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });
    }
    /**
     * Abonelik planlarını ve fiyatlarını döndürür
     */
    getSubscriptionPlans() {
        const plans = {
            startup: {
                name: 'Startup Plan',
                description: 'For AI Startups & Developers',
                features: [
                    'List AI solutions',
                    'Get investor access',
                    'Use premium AI tools'
                ],
                pricing: {
                    monthly: {
                        price: 49,
                        trialPeriod: 3, // ay
                        isFirstTimeOnly: true // Sadece ilk abonelikte geçerli
                    },
                    yearly: {
                        price: 529,
                        discount: '10% off',
                        trialPeriod: 3, // ay
                        isFirstTimeOnly: true // Sadece ilk abonelikte geçerli
                    }
                }
            },
            business: {
                name: 'Business Plan',
                description: 'For Companies & Businesss',
                features: [
                    'AI discovery',
                    'API integrations',
                    'Exclusive tools'
                ],
                pricing: {
                    monthly: {
                        price: 75
                    },
                    yearly: {
                        price: 810,
                        discount: '10% off',
                        extraMonths: 3 // Yıllık ödemede 3 ay fazla (12+3=15 ay)
                    }
                }
            },
            investor: {
                name: 'Investor Plan',
                description: 'For VCs & Angel Investors',
                features: [
                    'AI startup deal flow',
                    'Analytics',
                    'AI-powered investment insights'
                ],
                pricing: {
                    monthly: {
                        price: 99
                    },
                    yearly: {
                        price: 1069,
                        discount: '10% off',
                        extraMonths: 3 // Yıllık ödemede 3 ay fazla (12+3=15 ay)
                    }
                }
            }
        };
        return plans;
    }
}
exports.default = new SubscriptionService();
