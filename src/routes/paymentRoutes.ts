import express, { Request, Response } from "express";
import { processPayment } from "../controllers/paymentController";
import { body } from 'express-validator';
import { protect } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import ParamPosService from '../services/ParamPosService';

const router = express.Router();

router.post("/pay", processPayment);

router.post('/process-payment',
  protect,
  [
    body('cardNumber').isString().isLength({ min: 16, max: 16 }).withMessage('Geçerli bir kart numarası giriniz'),
    body('cardHolderName').isString().notEmpty().withMessage('Kart sahibi adı gereklidir'),
    body('expireMonth').isString().isLength({ min: 2, max: 2 }).withMessage('Geçerli bir son kullanma ayı giriniz'),
    body('expireYear').isString().isLength({ min: 2, max: 2 }).withMessage('Geçerli bir son kullanma yılı giriniz'),
    body('cvc').isString().isLength({ min: 3, max: 3 }).withMessage('Geçerli bir CVC giriniz'),
    body('amount').isNumeric().withMessage('Geçerli bir tutar giriniz'),
    body('installment').optional().isInt({ min: 1 }).withMessage('Geçerli bir taksit sayısı giriniz'),
    validateRequest
  ],
  async (req: Request, res: Response) => {
    try {
      const { cardNumber, cardHolderName, expireMonth, expireYear, cvc, amount, installment = 1 } = req.body;

      const result = await ParamPosService.payment(
        amount,
        cardNumber,
        cardHolderName,
        expireMonth,
        expireYear,
        cvc,
        installment
      );

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : 'Ödeme işlemi başarısız'
      });
    }
  }
);

export default router;
