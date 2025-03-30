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
exports.GoogleService = void 0;
const User_1 = require("../models/User");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
const axios_1 = __importDefault(require("axios"));
dotenv_1.default.config();
class GoogleService {
    handleAuth(data) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                console.log("GoogleService.handleAuth başladı:", data);
                // Google'dan kullanıcı bilgilerini al
                const googleUserInfo = yield this.getGoogleUserInfo(data.user.access_token);
                console.log("Google kullanıcı bilgileri alındı:", googleUserInfo);
                // MongoDB'de kullanıcıyı ara veya oluştur
                let user = yield User_1.User.findOne({ email: googleUserInfo.email });
                const userData = {
                    firstName: googleUserInfo.given_name || ((_a = googleUserInfo.email) === null || _a === void 0 ? void 0 : _a.split("@")[0]),
                    lastName: googleUserInfo.family_name || "",
                    email: googleUserInfo.email,
                    emailVerified: googleUserInfo.email_verified,
                    authProvider: "google",
                    lastLogin: new Date(),
                    googleId: googleUserInfo.sub,
                };
                if (!user) {
                    console.log("Yeni kullanıcı oluşturuluyor:", userData);
                    // Yeni kullanıcı için profil fotoğrafını ekle
                    user = new User_1.User(Object.assign(Object.assign({}, userData), { profilePhoto: googleUserInfo.picture }));
                    yield user.save();
                }
                else {
                    const currentProfilePhoto = user.profilePhoto;
                    console.log("Mevcut kullanıcı güncelleniyor:", {
                        userId: user._id,
                        mevcutProfilFoto: currentProfilePhoto,
                    });
                    // Önce diğer bilgileri güncelle
                    user.firstName = userData.firstName;
                    user.lastName = userData.lastName;
                    user.emailVerified = userData.emailVerified;
                    user.authProvider = userData.authProvider;
                    user.lastLogin = userData.lastLogin;
                    user.googleId = userData.googleId;
                    // Eğer mevcut profil fotoğrafı yoksa, Google'dan gelen fotoğrafı kullan
                    if (!currentProfilePhoto && googleUserInfo.picture) {
                        console.log("Profil fotoğrafı ekleniyor çünkü mevcut fotoğraf yok");
                        user.profilePhoto = googleUserInfo.picture;
                    }
                    else {
                        console.log("Mevcut profil fotoğrafı korunuyor:", currentProfilePhoto);
                    }
                    yield user.save();
                }
                const jwtOptions = {
                    expiresIn: process.env.JWT_EXPIRE
                        ? parseInt(process.env.JWT_EXPIRE)
                        : "24h",
                };
                const token = jsonwebtoken_1.default.sign({
                    id: user._id.toString(),
                    googleId: googleUserInfo.sub,
                }, process.env.JWT_SECRET || "your-super-secret-jwt-key", jwtOptions);
                console.log("JWT token oluşturuldu", token);
                return {
                    user: {
                        id: user._id.toString(),
                        firstName: user.firstName,
                        lastName: user.lastName,
                        email: user.email,
                        profilePhoto: user.profilePhoto,
                        emailVerified: user.emailVerified,
                        googleId: user.googleId,
                    },
                    token,
                };
            }
            catch (error) {
                console.error("Google auth error:", error);
                throw new Error("Google ile giriş işlemi başarısız: " + error.message);
            }
        });
    }
    getGoogleUserInfo(accessToken) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const response = yield axios_1.default.get("https://www.googleapis.com/oauth2/v3/userinfo", {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                return response.data;
            }
            catch (error) {
                console.error("Google userinfo error:", ((_a = error.response) === null || _a === void 0 ? void 0 : _a.data) || error.message);
                throw new Error("Google kullanıcı bilgileri alınamadı");
            }
        });
    }
}
exports.GoogleService = GoogleService;
