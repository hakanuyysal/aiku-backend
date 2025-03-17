import { Router } from "express";
import {
  getAllApplicants,
  getApplicantById,
  createApplicant,
  updateApplicant,
  deleteApplicant
} from "../controllers/applicantController";
import { protect } from "../middleware/auth"; // Giriş yapmış kullanıcılar için koruma
import { optionalAuth } from "../middleware/optionalAuth"; // Opsiyonel kimlik doğrulama

const router = Router();

// 📌 **Tüm Başvuranları Getirme (örn: GET /api/applicants)**
router.get("/", optionalAuth, getAllApplicants);

// 📌 **Tek Bir Başvuranı Getirme (örn: GET /api/applicants/:id)**
router.get("/:id", optionalAuth, getApplicantById);

// 📌 **Yeni Başvuran Oluşturma (örn: POST /api/applicants)**
router.post("/", protect, createApplicant);

// 📌 **Başvuran Bilgilerini Güncelleme (örn: PUT /api/applicants/:id)**
router.put("/:id", protect, updateApplicant);

// 📌 **Başvuran Silme (örn: DELETE /api/applicants/:id)**
router.delete("/:id", protect, deleteApplicant);

export default router;
