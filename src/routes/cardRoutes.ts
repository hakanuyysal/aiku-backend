import express from 'express';
import CardController from '../controllers/CardController';
import { protect } from '../middleware/auth';
import { validateRequest } from '../middleware/validateRequest';
import { body, param } from 'express-validator';

const router = express.Router();

// Tüm route'lar için authentication gerekli
router.use(protect);

// Kart kaydetme
router.post('/save',
  [
    body('cardNumber').isString().isLength({ min: 16, max: 16 }).withMessage('Geçerli bir kart numarası giriniz'),
    body('cardHolderName').isString().notEmpty().withMessage('Kart sahibi adı gereklidir'),
    body('expireMonth').isString().isLength({ min: 2, max: 2 }).withMessage('Geçerli bir son kullanma ayı giriniz'),
    body('expireYear').isString().isLength({ min: 2, max: 2 }).withMessage('Geçerli bir son kullanma yılı giriniz'),
    body('cvc').isString().isLength({ min: 3, max: 4 }).withMessage('Geçerli bir CVC giriniz'),
    validateRequest
  ],
  CardController.saveCard
);

// Kayıtlı kartları listeleme
router.get('/', CardController.getCards);

// Kayıtlı kart silme
router.delete('/:cardToken',
  [
    param('cardToken').isString().notEmpty().withMessage('Kart token gereklidir'),
    validateRequest
  ],
  CardController.deleteCard
);

// Varsayılan kartı güncelleme
router.put('/default/:cardToken',
  [
    param('cardToken').isString().notEmpty().withMessage('Kart token gereklidir'),
    validateRequest
  ],
  CardController.setDefaultCard
);

// Kayıtlı kartla ödeme yapma
router.post('/pay',
  [
    body('cardToken').isString().notEmpty().withMessage('Kart token gereklidir'),
    body('amount').isNumeric().withMessage('Geçerli bir tutar giriniz'),
    body('installment').optional().isInt({ min: 1 }).withMessage('Geçerli bir taksit sayısı giriniz'),
    validateRequest
  ],
  CardController.payWithSavedCard
);

export default router; 