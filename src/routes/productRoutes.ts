import { Router, Request, Response, NextFunction } from 'express';
import { check, validationResult } from 'express-validator';
import {
  createProduct,
  updateProduct,
  deleteProduct,
  getProductById,
  getProductsByUser,
  getProductsByCompany,
  getAllProducts
} from '../controllers/productController';
import { protect } from '../middleware/auth';
import { optionalAuth } from '../middleware/optionalAuth';

const router = Router();

// Validation‐result’ı kontrol edip hataları JSON olarak dönen middleware
const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// **Tüm Ürünleri Getirme**
router.get('/all', optionalAuth, getAllProducts);

// **Kullanıcının Ürünlerini Getirme**
router.get('/user', protect, getProductsByUser);

// **Şirkete Ait Ürünleri Getirme**
router.get('/company/:companyId', getProductsByCompany);

// **Belirtilen ID'ye Sahip Ürünü Getirme**
router.get('/:id', getProductById);

// **Ürün Oluşturma**
router.post(
  '/',
  protect,
  [
    check('productName', 'Ürün adı zorunludur').notEmpty(),
    check('productCategory', 'Ürün kategorisi zorunludur').notEmpty(),
    check('productDescription', 'Ürün açıklaması zorunludur').notEmpty(),
    check('detailedDescription', 'Detaylı açıklama zorunludur').notEmpty(),
    check('pricingModel', 'Fiyatlandırma modeli zorunludur').notEmpty(),
    check('companyId', "Şirket ID'si zorunludur").notEmpty(),
    // Sadece buraya ekledik:
    check('productWebsite')
      .optional({ nullable: true, checkFalsy: true })
      .isURL()
      .withMessage('Please enter a valid URL'),
  ],
  validate,        // ← validationResult kontrolü
  createProduct
);

// **Ürün Güncelleme**
router.put(
  '/:id',
  protect,
  [
    // Yine sadece URL kontrolünü ekliyoruz; diğer alanlar zaten controller’da updateProduct içinde ele alınıyorsa buraya eklemeye gerek yok
    check('productWebsite')
      .optional({ nullable: true, checkFalsy: true })
      .isURL()
      .withMessage('Please enter a valid URL'),
  ],
  validate,        // ← validationResult kontrolü
  updateProduct
);

// **Ürün Silme**
router.delete('/:id', protect, deleteProduct);

export default router;
