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
const linkedinAuth_service_1 = __importDefault(require("../services/linkedinAuth.service"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = require("../models/User");
dotenv_1.default.config();
class LinkedInAuthController {
    /**
     * LinkedIn giriş URL'sini döndürür
     */
    getLinkedInAuthURL(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const authURL = linkedinAuth_service_1.default.getLinkedInAuthURL();
                res.status(200).json({ url: authURL });
            }
            catch (error) {
                console.error("LinkedIn auth URL oluşturma hatası:", error);
                res.status(500).json({
                    error: error.message || "LinkedIn auth URL oluşturulurken bir hata oluştu",
                });
            }
        });
    }
    /**
     * LinkedIn kimlik doğrulama geri dönüş işlemini gerçekleştirir
     */
    handleLinkedInCallback(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { code } = req.body;
                if (!code) {
                    res.status(400).json({ error: "Authorization code gereklidir" });
                    return;
                }
                // LinkedIn code'dan token al
                const tokenData = yield linkedinAuth_service_1.default.getTokenFromCode(code);
                // Token ile kullanıcı bilgilerini al
                const userInfo = yield linkedinAuth_service_1.default.getUserInfo(tokenData.access_token);
                // Kullanıcıyı Supabase'e kaydet/güncelle
                const userData = yield linkedinAuth_service_1.default.signInWithLinkedIn(userInfo);
                // MongoDB'de kullanıcıyı ara veya oluştur
                let mongoUser = yield User_1.User.findOne({ email: userInfo.email });
                if (!mongoUser) {
                    // Kullanıcı yoksa MongoDB'de oluştur
                    console.log("MongoDB'de yeni kullanıcı oluşturuluyor:", userInfo.email);
                    mongoUser = new User_1.User({
                        firstName: userInfo.firstName,
                        lastName: userInfo.lastName,
                        email: userInfo.email,
                        supabaseId: userData.id, // Supabase ID'sini kaydet
                        linkedinId: userInfo.id, // LinkedIn ID'sini kaydet
                        authProvider: "linkedin",
                        emailVerified: true, // LinkedIn kullanıcıları genellikle doğrulanmıştır
                        lastLogin: new Date(),
                        profilePhoto: userInfo.profilePicture || "",
                        linkedin: `https://www.linkedin.com/in/${userInfo.id}/`, // LinkedIn URL'si
                    });
                    yield mongoUser.save();
                    console.log("MongoDB'de yeni kullanıcı oluşturuldu:", mongoUser._id);
                }
                else {
                    // Kullanıcı varsa bilgilerini güncelle
                    console.log("MongoDB'de mevcut kullanıcı güncelleniyor:", mongoUser._id);
                    mongoUser.supabaseId = userData.id;
                    mongoUser.linkedinId = userInfo.id;
                    mongoUser.lastLogin = new Date();
                    // Eksik bilgileri varsa güncelle
                    if (!mongoUser.firstName)
                        mongoUser.firstName = userInfo.firstName;
                    if (!mongoUser.lastName)
                        mongoUser.lastName = userInfo.lastName;
                    if (!mongoUser.linkedin)
                        mongoUser.linkedin = `https://www.linkedin.com/in/${userInfo.id}/`;
                    if (userInfo.profilePicture && !mongoUser.profilePhoto)
                        mongoUser.profilePhoto = userInfo.profilePicture;
                    yield mongoUser.save();
                    console.log("MongoDB'de kullanıcı güncellendi");
                }
                // JWT token oluştur - MongoDB kullanıcı ID'sini kullan
                const jwtSecret = process.env.JWT_SECRET || "your-super-secret-jwt-key";
                const jwtExpire = process.env.JWT_EXPIRE || "24h";
                // @ts-expect-error - expiresIn string olarak kabul ediliyor
                const jwtOptions = { expiresIn: jwtExpire };
                const token = jsonwebtoken_1.default.sign({ id: mongoUser._id.toString() }, // MongoDB ID kullan
                jwtSecret, jwtOptions);
                // Frontend'e kullanıcı bilgilerini ve token'ı gönder
                res.status(200).json({
                    token,
                    user: {
                        id: mongoUser._id,
                        email: mongoUser.email,
                        firstName: mongoUser.firstName,
                        lastName: mongoUser.lastName,
                        provider: "linkedin",
                        profilePhoto: mongoUser.profilePhoto,
                    },
                });
            }
            catch (error) {
                console.error("LinkedIn callback işleme hatası:", error);
                res.status(500).json({
                    error: error.message || "LinkedIn callback işlenirken bir hata oluştu",
                });
            }
        });
    }
}
exports.default = new LinkedInAuthController();
