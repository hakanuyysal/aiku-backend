import { Router } from 'express';
import { check } from 'express-validator';
import {
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  getTeamMemberById,
  getTeamMembersByUser,
  getTeamMembersByCompany,
  getAllTeamMembers
} from '../controllers/teamMemberController';
import { protect } from '../middleware/auth';

const router = Router();

// **Tüm Takım Üyelerini Getirme
router.get('/all', getAllTeamMembers);

// **Kullanıcının Takım Üyelerini Getirme
router.get('/user', protect, getTeamMembersByUser);

// **Şirkete Ait Takım Üyelerini Getirme
router.get('/company/:companyId', getTeamMembersByCompany);

// **Belirli ID'ye Sahip Takım Üyesini Getirme
router.get('/:id', getTeamMemberById);

// **Takım Üyesi Oluşturma
router.post(
  '/',
  protect,
  [
    check('firstName', 'First name is required').not().isEmpty(),
    check('lastName', 'Last name is required').not().isEmpty(),
    check('title', 'Title is required').not().isEmpty(),
    check('company', 'Company ID is required').not().isEmpty(),
    check('companyName', 'Company name is required').not().isEmpty()
  ],
  createTeamMember
);

// **Takım Üyesi Güncelleme
router.put('/:id', protect, updateTeamMember);

// **Takım Üyesi Silme
router.delete('/:id', protect, deleteTeamMember);

export default router;
