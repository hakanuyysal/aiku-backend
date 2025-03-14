import { Router } from 'express';
import { check } from 'express-validator';
import { 
  register, 
  login, 
  getCurrentUser, 
  updateUser, 
  getUserById, 
  addFavorite, 
  removeFavorite,
  getFavorites,
  googleCallback,
  fixSubscription,
  createOrUpdateSubscription,
  checkAndRenewTrialSubscriptions
} from '../controllers/authController';
import { protect } from '../middleware/auth';
import passport from '../config/passport';

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

// Kullanıcı bilgilerini güncelleme rotası
router.put('/updateUser', protect, updateUser);

// Kullanıcı id'si ile bilgilerini alma rotası
router.get('/user/:id', protect, getUserById);

// Abonelik durumunu kontrol et ve düzelt
router.get('/fix-subscription', protect, fixSubscription);

// Yeni abonelik oluşturma veya güncelleme
router.post(
  '/subscription',
  protect,
  [
    check('plan', 'Abonelik planı zorunludur').not().isEmpty(),
    check('period', 'Abonelik dönemi zorunludur').not().isEmpty(),
    check('paymentMethod', 'Ödeme yöntemi zorunludur').not().isEmpty()
  ],
  createOrUpdateSubscription
);

// Trial abonelikleri kontrol etme ve yenileme (sadece admin)
router.post('/admin/check-trial-subscriptions', protect, checkAndRenewTrialSubscriptions);

// Favorilere öğe ekleme rotası
router.post(
  '/favorites',
  protect,
  [
    check('type', 'Favori türü (user, company, product) gereklidir').not().isEmpty(),
    check('itemId', 'Öğe ID gereklidir').not().isEmpty()
  ],
  addFavorite
);

// Favoriden kaldırma rotası (DELETE isteği ile)
router.delete(
  '/favorites',
  protect,
  [
    check('type', 'Favori türü (user, company, product) gereklidir').not().isEmpty(),
    check('itemId', 'Öğe ID gereklidir').not().isEmpty()
  ],
  removeFavorite
);

// Favori öğeleri çekme rotası
router.get('/favorites', protect, getFavorites);

// Google OAuth rotaları
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', { 
    session: false,
    failureRedirect: '/login' 
  }),
  googleCallback
);

export default router;
