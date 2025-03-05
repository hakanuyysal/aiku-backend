"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const productController_1 = require("../controllers/productController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// **Tüm Ürünleri Getirme (örn: GET /api/products)**
router.get('/all', productController_1.getAllProducts);
// **Kullanıcının Ürünlerini Getirme (örn: GET /api/products/user)**
router.get('/user', auth_1.protect, productController_1.getProductsByUser);
// **Şirkete Ait Ürünleri Getirme (örn: GET /api/products/company/:companyId)**
router.get('/company/:companyId', productController_1.getProductsByCompany);
// **Belirtilen ID'ye Sahip Ürünü Getirme (örn: GET /api/products/:id)**
router.get('/:id', productController_1.getProductById);
// **Ürün Oluşturma (örn: POST /api/products)**
router.post('/', auth_1.protect, [
    (0, express_validator_1.check)('productName', 'Ürün adı zorunludur').not().isEmpty(),
    (0, express_validator_1.check)('productCategory', 'Ürün kategorisi zorunludur').not().isEmpty(),
    (0, express_validator_1.check)('productDescription', 'Ürün açıklaması zorunludur').not().isEmpty(),
    (0, express_validator_1.check)('detailedDescription', 'Detaylı açıklama zorunludur').not().isEmpty(),
    (0, express_validator_1.check)('pricingModel', 'Fiyatlandırma modeli zorunludur').not().isEmpty(),
    (0, express_validator_1.check)('companyId', 'Şirket ID\'si zorunludur').not().isEmpty(),
], productController_1.createProduct);
// **Ürün Güncelleme (örn: PUT /api/products/:id)**
router.put('/:id', auth_1.protect, productController_1.updateProduct);
// **Ürün Silme (örn: DELETE /api/products/:id)**
router.delete('/:id', auth_1.protect, productController_1.deleteProduct);
exports.default = router;
