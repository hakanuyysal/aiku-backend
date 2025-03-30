"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const teamMemberController_1 = require("../controllers/teamMemberController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// **Tüm Takım Üyelerini Getirme
router.get('/all', teamMemberController_1.getAllTeamMembers);
// **Kullanıcının Takım Üyelerini Getirme
router.get('/user', auth_1.protect, teamMemberController_1.getTeamMembersByUser);
// **Şirkete Ait Takım Üyelerini Getirme
router.get('/company/:companyId', teamMemberController_1.getTeamMembersByCompany);
// **Belirli ID'ye Sahip Takım Üyesini Getirme
router.get('/:id', teamMemberController_1.getTeamMemberById);
// **Takım Üyesi Oluşturma
router.post('/', auth_1.protect, [
    (0, express_validator_1.check)('firstName', 'First name is required').not().isEmpty(),
    (0, express_validator_1.check)('lastName', 'Last name is required').not().isEmpty(),
    (0, express_validator_1.check)('title', 'Title is required').not().isEmpty(),
    (0, express_validator_1.check)('company', 'Company ID is required').not().isEmpty(),
    (0, express_validator_1.check)('companyName', 'Company name is required').not().isEmpty()
], teamMemberController_1.createTeamMember);
// **Takım Üyesi Güncelleme
router.put('/:id', auth_1.protect, teamMemberController_1.updateTeamMember);
// **Takım Üyesi Silme
router.delete('/:id', auth_1.protect, teamMemberController_1.deleteTeamMember);
exports.default = router;
