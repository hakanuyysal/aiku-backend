"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User");
const protect = async (req, res, next) => {
    let token;
    // Token kontrolü
    if (req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Yetkilendirme başarısız, token bulunamadı'
        });
    }
    try {
        // Token'i doğrula
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // Kullanıcıyı veritabanında ara (şifreyi hariç tut)
        const user = await User_1.User.findById(decoded.id).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Kullanıcı bulunamadı'
            });
        }
        // Kullanıcıyı request objesine ekleyerek sonraki middleware'lere ilet
        req.user = user;
        next();
    }
    catch (err) {
        return res.status(401).json({
            success: false,
            message: 'Geçersiz veya süresi dolmuş token'
        });
    }
};
exports.protect = protect;
