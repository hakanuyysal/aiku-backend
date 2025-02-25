import { Router } from 'express';
import { check } from 'express-validator';
import { register, login, getCurrentUser, updateUser } from '../controllers/authController';
import { protect } from '../middleware/auth';

const router = Router();

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

// Giriş yapmış kullanıcının bilgilerini alma rotası
router.get('/currentUser', protect, getCurrentUser);

// Kullanıcı bilgilerini güncelleme rotası**
router.put('/updateUser', protect, updateUser);

export default router;
