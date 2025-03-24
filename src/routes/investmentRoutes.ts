import { Router } from 'express';
import { check } from 'express-validator';
import {
  createInvestment,
  updateInvestment,
  deleteInvestment,
  getInvestmentById,
  getAllInvestments,
  getInvestmentsByCompany,
  getInvestmentsByProduct
} from '../controllers/investmentController';
import { protect } from '../middleware/auth';
import { optionalAuth } from '../middleware/optionalAuth';

const router = Router();

// **Tüm Yatırım Tekliflerini Getirme (örn: GET /api/investments/all)**
router.get('/all', optionalAuth, getAllInvestments);

// **Belirli Bir Şirkete Ait Yatırım Tekliflerini Getirme (örn: GET /api/investments/company/:companyId)**
router.get('/company/:companyId', getInvestmentsByCompany);

// **Belirli Bir Ürüne Ait Yatırım Tekliflerini Getirme (örn: GET /api/investments/product/:productId)**
router.get('/product/:productId', getInvestmentsByProduct);

// **Yeni Yatırım Teklifi Oluşturma (örn: POST /api/investments)**
router.post(
  '/',
  protect,
  [
    check('investmentTitle', 'Başlık zorunludur').not().isEmpty(),
    check('companyName', 'Şirket adı zorunludur').not().isEmpty(),
    check('companyId', 'Şirket ID\'si zorunludur').not().isEmpty(),
    check('productName', 'Ürün adı zorunludur').not().isEmpty(),
    check('productId', 'Ürün ID\'si zorunludur').not().isEmpty(),
    check('targetedInvestment', 'Hedef yatırım miktarı zorunludur').not().isEmpty(),
    check('minimumTicket', 'Minimum yatırım bileti zorunludur').not().isEmpty(),
    check('deadline', 'Son başvuru tarihi zorunludur').not().isEmpty(),
    check('description', 'Açıklama zorunludur').not().isEmpty(),
  ],
  createInvestment
);

// **Belirli Bir Yatırım Teklifini Getirme (örn: GET /api/investments/:id)**
router.get('/:id', getInvestmentById);

// **Yatırım Teklifini Güncelleme (örn: PUT /api/investments/:id)**
router.put('/:id', protect, updateInvestment);

// **Yatırım Teklifini Silme (örn: DELETE /api/investments/:id)**
router.delete('/:id', protect, deleteInvestment);

export default router;
