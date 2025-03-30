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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const paymentController_1 = require("../controllers/paymentController");
const express_validator_1 = require("express-validator");
const auth_1 = require("../middleware/auth");
const validateRequest_1 = require("../middleware/validateRequest");
const ParamPosService_1 = __importDefault(require("../services/ParamPosService"));
const User_1 = require("../models/User");
const router = express_1.default.Router();
router.post("/pay", paymentController_1.processPayment);
router.post('/process-payment', auth_1.protect, [
    (0, express_validator_1.body)('cardNumber').isString().isLength({ min: 16, max: 16 }).withMessage('Geçerli bir kart numarası giriniz'),
    (0, express_validator_1.body)('cardHolderName').isString().notEmpty().withMessage('Kart sahibi adı gereklidir'),
    (0, express_validator_1.body)('expireMonth').isString().isLength({ min: 2, max: 2 }).withMessage('Geçerli bir son kullanma ayı giriniz'),
    (0, express_validator_1.body)('expireYear').isString().isLength({ min: 4, max: 4 }).withMessage('Geçerli bir son kullanma yılı giriniz (YYYY)'),
    (0, express_validator_1.body)('cvc').isString().isLength({ min: 3, max: 3 }).withMessage('Geçerli bir CVC giriniz'),
    (0, express_validator_1.body)('amount').isFloat({ min: 0.01 }).withMessage('Geçerli bir tutar giriniz'),
    (0, express_validator_1.body)('installment').optional().isInt({ min: 1 }).withMessage('Geçerli bir taksit sayısı giriniz'),
    validateRequest_1.validateRequest
], (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { cardNumber, cardHolderName, expireMonth, expireYear, cvc, amount, installment = 1 } = req.body;
        // amount string'den number'a çevir
        const numericAmount = parseFloat(amount);
        // User objesini IUser tipine çevir
        const user = req.user;
        const result = yield ParamPosService_1.default.payment({
            amount: numericAmount,
            cardNumber,
            cardHolderName,
            expireMonth,
            expireYear,
            cvc,
            installment,
            is3D: false,
            userId: user && user._id ? user._id.toString() : undefined,
            ipAddress: ((_a = req.headers['x-forwarded-for']) === null || _a === void 0 ? void 0 : _a.toString()) || req.ip
        });
        // Kullanıcıyı bul ve ödeme geçmişini güncelle
        if (user && user._id) {
            const updatedUser = yield User_1.User.findById(user._id);
            if (updatedUser) {
                // Abonelik durumunu aktif olarak güncelle
                updatedUser.subscriptionStatus = 'active';
                updatedUser.subscriptionStartDate = new Date();
                updatedUser.isSubscriptionActive = true;
                // Bir sonraki ödeme tarihini belirle
                const nextPaymentDate = new Date();
                if (updatedUser.subscriptionPeriod === 'monthly') {
                    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
                }
                else {
                    nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
                }
                updatedUser.nextPaymentDate = nextPaymentDate;
                updatedUser.lastPaymentDate = new Date();
                // Ödeme geçmişini güncelle
                if (!updatedUser.paymentHistory)
                    updatedUser.paymentHistory = [];
                updatedUser.paymentHistory.push({
                    amount: numericAmount,
                    date: new Date(),
                    status: 'success',
                    transactionId: result.TURKPOS_RETVAL_Islem_ID,
                    description: `Ödeme başarılı: ${numericAmount} TL, İşlem ID: ${result.TURKPOS_RETVAL_Islem_ID}`
                });
                yield updatedUser.save();
            }
        }
        res.status(200).json({
            success: true,
            data: result
        });
    }
    catch (error) {
        // Hata durumunda da ödeme geçmişine ekle (başarısız olarak)
        try {
            // User objesini IUser tipine çevir
            const user = req.user;
            if (user && user._id) {
                const updatedUser = yield User_1.User.findById(user._id);
                if (updatedUser) {
                    const numericAmount = parseFloat(req.body.amount);
                    if (!updatedUser.paymentHistory)
                        updatedUser.paymentHistory = [];
                    updatedUser.paymentHistory.push({
                        amount: numericAmount,
                        date: new Date(),
                        status: 'failed',
                        description: `Ödeme başarısız: ${numericAmount} TL, Hata: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`
                    });
                    yield updatedUser.save();
                }
            }
        }
        catch (saveError) {
            console.error('Ödeme hatası kaydedilirken hata oluştu:', saveError);
        }
        res.status(400).json({
            success: false,
            message: error instanceof Error ? error.message : 'Ödeme işlemi başarısız'
        });
    }
}));
exports.default = router;
