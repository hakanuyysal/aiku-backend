"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const applicantController_1 = require("../controllers/applicantController");
const auth_1 = require("../middleware/auth"); // Giriş yapmış kullanıcılar için koruma
const optionalAuth_1 = require("../middleware/optionalAuth"); // Opsiyonel kimlik doğrulama
const router = (0, express_1.Router)();
// 📌 **Tüm Başvuranları Getirme (örn: GET /api/applicants)**
router.get("/", optionalAuth_1.optionalAuth, applicantController_1.getAllApplicants);
// 📌 **Tek Bir Başvuranı Getirme (örn: GET /api/applicants/:id)**
router.get("/:id", optionalAuth_1.optionalAuth, applicantController_1.getApplicantById);
// 📌 **Yeni Başvuran Oluşturma (örn: POST /api/applicants)**
router.post("/", auth_1.protect, applicantController_1.createApplicant);
// 📌 **Başvuran Bilgilerini Güncelleme (örn: PUT /api/applicants/:id)**
router.put("/:id", auth_1.protect, applicantController_1.updateApplicant);
// 📌 **Başvuran Silme (örn: DELETE /api/applicants/:id)**
router.delete("/:id", auth_1.protect, applicantController_1.deleteApplicant);
exports.default = router;
