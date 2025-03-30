import { Router } from "express";
import {
  createBillingInfo,
  getBillingInfos,
  getBillingInfoById,
  updateBillingInfo,
  deleteBillingInfo,
  getDefaultBillingInfo,
  setDefaultBillingInfo,
} from "../controllers/billingInfoController";
import { protect } from "../middleware/auth";

const router = Router();

// Tüm rotaları koruma altına alıyoruz çünkü fatura bilgileri özel verilerdir
router.use(protect);

// /api/billingInfo
router
  .route("/")
  .post(createBillingInfo) // Yeni fatura bilgisi oluştur
  .get(getBillingInfos); // Kullanıcının tüm fatura bilgilerini getir

// /api/billingInfo/default
router.route("/default").get(getDefaultBillingInfo); // Varsayılan fatura bilgisini getir

// /api/billingInfo/:id
router
  .route("/:id")
  .get(getBillingInfoById) // Belirli bir fatura bilgisini getir
  .put(updateBillingInfo) // Fatura bilgisini güncelle
  .delete(deleteBillingInfo); // Fatura bilgisini sil

// /api/billingInfo/:id/set-default
router.route("/:id/set-default").put(setDefaultBillingInfo); // Belirli bir fatura bilgisini varsayılan yap

export default router;
