import express from 'express';
import { ExchangeRateController } from '../controllers/exchangeRateController';

const router = express.Router();
const exchangeRateController = new ExchangeRateController();

/**
 * @route   GET /api/exchange-rates
 * @desc    Tüm döviz kurlarını getir
 * @access  Public
 */
router.get('/', exchangeRateController.getAllRates);

/**
 * @route   GET /api/exchange-rates/currency/:currencyCode
 * @desc    Belirli bir para birimi için döviz kurunu getir
 * @access  Public
 */
router.get('/currency/:currencyCode', exchangeRateController.getRate);

/**
 * @route   GET /api/exchange-rates/try
 * @desc    USD/TRY kurunu getir
 * @access  Public
 */
router.get('/try', exchangeRateController.getTRYRate);

/**
 * @route   POST /api/exchange-rates/refresh
 * @desc    Döviz kurlarını zorla güncelle
 * @access  Public (Gerçek uygulamada bu işlem için yetkilendirme gerekebilir)
 */
router.post('/refresh', exchangeRateController.refreshRates);

export default router; 