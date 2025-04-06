import express, { Request, Response } from "express";
import { processPayment, getPaymentHistory, recordFreePayment, addPaymentMethod, getPaymentMethods, deletePaymentMethod, updateDefaultPaymentMethod } from "../controllers/paymentController";
import { body } from 'express-validator';
import { protect } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import ParamPosService from '../services/ParamPosService';
import { User, IUser } from '../models/User';

const router = express.Router();

router.post("/pay", processPayment);

router.post('/process-payment',
  protect,
  [
    body('cardNumber').isString().isLength({ min: 16, max: 16 }).withMessage('Geçerli bir kart numarası giriniz'),
    body('cardHolderName').isString().notEmpty().withMessage('Kart sahibi adı gereklidir'),
    body('expireMonth').isString().isLength({ min: 2, max: 2 }).withMessage('Geçerli bir son kullanma ayı giriniz'),
    body('expireYear').isString().isLength({ min: 4, max: 4 }).withMessage('Geçerli bir son kullanma yılı giriniz (YYYY)'),
    body('cvc').isString().isLength({ min: 3, max: 3 }).withMessage('Geçerli bir CVC giriniz'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Geçerli bir tutar giriniz'),
    body('installment').optional().isInt({ min: 1 }).withMessage('Geçerli bir taksit sayısı giriniz'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const { cardNumber, cardHolderName, expireMonth, expireYear, cvc, amount, installment = 1 } = req.body;

      // amount string'den number'a çevir
      const numericAmount = parseFloat(amount);

      // User objesini IUser tipine çevir
      const user = req.user as IUser | undefined;
      
      const result = await ParamPosService.payment({
        amount: numericAmount,
        cardNumber,
        cardHolderName,
        expireMonth,
        expireYear,
        cvc,
        installment,
        is3D: false,
        userId: user && user._id ? user._id.toString() : undefined,
        ipAddress: req.headers['x-forwarded-for']?.toString() || req.ip
      });

      // Kullanıcıyı bul ve ödeme geçmişini güncelle
      if (user && user._id) {
        const updatedUser = await User.findById(user._id);
        if (updatedUser) {
          // Abonelik durumunu aktif olarak güncelle
          updatedUser.subscriptionStatus = 'active';
          updatedUser.subscriptionStartDate = new Date();
          updatedUser.isSubscriptionActive = true;
          
          // Bir sonraki ödeme tarihini belirle
          const nextPaymentDate = new Date();
          if (updatedUser.subscriptionPeriod === 'monthly') {
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
          } else {
            nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
          }
          updatedUser.nextPaymentDate = nextPaymentDate;
          updatedUser.lastPaymentDate = new Date();
          
          // Ödeme geçmişini güncelle
          if (!updatedUser.paymentHistory) updatedUser.paymentHistory = [];
          updatedUser.paymentHistory.push({
            amount: numericAmount,
            date: new Date(),
            status: 'success',
            transactionId: result.TURKPOS_RETVAL_Islem_ID,
            description: `Ödeme başarılı: ${numericAmount} TL, İşlem ID: ${result.TURKPOS_RETVAL_Islem_ID}`
          });
          await updatedUser.save();
        }
      }

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      // Hata durumunda da ödeme geçmişine ekle (başarısız olarak)
      try {
        // User objesini IUser tipine çevir
        const user = req.user as IUser | undefined;
        
        if (user && user._id) {
          const updatedUser = await User.findById(user._id);
          if (updatedUser) {
            const numericAmount = parseFloat(req.body.amount);
            if (!updatedUser.paymentHistory) updatedUser.paymentHistory = [];
            updatedUser.paymentHistory.push({
              amount: numericAmount,
              date: new Date(),
              status: 'failed',
              description: `Ödeme başarısız: ${numericAmount} TL, Hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`
            });
            await updatedUser.save();
          }
        }
      } catch (saveError) {
        console.error('Ödeme hatası kaydedilirken hata oluştu:', saveError);
      }

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Ödeme işlemi başarısız'
      });
    }
  }
);

// Yeni eklenen complete-payment endpoint'i
router.post('/complete-payment',
  protect,
  [
    body('ucdMD').isString().notEmpty().withMessage('UCD_MD değeri gereklidir'),
    body('siparisId').isString().notEmpty().withMessage('Sipariş ID değeri gereklidir'),
    body('islemGuid').isString().optional().withMessage('İşlem GUID değeri geçerli bir string olmalıdır'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const { ucdMD, siparisId, islemGuid } = req.body;
      
      // Callback'ten gelen md değerini kontrol et ve kullan
      // localStorage'daki callback_md değeri varsa, onu kullan (öncelikli)
      const callbackMD = req.body.callbackMD || ucdMD;
      
      console.log('3D ödeme tamamlama isteği:', { callbackMD, ucdMD, siparisId, islemGuid });
      console.log('Kullanıcı bilgisi:', req.user);
      console.log('Auth token var mı:', !!req.headers.authorization);
      
      // TP_WMD_Pay metodunu çağır
      const result = await ParamPosService.completePayment({
        ucdMD: callbackMD, // Callback'ten gelen md değerini kullan
        siparisId,
        islemGuid
      });
      
      console.log('3D ödeme tamamlama sonucu:', result);
      
      // Kullanıcıyı bul ve ödeme geçmişini güncelle
      const user = req.user as IUser | undefined;
      if (user && user._id) {
        console.log('Kullanıcı ID ile aranıyor:', user._id);
        const updatedUser = await User.findById(user._id);

        if (updatedUser) {
          console.log('Kullanıcı bulundu, abonelik durumu güncelleniyor');
          // Abonelik durumunu aktif olarak güncelle
          updatedUser.subscriptionStatus = 'active';
          updatedUser.subscriptionStartDate = new Date();
          updatedUser.isSubscriptionActive = true;
          
          // Bir sonraki ödeme tarihini belirle
          const nextPaymentDate = new Date();
          if (updatedUser.subscriptionPeriod === 'monthly') {
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
          } else {
            nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
          }
          updatedUser.nextPaymentDate = nextPaymentDate;
          updatedUser.lastPaymentDate = new Date();
          
          // Ödeme geçmişini güncelle
          if (!updatedUser.paymentHistory) updatedUser.paymentHistory = [];
          
          const paymentAmount = parseFloat(result.TURKPOS_RETVAL_Odeme_Tutari.replace(',', '.')) || 0;
          console.log('Ödeme tutarı:', paymentAmount);
          
          updatedUser.paymentHistory.push({
            amount: paymentAmount,
            date: new Date(),
            status: 'success',
            transactionId: result.TURKPOS_RETVAL_Islem_ID,
            description: `3D Ödeme başarılı: ${result.TURKPOS_RETVAL_Odeme_Tutari || '0'} TL, İşlem ID: ${result.TURKPOS_RETVAL_Islem_ID}`
          });
          
          await updatedUser.save();
          console.log('Kullanıcı bilgileri güncellendi');
        } else {
          console.log('Kullanıcı bulunamadı:', user._id);
        }
      } else {
        console.log('Kullanıcı bilgisi yok veya ID eksik');
      }

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('3D ödeme tamamlama hatası:', error);
      
      // Hata durumunda da ödeme geçmişine ekle (başarısız olarak)
      try {
        const user = req.user as IUser | undefined;
        if (user && user._id) {
          const updatedUser = await User.findById(user._id);
          if (updatedUser) {
            if (!updatedUser.paymentHistory) updatedUser.paymentHistory = [];
            updatedUser.paymentHistory.push({
              amount: 0,
              date: new Date(),
              status: 'failed',
              description: `3D Ödeme tamamlama başarısız. Hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`
            });
            await updatedUser.save();
          }
        }
      } catch (saveError) {
        console.error('Ödeme hatası kaydedilirken hata oluştu:', saveError);
      }

      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Ödeme tamamlama işlemi başarısız'
      });
    }
  }
);

/**
 * @route   POST /api/payments/record-free-payment
 * @desc    Ücretsiz abonelik için ödeme kaydı oluşturur
 * @access  Private
 */
router.post('/record-free-payment', 
  protect,
  [
    body('amount').isNumeric().withMessage('Geçerli bir tutar giriniz'),
    body('description').isString().notEmpty().withMessage('Açıklama gereklidir'),
    body('planName').isString().notEmpty().withMessage('Plan adı gereklidir'),
    body('billingCycle').isIn(['monthly', 'yearly']).withMessage('Geçerli bir fatura dönemi giriniz'),
    body('originalPrice').optional().isNumeric().withMessage('Geçerli bir orijinal fiyat giriniz'),
    body('isFirstPayment').optional().isBoolean().withMessage('İlk ödeme bilgisi geçerli değil'),
    body('paymentDate').optional().isISO8601().toDate().withMessage('Geçerli bir tarih formatı giriniz'),
    validateRequest
  ],
  recordFreePayment
);

/**
 * @route   GET /api/payments/history
 * @desc    Kullanıcının ödeme geçmişini getirir
 * @access  Private
 */
router.get("/history", protect, getPaymentHistory);

/**
 * @route   POST /api/payments/methods
 * @desc    Yeni ödeme yöntemi (kart) ekler
 * @access  Private
 */
router.post("/methods", 
  protect,
  [
    body('cardHolderName').isString().notEmpty().withMessage('Kart sahibi adı gereklidir'),
    body('cardNumber').isString().isLength({ min: 16, max: 16 }).withMessage('Geçerli bir kart numarası giriniz'),
    body('expireMonth').isString().isLength({ min: 2, max: 2 }).withMessage('Geçerli bir son kullanma ayı giriniz'),
    body('expireYear').isString().isLength({ min: 4, max: 4 }).withMessage('Geçerli bir son kullanma yılı giriniz (YYYY)'),
    body('cvc').isString().isLength({ min: 3, max: 3 }).withMessage('Geçerli bir CVC giriniz'),
    body('isDefault').isBoolean().optional().withMessage('isDefault değeri boolean olmalıdır'),
    validateRequest
  ],
  addPaymentMethod
);

/**
 * @route   GET /api/payments/methods
 * @desc    Kullanıcının kayıtlı ödeme yöntemlerini getirir
 * @access  Private
 */
router.get("/methods", protect, getPaymentMethods);

/**
 * @route   DELETE /api/payments/methods/:cardId
 * @desc    Kullanıcının kayıtlı ödeme yöntemini siler
 * @access  Private
 */
router.delete("/methods/:cardId", protect, deletePaymentMethod);

/**
 * @route   PUT /api/payments/methods/:cardId/default
 * @desc    Kullanıcının varsayılan ödeme yöntemini günceller
 * @access  Private
 */
router.put("/methods/:cardId/default", protect, updateDefaultPaymentMethod);

export default router;
