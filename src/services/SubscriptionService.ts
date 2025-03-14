import mongoose from 'mongoose';
import { User, IUser } from '../models/User';

/**
 * Abonelik servis yönetimi
 * Bu servis, abonelik sürelerini takip eder ve otomatik yenileme işlemlerini gerçekleştirir
 */
class SubscriptionService {
  /**
   * Deneme süresi dolan Startup kullanıcılarının ödeme işlemlerini kontrol eder
   * Cron job ile düzenli olarak çalıştırılmalıdır (örn: günlük)
   */
  async checkTrialEndingUsers() {
    try {
      // Deneme süresi bugün veya daha önce biten 'trial' durumundaki kullanıcıları bul
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const users = await User.find({
        subscriptionStatus: 'trial',
        trialEndsAt: { $lte: today }
      });
      
      console.log(`${users.length} kullanıcının deneme süresi dolmuş, otomatik ödeme kontrol ediliyor...`);
      
      for (const user of users) {
        // Her kullanıcı için otomatik ödeme kontrolü yap
        await user.checkAutoRenewal();
      }
      
      return {
        success: true,
        processedCount: users.length
      };
    } catch (error: any) {
      console.error('Abonelik kontrolü sırasında hata:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Aktif aboneliklerin periyodik ödemelerini kontrol eder
   * Cron job ile düzenli olarak çalıştırılmalıdır (örn: günlük)
   */
  async checkRecurringPayments() {
    try {
      // Ödeme tarihi bugün veya daha önce olan 'active' durumundaki kullanıcıları bul
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const users = await User.find({
        subscriptionStatus: 'active',
        nextPaymentDate: { $lte: today },
        autoRenewal: true
      });
      
      console.log(`${users.length} kullanıcının ödeme tarihi gelmiş, otomatik ödeme işlemi yapılıyor...`);
      
      let successCount = 0;
      let failCount = 0;
      
      for (const user of users) {
        try {
          // Ödeme işlemini yap
          const paymentResult = await user.processPayment();
          
          if (paymentResult.success) {
            // Ödeme başarılı ise bir sonraki ödeme tarihini ileri al
            const nextBillingDate = new Date();
            
            // Abonelik periyoduna göre bir sonraki ödeme tarihini belirle
            if (user.subscriptionPeriod === 'monthly') {
              nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
            } else if (user.subscriptionPeriod === 'yearly') {
              nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
            }
            
            user.nextPaymentDate = nextBillingDate;
            user.lastPaymentDate = new Date();
            
            // Ödeme geçmişine ekle
            if (!user.paymentHistory) user.paymentHistory = [];
            user.paymentHistory.push({
              amount: user.subscriptionAmount || 0,
              date: new Date(),
              status: 'success',
              transactionId: paymentResult.transactionId,
              description: `Otomatik ${user.subscriptionPeriod === 'monthly' ? 'aylık' : 'yıllık'} abonelik ödemesi`
            });
            
            await user.save();
            successCount++;
          } else {
            // Başarısız ödeme
            if (!user.paymentHistory) user.paymentHistory = [];
            user.paymentHistory.push({
              amount: user.subscriptionAmount || 0,
              date: new Date(),
              status: 'failed',
              description: `Otomatik ${user.subscriptionPeriod === 'monthly' ? 'aylık' : 'yıllık'} abonelik ödemesi başarısız`
            });
            
            // Başarısız ödeme sayısına göre abonelik durumunu değiştirebiliriz
            // Örnek: 3 kez başarısız ödeme sonrası iptal etme gibi
            await user.save();
            failCount++;
          }
        } catch (error) {
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
    } catch (error: any) {
      console.error('Periyodik ödemelerin kontrolü sırasında hata:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Kullanıcının abonelik planını değiştirir
   * @param userId Kullanıcı ID
   * @param plan Abonelik planı (startup, business, investor)
   * @param period Abonelik periyodu (monthly, yearly)
   * @deprecated Bu metod artık controller'da doğrudan kullanıcıyı güncellemek için kullanılıyor
   */
  async changeSubscriptionPlan(userId: string, plan: 'startup' | 'business' | 'investor', period: 'monthly' | 'yearly') {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('Kullanıcı bulunamadı');
      }
      
      // Abonelik planını ve periyodunu güncelle
      user.subscriptionPlan = plan;
      user.subscriptionPeriod = period;
      
      // Eğer startup planı seçilmişse ve daha önce trial durumunda değilse
      if (plan === 'startup' && user.subscriptionStatus !== 'trial') {
        user.subscriptionStatus = 'trial';
        const trialEndDate = new Date();
        trialEndDate.setMonth(trialEndDate.getMonth() + 3);
        user.trialEndsAt = trialEndDate;
        user.nextPaymentDate = trialEndDate;
      } else if (plan !== 'startup') {
        // Startup dışında bir plan seçilmişse
        user.subscriptionStatus = 'pending'; // Ödeme yapılana kadar pending
        user.trialEndsAt = undefined; // Trial süresini kaldır
        
        // Bir sonraki ödeme tarihini şimdi olarak ayarla (hemen ödeme alınacak)
        user.nextPaymentDate = new Date();
      }
      
      // Abonelik başlangıç tarihini güncelle
      user.subscriptionStartDate = new Date();
      
      await user.save();
      
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
    } catch (error: any) {
      console.error('Abonelik planı değiştirme sırasında hata:', error);
      return {
        success: false,
        error: error.message
      };
    }
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
            trialPeriod: 3 // ay
          },
          yearly: {
            price: 529,
            discount: '10% off'
          }
        }
      },
      business: {
        name: 'Business Plan',
        description: 'For Companies & Enterprises',
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
            discount: '10% off'
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
            discount: '10% off'
          }
        }
      }
    };
    
    return plans;
  }
}

export default new SubscriptionService(); 