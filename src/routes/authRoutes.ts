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
  getFavorites 
} from '../controllers/authController';
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

// Kullanıcı bilgilerini güncelleme rotası
router.put('/updateUser', protect, updateUser);

// Kullanıcı id'si ile bilgilerini alma rotası
router.get('/user/:id', protect, getUserById);

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

export default router;
