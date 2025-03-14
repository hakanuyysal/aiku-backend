import { Router } from 'express';
import { check } from 'express-validator';
import {
  createCompany,
  getCompany,
  getCompaniesForUser,
  getAllCompanies,
  updateCompany,
  deleteCompany,
  uploadCompanyVideo
} from '../controllers/companyController';
import { protect } from '../middleware/auth';
import videoUpload from '../middleware/videoUpload';
import { optionalAuth } from '../middleware/optionalAuth';

const router = Router();

// Tüm şirketleri getirme rotası (örn: GET /api/company/all)
router.get('/all', optionalAuth, getAllCompanies);

// Giriş yapmış kullanıcıya ait tüm şirketleri getirme 
router.get('/current', protect, getCompaniesForUser);

// Şirket oluşturma rotası (örn: POST /api/company)
router.post(
  '/',
  protect,
  [
    check('companyName', 'Şirket adı zorunludur').not().isEmpty(),
    check('companyType', 'Şirket tipi zorunludur').not().isEmpty(),
    check('businessModel', 'İş modeli zorunludur').not().isEmpty(),
    check('companySector', 'Şirket sektörü zorunludur').not().isEmpty(),
    check('companySize', 'Şirket büyüklüğü zorunludur').not().isEmpty(),
    check('companyEmail', 'Lütfen geçerli bir email adresi giriniz').isEmail(),
    check('companyPhone', 'Şirket telefonu zorunludur').not().isEmpty(),
    check('companyInfo', 'Şirket bilgisi zorunludur').not().isEmpty(),
    check('companyWebsite', 'Şirket web sitesi zorunludur').not().isEmpty(),
    // check('companyAddress', 'Şirket adresi zorunludur').not().isEmpty(),
    // check('companyLinkedIn', 'Şirket LinkedIn adresi zorunludur').not().isEmpty(),
    // check('companyTwitter', 'Şirket Twitter adresi zorunludur').not().isEmpty()
  ],
  createCompany
);

// Belirtilen ID'ye sahip şirketi getirme (örn: GET /api/company/:id)
router.get('/:id', protect, getCompany);

// Şirket güncelleme (örn: PUT /api/company/:id)
router.put('/:id', protect, updateCompany);

// Şirket silme (örn: DELETE /api/company/:id)
router.delete('/:id', protect, deleteCompany);

router.post('/:id/upload-video', protect, videoUpload.single('video'), uploadCompanyVideo);

export default router;
