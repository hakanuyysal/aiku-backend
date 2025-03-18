import { Router } from "express";
import { check } from "express-validator";
import {
  register,
  login,
  getCurrentUser,
  updateUser,
  getUserById,
  addFavorite,
  removeFavorite,
  getFavorites,
  googleCallback,
  fixSubscription,
  createOrUpdateSubscription,
  checkAndRenewTrialSubscriptions,
  googleLogin,
  logout,
} from "../controllers/authController";
import { protect } from "../middleware/auth";
import passport from "../config/passport";
import { LinkedInService } from "../services/linkedInService";

const router = Router();

// Kayıt rotası
router.post(
  "/register",
  [
    check("firstName", "İsim alanı zorunludur").not().isEmpty(),
    check("lastName", "Soyisim alanı zorunludur").not().isEmpty(),
    check("email", "Lütfen geçerli bir email adresi giriniz").isEmail(),
    check("password", "Şifre en az 6 karakter olmalıdır").isLength({ min: 6 }),
  ],
  register
);

// Giriş rotası
router.post(
  "/login",
  [
    check("email", "Lütfen geçerli bir email adresi giriniz").isEmail(),
    check("password", "Şifre alanı zorunludur").exists(),
  ],
  login
);

// Giriş yapmış kullanıcının bilgilerini alma rotası
router.get("/currentUser", protect, getCurrentUser);

// Kullanıcı bilgilerini güncelleme rotası
router.put("/updateUser", protect, updateUser);

// Kullanıcı id'si ile bilgilerini alma rotası
router.get("/user/:id", protect, getUserById);

// Abonelik durumunu kontrol et ve düzelt
router.get("/fix-subscription", protect, fixSubscription);

// Yeni abonelik oluşturma veya güncelleme
router.post(
  "/subscription",
  protect,
  [
    check("plan", "Abonelik planı zorunludur").not().isEmpty(),
    check("period", "Abonelik dönemi zorunludur").not().isEmpty(),
    check("paymentMethod", "Ödeme yöntemi zorunludur").not().isEmpty(),
  ],
  createOrUpdateSubscription
);

// Trial abonelikleri kontrol etme ve yenileme (sadece admin)
router.post(
  "/admin/check-trial-subscriptions",
  protect,
  checkAndRenewTrialSubscriptions
);

// Favorilere öğe ekleme rotası
router.post(
  "/favorites",
  protect,
  [
    check("type", "Favori türü (user, company, product) gereklidir")
      .not()
      .isEmpty(),
    check("itemId", "Öğe ID gereklidir").not().isEmpty(),
  ],
  addFavorite
);

// Favoriden kaldırma rotası (DELETE isteği ile)
router.delete(
  "/favorites",
  protect,
  [
    check("type", "Favori türü (user, company, product) gereklidir")
      .not()
      .isEmpty(),
    check("itemId", "Öğe ID gereklidir").not().isEmpty(),
  ],
  removeFavorite
);

// Favori öğeleri çekme rotası
router.get("/favorites", protect, getFavorites);

// Google OAuth rotaları
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google OAuth rotası (POST isteği için)
router.post(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `${process.env.CLIENT_URL}/auth/login?error=google-login-failed`,
  }),
  googleCallback
);

// Google login endpoint'i - Token ile veya token olmadan kullanılabilir
router.post("/google/login", googleLogin);

// Oturum kapatma rotası
router.post("/logout", protect, logout);

// LinkedIn Routes
router.get("/linkedin", (req, res) => {
  const linkedInService = new LinkedInService();
  const authUrl = linkedInService.getAuthUrl();
  res.json({ authUrl });
});

router.post("/linkedin", async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: "Authorization code is required" });
    }

    const linkedInService = new LinkedInService();
    const accessToken = await linkedInService.getAccessToken(code);
    const profile = await linkedInService.getProfile(accessToken);
    const authResult = await linkedInService.handleAuth(profile);

    res.json(authResult);
  } catch (error: any) {
    console.error("LinkedIn auth error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
