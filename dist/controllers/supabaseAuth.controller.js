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
const User_1 = require("../models/User");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
class SupabaseAuthController {
    /**
     * Supabase kullanıcı bilgilerini senkronize eder
     * Bu endpoint, frontend'den Supabase ile giriş yapan kullanıcıları backend'e senkronize etmek için kullanılır
     */
    syncSupabaseUser(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const supabaseUser = req.user;
                const { provider, supabase_user_id, email, user_metadata } = req.body;
                if (!supabaseUser) {
                    return res.status(400).json({
                        success: false,
                        message: 'Kullanıcı bilgileri bulunamadı'
                    });
                }
                console.log('Gelen Supabase verileri:', {
                    supabaseUser,
                    requestBody: req.body,
                    headers: req.headers
                });
                // İsim bilgilerini çıkart
                const firstName = (user_metadata === null || user_metadata === void 0 ? void 0 : user_metadata.given_name) || (user_metadata === null || user_metadata === void 0 ? void 0 : user_metadata.first_name) || '';
                const lastName = (user_metadata === null || user_metadata === void 0 ? void 0 : user_metadata.family_name) || (user_metadata === null || user_metadata === void 0 ? void 0 : user_metadata.last_name) || '';
                const profilePhoto = (user_metadata === null || user_metadata === void 0 ? void 0 : user_metadata.picture) || (user_metadata === null || user_metadata === void 0 ? void 0 : user_metadata.avatar_url) || '';
                // LinkedIn veya diğer sağlayıcı kontrolü
                const authProvider = provider || 'supabase';
                console.log('Çıkarılan kullanıcı bilgileri:', {
                    firstName,
                    lastName,
                    profilePhoto,
                    authProvider
                });
                // Önce email ile kullanıcıyı ara
                let user = yield User_1.User.findOne({ email });
                // Email ile bulunamadıysa, Supabase ID ile ara
                if (!user) {
                    user = yield User_1.User.findOne({ supabaseId: supabase_user_id });
                }
                // LinkedIn ID mevcut ise, bununla da arama yap
                if (!user && (user_metadata === null || user_metadata === void 0 ? void 0 : user_metadata.linkedinId)) {
                    user = yield User_1.User.findOne({ linkedinId: user_metadata.linkedinId });
                }
                if (!user) {
                    // Yeni kullanıcı oluştur
                    console.log('Yeni kullanıcı oluşturuluyor...');
                    user = new User_1.User({
                        email,
                        firstName,
                        lastName,
                        supabaseId: supabase_user_id,
                        profilePhoto,
                        authProvider: authProvider,
                        supabaseMetadata: user_metadata,
                        emailVerified: (user_metadata === null || user_metadata === void 0 ? void 0 : user_metadata.email_verified) || false,
                        // LinkedIn ID varsa ekle
                        linkedinId: authProvider === 'linkedin_oidc' || authProvider === 'linkedin' ?
                            (user_metadata === null || user_metadata === void 0 ? void 0 : user_metadata.sub) || (user_metadata === null || user_metadata === void 0 ? void 0 : user_metadata.id) || null : null,
                        lastLogin: new Date()
                    });
                    yield user.save();
                    console.log('✅ Yeni kullanıcı kaydedildi:', { email, provider, id: user._id });
                }
                else {
                    // Mevcut kullanıcıyı güncelle
                    console.log('Mevcut kullanıcı güncelleniyor:', { id: user._id, email: user.email });
                    user.lastLogin = new Date();
                    user.supabaseId = supabase_user_id;
                    if (!user.firstName && firstName) {
                        user.firstName = firstName;
                    }
                    if (!user.lastName && lastName) {
                        user.lastName = lastName;
                    }
                    if (!user.profilePhoto && profilePhoto) {
                        user.profilePhoto = profilePhoto;
                    }
                    // LinkedIn giriş ise linkedinId'yi güncelle
                    if ((authProvider === 'linkedin_oidc' || authProvider === 'linkedin') &&
                        ((user_metadata === null || user_metadata === void 0 ? void 0 : user_metadata.sub) || (user_metadata === null || user_metadata === void 0 ? void 0 : user_metadata.id))) {
                        user.linkedinId = (user_metadata === null || user_metadata === void 0 ? void 0 : user_metadata.sub) || (user_metadata === null || user_metadata === void 0 ? void 0 : user_metadata.id);
                    }
                    user.supabaseMetadata = user_metadata;
                    user.emailVerified = (user_metadata === null || user_metadata === void 0 ? void 0 : user_metadata.email_verified) || user.emailVerified;
                    yield user.save();
                    console.log('✅ Mevcut kullanıcı güncellendi:', { email, provider, id: user._id });
                }
                // JWT token oluştur
                const jwtSecret = process.env.JWT_SECRET || 'your-super-secret-jwt-key';
                const jwtOptions = { expiresIn: '24h' };
                const token = jsonwebtoken_1.default.sign({ id: user._id.toString() }, jwtSecret, jwtOptions);
                res.status(200).json({
                    success: true,
                    message: 'Kullanıcı başarıyla senkronize edildi',
                    token,
                    user: {
                        id: user._id,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        profilePhoto: user.profilePhoto,
                        authProvider: user.authProvider
                    }
                });
            }
            catch (error) {
                console.error('❌ Supabase kullanıcı senkronizasyon hatası:', error);
                res.status(500).json({
                    success: false,
                    message: 'Kullanıcı verileri senkronize edilirken bir hata oluştu.',
                    error: error.message
                });
            }
        });
    }
}
exports.default = new SupabaseAuthController();
