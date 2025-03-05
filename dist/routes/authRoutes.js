"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Kayıt rotası
router.post('/register', [
    (0, express_validator_1.check)('firstName', 'İsim alanı zorunludur').not().isEmpty(),
    (0, express_validator_1.check)('lastName', 'Soyisim alanı zorunludur').not().isEmpty(),
    (0, express_validator_1.check)('email', 'Lütfen geçerli bir email adresi giriniz').isEmail(),
    (0, express_validator_1.check)('password', 'Şifre en az 6 karakter olmalıdır').isLength({ min: 6 })
], authController_1.register);
// Giriş rotası
router.post('/login', [
    (0, express_validator_1.check)('email', 'Lütfen geçerli bir email adresi giriniz').isEmail(),
    (0, express_validator_1.check)('password', 'Şifre alanı zorunludur').exists()
], authController_1.login);
// Giriş yapmış kullanıcının bilgilerini alma rotası
router.get('/currentUser', auth_1.protect, authController_1.getCurrentUser);
// Kullanıcı bilgilerini güncelleme rotası
router.put('/updateUser', auth_1.protect, authController_1.updateUser);
// Kullanıcı id'si ile bilgilerini alma rotası
router.get('/user/:id', auth_1.protect, authController_1.getUserById);
// Favorilere öğe ekleme rotası
router.post('/favorites', auth_1.protect, [
    (0, express_validator_1.check)('type', 'Favori türü (user, company, product) gereklidir').not().isEmpty(),
    (0, express_validator_1.check)('itemId', 'Öğe ID gereklidir').not().isEmpty()
], authController_1.addFavorite);
// Favoriden kaldırma rotası (DELETE isteği ile)
router.delete('/favorites', auth_1.protect, [
    (0, express_validator_1.check)('type', 'Favori türü (user, company, product) gereklidir').not().isEmpty(),
    (0, express_validator_1.check)('itemId', 'Öğe ID gereklidir').not().isEmpty()
], authController_1.removeFavorite);
// Favori öğeleri çekme rotası
router.get('/favorites', auth_1.protect, authController_1.getFavorites);
exports.default = router;
