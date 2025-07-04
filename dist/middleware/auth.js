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
exports.optionalSupabaseToken = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Supabase bağlantı bilgileri
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey);
// Request tipini genişletiyoruz - module augmentation kullanarak
require("express");
const protect = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    let token;
    // Token kontrolü
    if ((_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
    }
    else if ((_b = req.cookies) === null || _b === void 0 ? void 0 : _b.token) {
        token = req.cookies.token;
    }
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Oturum açmanız gerekiyor'
        });
    }
    try {
        // Token'i doğrula
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // Kullanıcıyı veritabanında ara (şifreyi hariç tut)
        const user = yield User_1.User.findById(decoded.id).select("-password");
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Kullanıcı bulunamadı",
            });
        }
        // Kullanıcıyı request objesine ekleyerek sonraki middleware'lere ilet
        req.user = user;
        next();
    }
    catch (err) {
        console.error("Token doğrulama hatası:", err);
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
});
exports.protect = protect;
/**
 * Hem normal JWT token hem de Supabase token ile doğrulama yapan middleware
 * Önce JWT token kontrolü yapar, başarısız olursa Supabase token kontrolü yapar
 */
const optionalSupabaseToken = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    let token;
    // Token kontrolü
    if ((_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
    }
    else if ((_b = req.cookies) === null || _b === void 0 ? void 0 : _b.token) {
        token = req.cookies.token;
    }
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Oturum açmanız gerekiyor'
        });
    }
    try {
        // Önce normal JWT token olarak doğrulamayı dene
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
            const user = yield User_1.User.findById(decoded.id).select("-password");
            if (user) {
                // Kullanıcı bulundu, request'e ekle ve devam et
                req.user = user;
                return next();
            }
        }
        catch (jwtError) {
            // JWT doğrulama hatası, Supabase ile deneyelim
            console.log('JWT token doğrulama başarısız, Supabase ile deneniyor');
        }
        // JWT başarısız oldu, Supabase token olarak dene
        const { data: { user: supabaseUser }, error } = yield supabase.auth.getUser(token);
        if (error || !supabaseUser) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired token',
                error: error === null || error === void 0 ? void 0 : error.message
            });
        }
        // Supabase ID ile MongoDB'deki kullanıcıyı bul
        const user = yield User_1.User.findOne({ supabaseId: supabaseUser.id });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Kullanıcı bulunamadı",
            });
        }
        // Kullanıcıyı request nesnesine ekle
        req.user = user;
        next();
    }
    catch (err) {
        console.error("Token doğrulama hatası:", err);
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
});
exports.optionalSupabaseToken = optionalSupabaseToken;
