"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const CardController_1 = __importDefault(require("../controllers/CardController"));
const auth_1 = require("../middleware/auth");
const validateRequest_1 = require("../middleware/validateRequest");
const express_validator_1 = require("express-validator");
const router = express_1.default.Router();
// Tüm route'lar için authentication gerekli
router.use(auth_1.protect);
// Kart kaydetme
router.post('/save', [
    (0, express_validator_1.body)('cardNumber').isString().isLength({ min: 16, max: 16 }).withMessage('Geçerli bir kart numarası giriniz'),
    (0, express_validator_1.body)('cardHolderName').isString().notEmpty().withMessage('Kart sahibi adı gereklidir'),
    (0, express_validator_1.body)('expireMonth').isString().isLength({ min: 2, max: 2 }).withMessage('Geçerli bir son kullanma ayı giriniz'),
    (0, express_validator_1.body)('expireYear').isString().isLength({ min: 2, max: 2 }).withMessage('Geçerli bir son kullanma yılı giriniz'),
    (0, express_validator_1.body)('cvc').isString().isLength({ min: 3, max: 4 }).withMessage('Geçerli bir CVC giriniz'),
    validateRequest_1.validateRequest
], CardController_1.default.saveCard);
// Kayıtlı kartları listeleme
router.get('/', CardController_1.default.getCards);
// Kayıtlı kart silme
router.delete('/:cardToken', [
    (0, express_validator_1.param)('cardToken').isString().notEmpty().withMessage('Kart token gereklidir'),
    validateRequest_1.validateRequest
], CardController_1.default.deleteCard);
// Varsayılan kartı güncelleme
router.put('/default/:cardToken', [
    (0, express_validator_1.param)('cardToken').isString().notEmpty().withMessage('Kart token gereklidir'),
    validateRequest_1.validateRequest
], CardController_1.default.setDefaultCard);
// Kayıtlı kartla ödeme yapma
router.post('/pay', [
    (0, express_validator_1.body)('cardToken').isString().notEmpty().withMessage('Kart token gereklidir'),
    (0, express_validator_1.body)('amount').isNumeric().withMessage('Geçerli bir tutar giriniz'),
    (0, express_validator_1.body)('installment').optional().isInt({ min: 1 }).withMessage('Geçerli bir taksit sayısı giriniz'),
    validateRequest_1.validateRequest
], CardController_1.default.payWithSavedCard);
exports.default = router;
