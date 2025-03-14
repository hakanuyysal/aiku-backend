import express, { Request, Response } from "express";
import { processPayment } from "../controllers/paymentController";
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

export default router;
