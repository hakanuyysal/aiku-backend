"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const subscriptionController_1 = require("../controllers/subscriptionController");
const router = express_1.default.Router();
/**
 * @route   GET /api/subscriptions/plans
 * @desc    Tüm abonelik planlarını listeler
 * @access  Public
 */
router.get('/plans', subscriptionController_1.getSubscriptionPlans);
/**
 * @route   GET /api/subscriptions/my-subscription
 * @desc    Kullanıcının mevcut abonelik bilgilerini getirir
 * @access  Private
 */
router.get('/my-subscription', auth_1.protect, subscriptionController_1.getUserSubscription);
/**
 * @route   POST /api/subscriptions/change-plan
 * @desc    Kullanıcının abonelik planını değiştirir
 * @access  Private
 */
router.post('/change-plan', auth_1.protect, subscriptionController_1.changeSubscriptionPlan);
/**
 * @route   POST /api/subscriptions/toggle-auto-renewal
 * @desc    Kullanıcının otomatik yenileme ayarını değiştirir
 * @access  Private
 */
router.post('/toggle-auto-renewal', auth_1.protect, subscriptionController_1.toggleAutoRenewal);
/**
 * @route   GET /api/subscriptions/payment-history
 * @desc    Kullanıcının ödeme geçmişini getirir
 * @access  Private
 */
router.get('/payment-history', auth_1.protect, subscriptionController_1.getPaymentHistory);
/**
 * @route   POST /api/subscriptions/cancel
 * @desc    Aboneliği iptal eder
 * @access  Private
 */
router.post('/cancel', auth_1.protect, subscriptionController_1.cancelSubscription);
exports.default = router;
