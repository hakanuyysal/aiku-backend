const express = require('express');
const { check } = require('express-validator');
const { register, login } = require('../controllers/authController');

const router = express.Router();

// Kayıt rotası
router.post(
  '/register',
  [
    check('firstName', 'İsim alanı zorunludur').not().isEmpty(),
    check('lastName', 'Soyisim alanı zorunludur').not().isEmpty(),
    check('email', 'Lütfen geçerli bir email adresi giriniz').isEmail(),
    check('password', 'Şifre en az 6 karakter olmalıdır').isLength({ min: 6 })
  ],
  register
);

// Giriş rotası
router.post(
  '/login',
  [
    check('email', 'Lütfen geçerli bir email adresi giriniz').isEmail(),
    check('password', 'Şifre alanı zorunludur').exists()
  ],
  login
);

module.exports = router; 