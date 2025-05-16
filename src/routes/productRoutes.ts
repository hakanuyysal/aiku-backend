import { Router } from 'express';
import { check } from 'express-validator';
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

// **Tüm Ürünleri Getirme (örn: GET /api/product)**
router.get('/all', optionalAuth, getAllProducts);

// **Kullanıcının Ürünlerini Getirme (örn: GET /api/product/user)**
router.get('/user', protect, getProductsByUser);

// **Şirkete Ait Ürünleri Getirme (örn: GET /api/product/company/:companyId)**
router.get('/company/:companyId', getProductsByCompany);

// **Belirtilen ID'ye Sahip Ürünü Getirme (örn: GET /api/product/:id)**
router.get('/:id', getProductById);

// **Ürün Oluşturma (örn: POST /api/product)**
router.post(
  '/',
  protect,
  [
    check('productName', 'Ürün adı zorunludur').not().isEmpty(),
    check('productCategory', 'Ürün kategorisi zorunludur').not().isEmpty(),
    check('productDescription', 'Ürün açıklaması zorunludur').not().isEmpty(),
    check('detailedDescription', 'Detaylı açıklama zorunludur').not().isEmpty(),
    check('pricingModel', 'Fiyatlandırma modeli zorunludur').not().isEmpty(),
    check('companyId', 'Şirket ID\'si zorunludur').not().isEmpty(),
  ],
  createProduct
);

// **Ürün Güncelleme (örn: PUT /api/product/:id)**
router.put('/:id', protect, updateProduct);

// **Ürün Silme (örn: DELETE /api/product/:id)**
router.delete('/:id', protect, deleteProduct);

export default router;
