import mongoose from 'mongoose';
import { Company, ICompany } from '../models/Company';

/**
 * Abonelik servis yönetimi
 * Bu servis, abonelik sürelerini takip eder ve otomatik yenileme işlemlerini gerçekleştirir
 */
class SubscriptionService {
  /**
   * Deneme süresi dolan Startup şirketlerinin ödeme işlemlerini kontrol eder
   * Cron job ile düzenli olarak çalıştırılmalıdır (örn: günlük)
   */
  async checkTrialEndingCompanies() {
    try {
      // Deneme süresi bugün veya daha önce biten 'trial' durumundaki şirketleri bul
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const companies = await Company.find({
        subscriptionStatus: 'trial',
        trialEndsAt: { $lte: today }
      });
      
      console.log(`${companies.length} şirketin deneme süresi dolmuş, otomatik ödeme kontrol ediliyor...`);
      
      for (const company of companies) {
        // Her şirket için otomatik ödeme kontrolü yap
        await company.checkAutoRenewal();
      }
      
      return {
        success: true,
        processedCount: companies.length
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
   * Aktif aboneliklerin aylık ödemelerini kontrol eder
   * Cron job ile düzenli olarak çalıştırılmalıdır (örn: günlük)
   */
  async checkMonthlyPayments() {
    try {
      // Ödeme tarihi bugün veya daha önce olan 'active' durumundaki şirketleri bul
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const companies = await Company.find({
        subscriptionStatus: 'active',
        nextPaymentDate: { $lte: today },
        autoRenewal: true
      });
      
      console.log(`${companies.length} şirketin ödeme tarihi gelmiş, otomatik ödeme işlemi yapılıyor...`);
      
      let successCount = 0;
      let failCount = 0;
      
      for (const company of companies) {
        try {
          // Ödeme işlemini yap
          const paymentResult = await company.processPayment();
          
          if (paymentResult.success) {
            // Ödeme başarılı ise bir sonraki ödeme tarihini 1 ay ilerlet
            const nextBillingDate = new Date();
            nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
            
            company.nextPaymentDate = nextBillingDate;
            company.lastPaymentDate = new Date();
            
            // Ödeme geçmişine ekle
            if (!company.paymentHistory) company.paymentHistory = [];
            company.paymentHistory.push({
              amount: company.subscriptionAmount || 0,
              date: new Date(),
              status: 'success',
              transactionId: paymentResult.transactionId,
              description: 'Otomatik aylık abonelik ödemesi'
            });
            
            await company.save();
            successCount++;
          } else {
            // Başarısız ödeme
            if (!company.paymentHistory) company.paymentHistory = [];
            company.paymentHistory.push({
              amount: company.subscriptionAmount || 0,
              date: new Date(),
              status: 'failed',
              description: 'Otomatik aylık abonelik ödemesi başarısız'
            });
            
            // Başarısız ödeme sayısına göre abonelik durumunu değiştirebiliriz
            // Örnek: 3 kez başarısız ödeme sonrası iptal etme gibi
            await company.save();
            failCount++;
          }
        } catch (error) {
          console.error(`${company._id} ID'li şirket için ödeme işlemi başarısız:`, error);
          failCount++;
        }
      }
      
      return {
        success: true,
        totalProcessed: companies.length,
        successCount,
        failCount
      };
    } catch (error: any) {
      console.error('Aylık ödemelerin kontrolü sırasında hata:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default new SubscriptionService(); 