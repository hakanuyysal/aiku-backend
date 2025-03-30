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
exports.getInvestmentsByProduct = exports.getInvestmentsByCompany = exports.getAllInvestments = exports.getInvestmentById = exports.deleteInvestment = exports.updateInvestment = exports.createInvestment = void 0;
const express_validator_1 = require("express-validator");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Investment_1 = require("../models/Investment");
const mongoose_1 = __importDefault(require("mongoose"));
// **Yeni Yatırım Teklifi Oluşturma**
const createInvestment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Validasyon hatalarını kontrol et
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        // Token doğrulama
        const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const { investmentTitle, companyName, companyId, productName, productId, targetedInvestment, minimumTicket, deadline, investmentType, description, logo, } = req.body;
        // Yeni yatırım teklifi oluştur
        const investment = yield Investment_1.Investment.create({
            investmentTitle,
            companyName,
            companyId,
            productName,
            productId,
            targetedInvestment,
            minimumTicket,
            deadline,
            investmentType,
            description,
            logo,
            // Eğer modelinizde user alanı varsa:
            user: userId,
        });
        res.status(201).json({ success: true, investment });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.createInvestment = createInvestment;
// **Yatırım Teklifini Güncelleme**
const updateInvestment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const { id } = req.params;
        let investment = yield Investment_1.Investment.findById(id);
        if (!investment) {
            return res.status(404).json({ success: false, message: 'Yatırım teklifi bulunamadı' });
        }
        // Eğer yatırım teklifi oluşturulurken user alanı kaydedildiyse, güncelleme yetkisi kontrolü yapın
        // @ts-expect-error - IInvestment tipinde user alanı tanımlı değil fakat kod içinde kullanılıyor
        if (investment.user && investment.user.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Bu yatırım teklifini güncelleme yetkiniz yok' });
        }
        // Güncellenecek alanları belirle
        Object.assign(investment, req.body);
        yield investment.save();
        res.status(200).json({ success: true, investment });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.updateInvestment = updateInvestment;
// **Yatırım Teklifini Silme**
const deleteInvestment = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const token = (_a = req.header('Authorization')) === null || _a === void 0 ? void 0 : _a.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        const { id } = req.params;
        const investment = yield Investment_1.Investment.findById(id);
        if (!investment) {
            return res.status(404).json({ success: false, message: 'Yatırım teklifi bulunamadı' });
        }
        // @ts-expect-error - IInvestment tipinde user alanı tanımlı değil fakat kod içinde kullanılıyor
        if (investment.user && investment.user.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Bu yatırım teklifini silme yetkiniz yok' });
        }
        yield investment.deleteOne();
        res.status(200).json({ success: true, message: 'Yatırım teklifi başarıyla silindi' });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.deleteInvestment = deleteInvestment;
// **Belirli Bir Yatırım Teklifini Getirme**
const getInvestmentById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const investment = yield Investment_1.Investment.findById(id)
            .populate('companyId', 'companyName companyLogo')
            .populate('productId', 'productName productLogo');
        if (!investment) {
            return res.status(404).json({ success: false, message: 'Yatırım teklifi bulunamadı' });
        }
        res.status(200).json({ success: true, investment });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.getInvestmentById = getInvestmentById;
// **Tüm Yatırım Tekliflerini Getirme**
const getAllInvestments = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const investments = yield Investment_1.Investment.find()
            .populate('companyId', 'companyName companyLogo')
            .populate('productId', 'productName productLogo');
        res.status(200).json({ success: true, investments });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.getAllInvestments = getAllInvestments;
// **Belirli Bir Şirkete Ait Yatırım Tekliflerini Getirme**
const getInvestmentsByCompany = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(companyId)) {
            return res.status(400).json({ success: false, message: "Geçersiz Şirket ID'si" });
        }
        const investments = yield Investment_1.Investment.find({ companyId })
            .populate('companyId', 'companyName companyLogo')
            .populate('productId', 'productName productLogo');
        res.status(200).json({ success: true, investments });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.getInvestmentsByCompany = getInvestmentsByCompany;
// **Belirli Bir Ürüne Ait Yatırım Tekliflerini Getirme**
const getInvestmentsByProduct = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { productId } = req.params;
        if (!mongoose_1.default.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: "Geçersiz Ürün ID'si" });
        }
        const investments = yield Investment_1.Investment.find({ productId })
            .populate('companyId', 'companyName companyLogo')
            .populate('productId', 'productName productLogo');
        res.status(200).json({ success: true, investments });
    }
    catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
});
exports.getInvestmentsByProduct = getInvestmentsByProduct;
