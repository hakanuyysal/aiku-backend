"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.googleLogin = exports.checkAndRenewTrialSubscriptions = exports.createOrUpdateSubscription = exports.fixSubscription = exports.googleCallback = exports.getFavorites = exports.removeFavorite = exports.addFavorite = exports.getUserById = exports.updateUser = exports.getCurrentUser = exports.login = exports.register = void 0;
const express_validator_1 = require("express-validator");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = require("../models/User");
const googleService_1 = require("../services/googleService");
const createToken = (id) => {
    // @ts-expect-error - JWT sign işlemi için expiresIn tipi uyumsuzluğunu görmezden geliyoruz
    return jsonwebtoken_1.default.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
    });
};
const register = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array(),
            });
        }
        const { firstName, lastName, email, password, phone, title, location, profileInfo, profilePhoto, linkedin, instagram, facebook, twitter, } = req.body;
        let user = yield User_1.User.findOne({ email });
        if (user) {
            return res.status(400).json({
                success: false,
                message: "Bu email adresi zaten kayıtlı",
            });
        }
        user = yield User_1.User.create({
            firstName,
            lastName,
            email,
            password,
            phone,
            title,
            location,
            profileInfo,
            profilePhoto,
            linkedin,
            instagram,
            facebook,
            twitter,
            authProvider: "email",
        });
        const token = createToken(user._id);
        const hasActiveSubscription = user.subscriptionStatus === "active" ||
            user.subscriptionStatus === "trial";
        const userResponse = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            title: user.title,
            location: user.location,
            profileInfo: user.profileInfo,
            profilePhoto: user.profilePhoto,
            linkedin: user.linkedin,
            instagram: user.instagram,
            facebook: user.facebook,
            twitter: user.twitter,
            emailVerified: user.emailVerified,
            locale: user.locale,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            subscriptionStatus: user.subscriptionStatus,
            subscriptionStartDate: user.subscriptionStartDate,
            trialEndsAt: user.trialEndsAt,
            // @ts-expect-error - subscriptionPlan tip uyumsuzluğunu görmezden geliyoruz
            subscriptionPlan: user.subscriptionPlan,
            subscriptionPeriod: user.subscriptionPeriod,
            subscriptionAmount: user.subscriptionAmount,
            autoRenewal: user.autoRenewal,
            paymentMethod: user.paymentMethod,
            savedCardId: user.savedCardId ? user.savedCardId.toString() : undefined,
            lastPaymentDate: user.lastPaymentDate,
            nextPaymentDate: user.nextPaymentDate,
            billingAddress: user.billingAddress,
            vatNumber: user.vatNumber,
            isSubscriptionActive: hasActiveSubscription,
        };
        res.status(201).json({
            success: true,
            token,
            user: userResponse,
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: "Sunucu hatası",
        });
    }
});
exports.register = register;
const login = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array(),
            });
        }
        const { email, password } = req.body;
        const user = yield User_1.User.findOne({ email }).select("+password");
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Geçersiz email veya şifre",
            });
        }
        const isMatch = yield user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Geçersiz email veya şifre",
            });
        }
        user.authProvider = "email";
        yield user.save();
        const token = createToken(user._id);
        const hasActiveSubscription = user.subscriptionStatus === "active" ||
            user.subscriptionStatus === "trial";
        const userResponse = {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            title: user.title,
            location: user.location,
            profileInfo: user.profileInfo,
            profilePhoto: user.profilePhoto,
            linkedin: user.linkedin,
            instagram: user.instagram,
            facebook: user.facebook,
            twitter: user.twitter,
            emailVerified: user.emailVerified,
            locale: user.locale,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            subscriptionStatus: user.subscriptionStatus,
            subscriptionStartDate: user.subscriptionStartDate,
            trialEndsAt: user.trialEndsAt,
            // @ts-expect-error - subscriptionPlan tip uyumsuzluğunu görmezden geliyoruz
            subscriptionPlan: user.subscriptionPlan,
            subscriptionPeriod: user.subscriptionPeriod,
            subscriptionAmount: user.subscriptionAmount,
            autoRenewal: user.autoRenewal,
            paymentMethod: user.paymentMethod,
            savedCardId: user.savedCardId ? user.savedCardId.toString() : undefined,
            lastPaymentDate: user.lastPaymentDate,
            nextPaymentDate: user.nextPaymentDate,
            billingAddress: user.billingAddress,
            vatNumber: user.vatNumber,
            isSubscriptionActive: hasActiveSubscription,
        };
        res.status(200).json({
            success: true,
            token,
            user: userResponse,
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: "Sunucu hatası",
        });
    }
});
exports.login = login;
const getCurrentUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Oturum açmanız gerekiyor",
            });
        }
        // Kullanıcı aktif bir aboneliğe sahip mi?
        const hasActiveSubscription = user.subscriptionStatus === "active" ||
            user.subscriptionStatus === "trial";
        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                title: user.title,
                location: user.location,
                profileInfo: user.profileInfo,
                profilePhoto: user.profilePhoto,
                linkedin: user.linkedin,
                instagram: user.instagram,
                facebook: user.facebook,
                twitter: user.twitter,
                emailVerified: user.emailVerified,
                locale: user.locale,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                subscriptionStatus: user.subscriptionStatus,
                subscriptionStartDate: user.subscriptionStartDate,
                trialEndsAt: user.trialEndsAt,
                // @ts-expect-error - subscriptionPlan tip uyumsuzluğunu görmezden geliyoruz
                subscriptionPlan: user.subscriptionPlan,
                subscriptionPeriod: user.subscriptionPeriod,
                subscriptionAmount: user.subscriptionAmount,
                autoRenewal: user.autoRenewal,
                paymentMethod: user.paymentMethod,
                savedCardId: user.savedCardId ? user.savedCardId.toString() : undefined,
                lastPaymentDate: user.lastPaymentDate,
                nextPaymentDate: user.nextPaymentDate,
                billingAddress: user.billingAddress,
                vatNumber: user.vatNumber,
                isSubscriptionActive: hasActiveSubscription,
            },
        });
    }
    catch (err) {
        console.error("Kullanıcı bilgileri alınırken hata:", err);
        res.status(500).json({
            success: false,
            message: "Kullanıcı bilgileri alınırken bir hata oluştu",
            error: err.message,
        });
    }
});
exports.getCurrentUser = getCurrentUser;
const updateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Oturum açmanız gerekiyor",
            });
        }
        // Güncellenmek istenen alanları al
        const { firstName, lastName, email, phone, title, location, profileInfo, profilePhoto, linkedin, instagram, facebook, twitter, password, locale, } = req.body;
        // Gerekli alanları güncelle
        if (firstName)
            user.firstName = firstName;
        if (lastName)
            user.lastName = lastName;
        if (email)
            user.email = email;
        if (phone)
            user.phone = phone;
        if (title)
            user.title = title;
        if (location)
            user.location = location;
        if (profileInfo)
            user.profileInfo = profileInfo;
        if (profilePhoto)
            user.profilePhoto = profilePhoto;
        if (linkedin)
            user.linkedin = linkedin;
        if (instagram)
            user.instagram = instagram;
        if (facebook)
            user.facebook = facebook;
        if (twitter)
            user.twitter = twitter;
        if (locale)
            user.locale = locale;
        // Şifre güncelleniyorsa hashle
        if (password && password.length >= 6) {
            const salt = yield bcryptjs_1.default.genSalt(10);
            user.password = yield bcryptjs_1.default.hash(password, salt);
        }
        // Güncellenmiş kullanıcıyı kaydet
        yield user.save();
        res.status(200).json({
            success: true,
            message: "Kullanıcı bilgileri başarıyla güncellendi",
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                title: user.title,
                location: user.location,
                profileInfo: user.profileInfo,
                profilePhoto: user.profilePhoto,
                linkedin: user.linkedin,
                instagram: user.instagram,
                facebook: user.facebook,
                twitter: user.twitter,
                emailVerified: user.emailVerified,
                locale: user.locale,
            },
        });
    }
    catch (err) {
        console.error("Kullanıcı güncelleme hatası:", err);
        res.status(500).json({
            success: false,
            message: "Kullanıcı bilgileri güncellenirken bir hata oluştu",
            error: err.message,
        });
    }
});
exports.updateUser = updateUser;
const getUserById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.params.id;
        const user = yield User_1.User.findById(userId).select("-password");
        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "Kullanıcı bulunamadı" });
        }
        const hasActiveSubscription = user.subscriptionStatus === "active" ||
            user.subscriptionStatus === "trial";
        res.status(200).json({
            success: true,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                phone: user.phone,
                title: user.title,
                location: user.location,
                profileInfo: user.profileInfo,
                profilePhoto: user.profilePhoto,
                linkedin: user.linkedin,
                instagram: user.instagram,
                facebook: user.facebook,
                twitter: user.twitter,
                emailVerified: user.emailVerified,
                locale: user.locale,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                subscriptionStatus: user.subscriptionStatus,
                subscriptionStartDate: user.subscriptionStartDate,
                trialEndsAt: user.trialEndsAt,
                // @ts-expect-error - subscriptionPlan tip uyumsuzluğunu görmezden geliyoruz
                subscriptionPlan: user.subscriptionPlan,
                subscriptionPeriod: user.subscriptionPeriod,
                subscriptionAmount: user.subscriptionAmount,
                autoRenewal: user.autoRenewal,
                paymentMethod: user.paymentMethod,
                savedCardId: user.savedCardId ? user.savedCardId.toString() : undefined,
                lastPaymentDate: user.lastPaymentDate,
                nextPaymentDate: user.nextPaymentDate,
                billingAddress: user.billingAddress,
                vatNumber: user.vatNumber,
                isSubscriptionActive: hasActiveSubscription,
            },
        });
    }
    catch (err) {
        res
            .status(500)
            .json({ success: false, message: "Sunucu hatası", error: err.message });
    }
});
exports.getUserById = getUserById;
const addFavorite = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const token = (_a = req.header("Authorization")) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Yetkilendirme başarısız, token bulunamadı",
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = yield User_1.User.findById(decoded.id);
        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "Kullanıcı bulunamadı" });
        }
        const { type, itemId } = req.body;
        if (!type || !itemId) {
            return res.status(400).json({
                success: false,
                message: "type ve itemId alanları gereklidir",
            });
        }
        if (type === "user") {
            if (user.favoriteUsers && user.favoriteUsers.includes(itemId)) {
                return res
                    .status(400)
                    .json({ success: false, message: "Kullanıcı zaten favorilerde" });
            }
            user.favoriteUsers = user.favoriteUsers || [];
            user.favoriteUsers.push(itemId);
        }
        else if (type === "company") {
            if (user.favoriteCompanies && user.favoriteCompanies.includes(itemId)) {
                return res
                    .status(400)
                    .json({ success: false, message: "Şirket zaten favorilerde" });
            }
            user.favoriteCompanies = user.favoriteCompanies || [];
            user.favoriteCompanies.push(itemId);
        }
        else if (type === "product") {
            if (user.favoriteProducts && user.favoriteProducts.includes(itemId)) {
                return res
                    .status(400)
                    .json({ success: false, message: "Ürün zaten favorilerde" });
            }
            user.favoriteProducts = user.favoriteProducts || [];
            user.favoriteProducts.push(itemId);
        }
        else {
            return res
                .status(400)
                .json({ success: false, message: "Geçersiz favori türü" });
        }
        yield user.save();
        res.status(200).json({ success: true, message: "Favorilere eklendi" });
    }
    catch (err) {
        res
            .status(500)
            .json({ success: false, message: "Sunucu hatası", error: err.message });
    }
});
exports.addFavorite = addFavorite;
const removeFavorite = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const token = (_a = req.header("Authorization")) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Yetkilendirme başarısız, token bulunamadı",
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = yield User_1.User.findById(decoded.id);
        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "Kullanıcı bulunamadı" });
        }
        const { type, itemId } = req.body;
        if (!type || !itemId) {
            return res.status(400).json({
                success: false,
                message: "type ve itemId alanları gereklidir",
            });
        }
        if (type === "user") {
            user.favoriteUsers = user.favoriteUsers || [];
            user.favoriteUsers = user.favoriteUsers.filter((fav) => fav.toString() !== itemId);
        }
        else if (type === "company") {
            user.favoriteCompanies = user.favoriteCompanies || [];
            user.favoriteCompanies = user.favoriteCompanies.filter((fav) => fav.toString() !== itemId);
        }
        else if (type === "product") {
            user.favoriteProducts = user.favoriteProducts || [];
            user.favoriteProducts = user.favoriteProducts.filter((fav) => fav.toString() !== itemId);
        }
        else {
            return res
                .status(400)
                .json({ success: false, message: "Geçersiz favori türü" });
        }
        yield user.save();
        res.status(200).json({ success: true, message: "Favoriden kaldırıldı" });
    }
    catch (err) {
        res
            .status(500)
            .json({ success: false, message: "Sunucu hatası", error: err.message });
    }
});
exports.removeFavorite = removeFavorite;
const getFavorites = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const token = (_a = req.header("Authorization")) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "");
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Yetkilendirme başarısız, token bulunamadı",
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = yield User_1.User.findById(decoded.id)
            .populate("favoriteUsers", "firstName lastName email")
            .populate("favoriteCompanies", "name description")
            .populate("favoriteProducts", "name price")
            .lean();
        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "Kullanıcı bulunamadı" });
        }
        user.favoriteUsers = (user.favoriteUsers || []).filter((fav) => fav);
        res.status(200).json({
            success: true,
            favorites: {
                favoriteUsers: user.favoriteUsers,
                favoriteCompanies: user.favoriteCompanies,
                favoriteProducts: user.favoriteProducts,
            },
        });
    }
    catch (err) {
        res
            .status(500)
            .json({ success: false, message: "Sunucu hatası", error: err.message });
    }
});
exports.getFavorites = getFavorites;
const googleCallback = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("[GoogleCallback] Callback başladı");
        if (!req.user) {
            console.error("[GoogleCallback] Kullanıcı bulunamadı");
            return res.redirect(`${process.env.CLIENT_URL}/auth/login?error=google-user-not-found`);
        }
        console.log("[GoogleCallback] Kullanıcı bilgileri alındı:", {
            userId: req.user._id,
            email: req.user.email,
        });
        // JWT token oluştur
        const token = createToken(req.user._id);
        console.log("[GoogleCallback] JWT token oluşturuldu");
        // Frontend'e yönlendir
        const user = req.user;
        const hasActiveSubscription = user.subscriptionStatus === "active" ||
            user.subscriptionStatus === "trial";
        const redirectUrl = encodeURIComponent(JSON.stringify({
            token,
            user: {
                id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                profilePhoto: user.profilePhoto,
                isSubscriptionActive: hasActiveSubscription,
            },
        }));
        console.log("[GoogleCallback] Frontend'e yönlendirme:", `${process.env.CLIENT_URL}/auth/social-callback?data=${redirectUrl}`);
        return res.redirect(`${process.env.CLIENT_URL}/auth/social-callback?data=${redirectUrl}`);
    }
    catch (error) {
        console.error("[GoogleCallback] Hata:", error);
        return res.redirect(`${process.env.CLIENT_URL}/auth/login?error=google-callback-failed`);
    }
});
exports.googleCallback = googleCallback;
const fixSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        // @ts-expect-error - req.user tipini IUser olarak kabul ediyoruz
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Oturum açmanız gerekiyor",
            });
        }
        const user = yield User_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Kullanıcı bulunamadı",
            });
        }
        // Abonelik durumunu kontrol et
        const hasActiveSubscription = user.subscriptionStatus === "active" ||
            user.subscriptionStatus === "trial";
        let updated = false;
        // Eğer paymentHistory içerisinde başarılı ödeme varsa ve status active değilse
        if (user.paymentHistory &&
            user.paymentHistory.length > 0 &&
            user.paymentHistory.some((p) => p.status === "success")) {
            if (!hasActiveSubscription) {
                user.subscriptionStatus = "active";
                updated = true;
            }
            // isSubscriptionActive değeri false ise düzelt
            if (!user.isSubscriptionActive) {
                user.isSubscriptionActive = true;
                updated = true;
            }
            // Güncellemeler varsa kaydet
            if (updated) {
                yield user.save();
                console.log("Kullanıcı abonelik durumu güncellendi:", {
                    userId: user._id,
                    status: user.subscriptionStatus,
                    isActive: user.isSubscriptionActive,
                });
            }
        }
        // Tüm kullanıcı verilerini getirerek durumu kontrol et
        const refreshedUser = yield User_1.User.findById(userId);
        // Son başarılı ödeme tarihini ve kullanıcı bilgilerini getir
        const lastSuccessfulPayment = (_b = refreshedUser === null || refreshedUser === void 0 ? void 0 : refreshedUser.paymentHistory) === null || _b === void 0 ? void 0 : _b.find((p) => p.status === "success");
        res.status(200).json({
            success: true,
            updated,
            data: {
                userId: refreshedUser === null || refreshedUser === void 0 ? void 0 : refreshedUser._id,
                subscriptionStatus: refreshedUser === null || refreshedUser === void 0 ? void 0 : refreshedUser.subscriptionStatus,
                isSubscriptionActive: refreshedUser === null || refreshedUser === void 0 ? void 0 : refreshedUser.isSubscriptionActive,
                manualCheck: (refreshedUser === null || refreshedUser === void 0 ? void 0 : refreshedUser.subscriptionStatus) === "active" ||
                    (refreshedUser === null || refreshedUser === void 0 ? void 0 : refreshedUser.subscriptionStatus) === "trial",
                subscriptionStartDate: refreshedUser === null || refreshedUser === void 0 ? void 0 : refreshedUser.subscriptionStartDate,
                lastPaymentDate: refreshedUser === null || refreshedUser === void 0 ? void 0 : refreshedUser.lastPaymentDate,
                lastSuccessfulPayment,
                debug: {
                    subscriptionStatusType: typeof (refreshedUser === null || refreshedUser === void 0 ? void 0 : refreshedUser.subscriptionStatus),
                    subscriptionStatusLength: (refreshedUser === null || refreshedUser === void 0 ? void 0 : refreshedUser.subscriptionStatus)
                        ? refreshedUser.subscriptionStatus.length
                        : 0,
                    statusRaw: refreshedUser === null || refreshedUser === void 0 ? void 0 : refreshedUser.subscriptionStatus,
                    statusTrimmed: (refreshedUser === null || refreshedUser === void 0 ? void 0 : refreshedUser.subscriptionStatus)
                        ? refreshedUser.subscriptionStatus.trim()
                        : "",
                    statusCharCodes: (refreshedUser === null || refreshedUser === void 0 ? void 0 : refreshedUser.subscriptionStatus)
                        ? Array.from(refreshedUser.subscriptionStatus).map((c) => c.charCodeAt(0))
                        : [],
                },
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Abonelik durumu kontrol edilirken bir hata oluştu",
            error: error.message,
        });
    }
});
exports.fixSubscription = fixSubscription;
const createOrUpdateSubscription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // @ts-expect-error - req.user tipini IUser olarak kabul ediyoruz
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Oturum açmanız gerekiyor",
            });
        }
        const user = yield User_1.User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Kullanıcı bulunamadı",
            });
        }
        const { plan, period, paymentMethod, cardId } = req.body;
        if (!plan || !period || !paymentMethod) {
            return res.status(400).json({
                success: false,
                message: "Plan, dönem ve ödeme yöntemi gereklidir",
            });
        }
        // Ödeme yöntemi kredi kartı ise ve kart id yoksa hata ver
        if (paymentMethod === "creditCard" && !cardId) {
            return res.status(400).json({
                success: false,
                message: "Kredi kartı ödemesi için kart bilgisi gereklidir",
            });
        }
        // Plan tipini kontrol et
        if (!["startup", "business", "investor"].includes(plan)) {
            return res.status(400).json({
                success: false,
                message: "Geçersiz plan türü",
            });
        }
        // Dönem tipini kontrol et
        if (!["monthly", "yearly"].includes(period)) {
            return res.status(400).json({
                success: false,
                message: "Geçersiz dönem türü",
            });
        }
        // İlk abonelik mi kontrol et
        const isFirstSubscription = !user.subscriptionStatus ||
            user.subscriptionStatus === "expired" ||
            user.subscriptionStatus === "cancelled";
        const now = new Date();
        let nextPaymentDate;
        // Startup planı ve ilk abonelik ise 3 aylık deneme süresi ver
        if (isFirstSubscription && plan === "startup") {
            // 3 aylık trial süresi
            const trialEndDate = new Date(now);
            trialEndDate.setMonth(trialEndDate.getMonth() + 3);
            user.subscriptionStatus = "trial";
            user.trialEndsAt = trialEndDate;
            user.subscriptionStartDate = now;
            user.nextPaymentDate = trialEndDate;
            user.isSubscriptionActive = true;
            nextPaymentDate = trialEndDate;
        }
        else {
            // Normal ücretli abonelik
            user.subscriptionStatus = "active";
            user.subscriptionStartDate = now;
            user.isSubscriptionActive = true;
            // Dönem sonunu hesapla
            if (period === "monthly") {
                nextPaymentDate = new Date(now);
                nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
            }
            else {
                // yearly
                nextPaymentDate = new Date(now);
                nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
            }
            user.nextPaymentDate = nextPaymentDate;
            user.lastPaymentDate = now;
        }
        // Abonelik bilgilerini güncelle
        user.subscriptionPlan = plan;
        user.subscriptionPeriod = period;
        user.paymentMethod = paymentMethod;
        user.autoRenewal = true;
        // Kart bilgisini kaydet
        if (paymentMethod === "creditCard" && cardId) {
            user.savedCardId = cardId;
        }
        // Plana göre fiyatı belirle
        let amount = 0;
        if (plan === "startup") {
            amount = period === "monthly" ? 99 : 990;
        }
        else if (plan === "business") {
            amount = period === "monthly" ? 199 : 1990;
        }
        else if (plan === "investor") {
            amount = period === "monthly" ? 299 : 2990;
        }
        user.subscriptionAmount = amount;
        // Deneme süreci değilse, ödeme kaydı ekle
        if (user.subscriptionStatus !== "trial") {
            // Ödeme kaydı oluştur
            if (!user.paymentHistory) {
                user.paymentHistory = [];
            }
            user.paymentHistory.push({
                amount,
                date: now,
                status: "success",
                type: "subscription",
                plan,
                period,
            });
        }
        yield user.save();
        // Yanıt döndür
        const hasActiveSubscription = user.subscriptionStatus === "active" ||
            user.subscriptionStatus === "trial";
        res.status(200).json({
            success: true,
            subscription: {
                status: user.subscriptionStatus,
                plan: user.subscriptionPlan,
                period: user.subscriptionPeriod,
                startDate: user.subscriptionStartDate,
                amount: user.subscriptionAmount,
                nextPaymentDate: user.nextPaymentDate,
                isActive: hasActiveSubscription,
                trialEndsAt: user.trialEndsAt,
            },
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: "Abonelik işlemi sırasında bir hata oluştu",
            error: err.message,
        });
    }
});
exports.createOrUpdateSubscription = createOrUpdateSubscription;
// Trial abonelikler için kontrol ve otomatik ödeme yenileme - bu genellikle bir cronjob olarak çalışır
// Bu kod örnek olup, gerçek uygulamada bir cronjob servisi tarafından günlük olarak çağrılmalıdır
const checkAndRenewTrialSubscriptions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Sadece admin kullanıcısına izin ver
        // @ts-expect-error - req.user tipini IUser olarak kabul ediyoruz
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const user = yield User_1.User.findById(userId);
        if (!user || user.role !== "admin") {
            return res.status(403).json({
                success: false,
                message: "Bu işlem için yetkiniz bulunmamaktadır",
            });
        }
        const now = new Date();
        // Deneme süresi bugün biten ve otomatik yenileme açık olan kullanıcıları bul
        const usersWithEndingTrial = yield User_1.User.find({
            subscriptionStatus: "trial",
            trialEndsAt: { $lte: now },
            autoRenewal: true,
            savedCardId: { $exists: true, $ne: null },
        });
        let processed = 0;
        let failed = 0;
        // Her bir kullanıcı için
        for (const trialUser of usersWithEndingTrial) {
            try {
                // Gerçek uygulamada burada bir ödeme servisi ile entegrasyon olmalı
                // Örnek: const paymentResult = await paymentService.chargeCard(trialUser.savedCardId, trialUser.subscriptionAmount);
                // Ödeme başarılı kabul edelim (gerçek uygulamada ödeme API yanıtına göre belirlenecek)
                const paymentSuccess = true;
                if (paymentSuccess) {
                    // Aboneliği aktif hale getir
                    trialUser.subscriptionStatus = "active";
                    trialUser.isSubscriptionActive = true;
                    trialUser.lastPaymentDate = now;
                    // Bir sonraki ödeme tarihini hesapla
                    let nextPaymentDate;
                    if (trialUser.subscriptionPeriod === "monthly") {
                        nextPaymentDate = new Date(now);
                        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
                    }
                    else {
                        // yearly
                        nextPaymentDate = new Date(now);
                        nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
                    }
                    trialUser.nextPaymentDate = nextPaymentDate;
                    // Ödeme geçmişine ekle
                    if (!trialUser.paymentHistory) {
                        trialUser.paymentHistory = [];
                    }
                    trialUser.paymentHistory.push({
                        amount: trialUser.subscriptionAmount || 0,
                        date: now,
                        status: "success",
                        type: "subscription",
                        // @ts-expect-error - subscriptionPlan null olabilir sorunu
                        plan: trialUser.subscriptionPlan,
                        period: trialUser.subscriptionPeriod,
                    });
                    yield trialUser.save();
                    processed++;
                }
                else {
                    // Ödeme başarısız olursa aboneliği süresi dolmuş olarak işaretle
                    trialUser.subscriptionStatus = "expired";
                    trialUser.isSubscriptionActive = false;
                    if (!trialUser.paymentHistory) {
                        trialUser.paymentHistory = [];
                    }
                    // Başarısız ödeme kaydı
                    trialUser.paymentHistory.push({
                        amount: trialUser.subscriptionAmount || 0,
                        date: now,
                        status: "failed",
                        type: "subscription",
                        // @ts-expect-error - subscriptionPlan null olabilir sorunu
                        plan: trialUser.subscriptionPlan,
                        period: trialUser.subscriptionPeriod,
                    });
                    yield trialUser.save();
                    failed++;
                }
            }
            catch (error) {
                console.error(`Trial renewal failed for user ${trialUser._id}:`, error);
                failed++;
            }
        }
        res.status(200).json({
            success: true,
            message: `İşlem tamamlandı: ${processed} kullanıcı başarıyla yenilendi, ${failed} kullanıcı için işlem başarısız oldu.`,
            processed,
            failed,
            total: usersWithEndingTrial.length,
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: "Trial abonelik kontrolü sırasında bir hata oluştu",
            error: err.message,
        });
    }
});
exports.checkAndRenewTrialSubscriptions = checkAndRenewTrialSubscriptions;
/**
 * Google token ile giriş yapar ve JWT token döndürür
 * @param req Express request
 * @param res Express response
 */
const googleLogin = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log("Google login isteği alındı:", {
            body: req.body,
            headers: req.headers,
        });
        const { accessToken } = req.body;
        if (!accessToken) {
            console.log("Token bulunamadı:", req.body);
            return res.status(400).json({
                success: false,
                error: "Access token gereklidir",
                details: "Kimlik doğrulama başarısız",
                errorCode: 400,
            });
        }
        const googleService = new googleService_1.GoogleService();
        const authResult = yield googleService.handleAuth({
            user: {
                access_token: accessToken,
            },
        });
        console.log("Google login başarılı:", { userId: authResult.user.id });
        // Frontend'in beklediği formatta yanıt döndür
        res.json({
            token: authResult.token,
            user: authResult.user,
        });
    }
    catch (error) {
        console.error("Google login error:", error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: "Sunucu hatası",
            errorCode: 500,
        });
    }
});
exports.googleLogin = googleLogin;
/**
 * Kullanıcı oturumunu kapatır
 * @param req Express request
 * @param res Express response
 */
const logout = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Burada kendi session/token yönetiminize göre oturum kapatma işlemi yapabilirsiniz
        res.status(200).json({
            success: true,
            message: "Oturum başarıyla kapatıldı",
        });
    }
    catch (error) {
        console.error("Oturum kapatılırken hata oluştu:", error);
        res.status(500).json({
            success: false,
            message: "Oturum kapatılırken bir hata oluştu",
        });
    }
});
exports.logout = logout;
