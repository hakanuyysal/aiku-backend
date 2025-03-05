"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const companyController_1 = require("../controllers/companyController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Tüm şirketleri getirme rotası (örn: GET /api/company/all)
router.get('/all', auth_1.protect, companyController_1.getAllCompanies);
// Giriş yapmış kullanıcıya ait tüm şirketleri getirme 
router.get('/current', auth_1.protect, companyController_1.getCompaniesForUser);
// Şirket oluşturma rotası (örn: POST /api/company)
router.post('/', auth_1.protect, [
    (0, express_validator_1.check)('companyName', 'Şirket adı zorunludur').not().isEmpty(),
    (0, express_validator_1.check)('companyType', 'Şirket tipi zorunludur').not().isEmpty(),
    (0, express_validator_1.check)('businessModel', 'İş modeli zorunludur').not().isEmpty(),
    (0, express_validator_1.check)('companySector', 'Şirket sektörü zorunludur').not().isEmpty(),
    (0, express_validator_1.check)('companySize', 'Şirket büyüklüğü zorunludur').not().isEmpty(),
    (0, express_validator_1.check)('companyEmail', 'Lütfen geçerli bir email adresi giriniz').isEmail(),
    (0, express_validator_1.check)('companyPhone', 'Şirket telefonu zorunludur').not().isEmpty(),
    (0, express_validator_1.check)('companyInfo', 'Şirket bilgisi zorunludur').not().isEmpty(),
    (0, express_validator_1.check)('companyWebsite', 'Şirket web sitesi zorunludur').not().isEmpty(),
    // check('companyAddress', 'Şirket adresi zorunludur').not().isEmpty(),
    // check('companyLinkedIn', 'Şirket LinkedIn adresi zorunludur').not().isEmpty(),
    // check('companyTwitter', 'Şirket Twitter adresi zorunludur').not().isEmpty()
], companyController_1.createCompany);
// Belirtilen ID'ye sahip şirketi getirme (örn: GET /api/company/:id)
router.get('/:id', auth_1.protect, companyController_1.getCompany);
// Şirket güncelleme (örn: PUT /api/company/:id)
router.put('/:id', auth_1.protect, companyController_1.updateCompany);
// Şirket silme (örn: DELETE /api/company/:id)
router.delete('/:id', auth_1.protect, companyController_1.deleteCompany);
exports.default = router;
