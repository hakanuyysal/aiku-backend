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
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const User_1 = require("../models/User");
const dotenv_1 = __importDefault(require("dotenv"));
// Çevre değişkenlerini yükle
dotenv_1.default.config();
// Kullanıcı serileştirme (session için)
passport_1.default.serializeUser((user, done) => {
    done(null, user._id);
});
// Kullanıcı deserileştirme (session için)
passport_1.default.deserializeUser((id, done) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield User_1.User.findById(id);
        done(null, user);
    }
    catch (error) {
        done(error, null);
    }
}));
// Google OAuth stratejisi
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
    scope: ['profile', 'email']
}, (accessToken, refreshToken, profile, done) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    console.log('[GoogleStrategy] Google stratejisi çağırıldı:', {
        profileId: profile.id,
        displayName: profile.displayName,
        email: (_b = (_a = profile.emails) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.value
    });
    console.log('[GoogleStrategy] Access Token:', accessToken.substring(0, 10) + '...');
    console.log('[GoogleStrategy] Profile tam:', JSON.stringify(profile, null, 2));
    try {
        // Google ID'si ile kullanıcıyı ara
        console.log('[GoogleStrategy] Kullanıcı aranıyor:', { email: (_d = (_c = profile.emails) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.value });
        let user = yield User_1.User.findOne({
            email: (_e = profile.emails) === null || _e === void 0 ? void 0 : _e[0].value
        });
        // Kullanıcı yoksa yeni kayıt oluştur
        if (!user) {
            console.log('[GoogleStrategy] Kullanıcı bulunamadı, yeni kullanıcı oluşturuluyor');
            const nameParts = profile.displayName.split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            user = yield User_1.User.create({
                firstName,
                lastName,
                email: (_f = profile.emails) === null || _f === void 0 ? void 0 : _f[0].value,
                profilePhoto: (_g = profile.photos) === null || _g === void 0 ? void 0 : _g[0].value,
                authProvider: 'google',
                emailVerified: true,
                googleId: profile.id
            });
            console.log('[GoogleStrategy] Yeni kullanıcı oluşturuldu:', { userId: user._id });
        }
        else {
            console.log('[GoogleStrategy] Mevcut kullanıcı bulundu:', { userId: user._id });
            // Eğer kullanıcı var ama Google ile giriş yapmıyorsa güncelle
            if (user.authProvider !== 'google' || !user.googleId) {
                user.authProvider = 'google';
                user.googleId = profile.id;
                if (((_j = (_h = profile.photos) === null || _h === void 0 ? void 0 : _h[0]) === null || _j === void 0 ? void 0 : _j.value) && !user.profilePhoto) {
                    user.profilePhoto = profile.photos[0].value;
                }
                yield user.save();
                console.log('[GoogleStrategy] Kullanıcı auth provider Google olarak güncellendi');
            }
        }
        return done(null, user);
    }
    catch (err) {
        console.error('[GoogleStrategy] Hata:', err);
        return done(err, undefined);
    }
})));
exports.default = passport_1.default;
