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
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const googleAuth_1 = require("../config/googleAuth");
/**
 * Kimlik doğrulama işlemleri için kullanılan servis
 */
exports.authService = {
    /**
     * Google token'ını doğrular
     * @param idToken Google ID token
     * @returns Doğrulanmış kullanıcı bilgileri
     */
    verifyIdToken: (idToken) => __awaiter(void 0, void 0, void 0, function* () {
        console.log('[AuthService] Google token doğrulama başlatılıyor');
        try {
            const decodedToken = yield (0, googleAuth_1.verifyGoogleToken)(idToken);
            console.log('[AuthService] Google token doğrulandı:', {
                uid: decodedToken.uid,
                email: decodedToken.email
            });
            return decodedToken;
        }
        catch (error) {
            console.error('[AuthService] Google token doğrulama hatası:', error);
            console.error('[AuthService] Hata detayları:', {
                code: error.code,
                message: error.message,
                name: error.name
            });
            throw error;
        }
    })
};
