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
const express_1 = require("express");
const upload_1 = require("../config/upload");
const auth_1 = require("../middleware/auth");
const Company_1 = require("../models/Company");
const Product_1 = require("../models/Product");
const TeamMember_1 = require("../models/TeamMember");
const Investment_1 = require("../models/Investment");
const fileUtils_1 = require("../utils/fileUtils");
const router = (0, express_1.Router)();
// Takım Üyesi Profil Fotoğrafı Yükleme / Güncelleme
router.post('/team-member-profile-photo/:teamMemberId', auth_1.protect, upload_1.upload.single('photo'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Lütfen bir dosya yükleyin'
            });
        }
        const teamMember = yield TeamMember_1.TeamMember.findById(req.params.teamMemberId);
        if (!teamMember) {
            return res.status(404).json({
                success: false,
                message: 'Takım üyesi bulunamadı'
            });
        }
        // Eski fotoğrafı sil
        if (teamMember.profilePhoto) {
            (0, fileUtils_1.deleteFile)(teamMember.profilePhoto);
        }
        // Dosya yolunu oluştur
        const fileUrl = `/uploads/images/${req.file.filename}`;
        // Takım üyesinin profil fotoğrafını güncelle
        teamMember.profilePhoto = fileUrl;
        yield teamMember.save();
        res.status(200).json({
            success: true,
            message: 'Takım üyesi profil fotoğrafı başarıyla yüklendi',
            data: { url: fileUrl }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Dosya yükleme hatası',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
    }
}));
// Takım Üyesi Profil Fotoğrafı Silme
router.delete('/team-member-profile-photo/:teamMemberId', auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const teamMember = yield TeamMember_1.TeamMember.findById(req.params.teamMemberId);
        if (!teamMember) {
            return res.status(404).json({
                success: false,
                message: 'Takım üyesi bulunamadı'
            });
        }
        if (teamMember.profilePhoto) {
            (0, fileUtils_1.deleteFile)(teamMember.profilePhoto);
            teamMember.profilePhoto = undefined;
            yield teamMember.save();
        }
        res.status(200).json({
            success: true,
            message: 'Takım üyesi profil fotoğrafı başarıyla silindi'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Dosya silme hatası',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
    }
}));
// Profil fotoğrafı yükleme
router.post('/profile-photo', auth_1.protect, upload_1.upload.single('photo'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Lütfen bir dosya yükleyin'
            });
        }
        // Dosya yolu
        const fileUrl = `/uploads/images/${req.file.filename}`;
        // Eski fotoğrafı sil
        if (req.user && req.user.profilePhoto) {
            (0, fileUtils_1.deleteFile)(req.user.profilePhoto);
        }
        // Kullanıcının profil fotoğrafını güncelle
        if (req.user) {
            req.user.profilePhoto = fileUrl;
            yield req.user.save();
        }
        res.status(200).json({
            success: true,
            message: 'Profil fotoğrafı başarıyla yüklendi',
            data: {
                url: fileUrl
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Dosya yükleme hatası',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
    }
}));
// Profil fotoğrafı silme
router.delete('/profile-photo', auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (req.user && req.user.profilePhoto) {
            (0, fileUtils_1.deleteFile)(req.user.profilePhoto);
            req.user.profilePhoto = undefined;
            yield req.user.save();
        }
        res.status(200).json({
            success: true,
            message: 'Profil fotoğrafı başarıyla silindi'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Dosya silme hatası',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
    }
}));
// Şirket logosu yükleme/güncelleme
router.post('/company-logo/:companyId', auth_1.protect, upload_1.upload.single('logo'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Lütfen bir dosya yükleyin'
            });
        }
        const company = yield Company_1.Company.findById(req.params.companyId);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Şirket bulunamadı'
            });
        }
        // Eski logoyu sil
        if (company.companyLogo) {
            (0, fileUtils_1.deleteFile)(company.companyLogo);
        }
        // Dosya yolu
        const fileUrl = `/uploads/images/${req.file.filename}`;
        // Şirket logosunu güncelle
        company.companyLogo = fileUrl;
        yield company.save();
        res.status(200).json({
            success: true,
            message: 'Şirket logosu başarıyla yüklendi',
            data: {
                url: fileUrl
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Dosya yükleme hatası',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
    }
}));
// Şirket logosu silme
router.delete('/company-logo/:companyId', auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const company = yield Company_1.Company.findById(req.params.companyId);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Şirket bulunamadı'
            });
        }
        if (company.companyLogo) {
            (0, fileUtils_1.deleteFile)(company.companyLogo);
            company.companyLogo = undefined;
            yield company.save();
        }
        res.status(200).json({
            success: true,
            message: 'Şirket logosu başarıyla silindi'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Dosya silme hatası',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
    }
}));
// Ürün logosu yükleme/güncelleme
router.post('/product-logo/:productId', auth_1.protect, upload_1.upload.single('logo'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Lütfen bir dosya yükleyin'
            });
        }
        const product = yield Product_1.Product.findById(req.params.productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Ürün bulunamadı'
            });
        }
        // Eski logoyu sil
        if (product.productLogo) {
            (0, fileUtils_1.deleteFile)(product.productLogo);
        }
        // Dosya yolu
        const fileUrl = `/uploads/images/${req.file.filename}`;
        // Ürün logosunu güncelle
        product.productLogo = fileUrl;
        yield product.save();
        res.status(200).json({
            success: true,
            message: 'Ürün logosu başarıyla yüklendi',
            data: {
                url: fileUrl
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Dosya yükleme hatası',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
    }
}));
// Ürün logosu silme
router.delete('/product-logo/:productId', auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const product = yield Product_1.Product.findById(req.params.productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Ürün bulunamadı'
            });
        }
        if (product.productLogo) {
            (0, fileUtils_1.deleteFile)(product.productLogo);
            product.productLogo = undefined;
            yield product.save();
        }
        res.status(200).json({
            success: true,
            message: 'Ürün logosu başarıyla silindi'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Dosya silme hatası',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
    }
}));
// Yatırım Teklifi Logosunu Yükleme / Güncelleme
router.post('/investment-logo/:investmentId', auth_1.protect, upload_1.upload.single('logo'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Lütfen bir dosya yükleyin'
            });
        }
        const investment = yield Investment_1.Investment.findById(req.params.investmentId);
        if (!investment) {
            return res.status(404).json({
                success: false,
                message: 'Yatırım teklifi bulunamadı'
            });
        }
        // Eski logoyu sil
        if (investment.logo) {
            (0, fileUtils_1.deleteFile)(investment.logo);
        }
        // Dosya yolu oluşturma
        const fileUrl = `/uploads/images/${req.file.filename}`;
        // Yatırım teklifinin logosunu güncelleme
        investment.logo = fileUrl;
        yield investment.save();
        res.status(200).json({
            success: true,
            message: 'Yatırım teklifi logosu başarıyla yüklendi',
            data: { url: fileUrl }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Dosya yükleme hatası',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
    }
}));
// Yatırım Teklifi Logosunu Silme
router.delete('/investment-logo/:investmentId', auth_1.protect, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const investment = yield Investment_1.Investment.findById(req.params.investmentId);
        if (!investment) {
            return res.status(404).json({
                success: false,
                message: 'Yatırım teklifi bulunamadı'
            });
        }
        if (investment.logo) {
            (0, fileUtils_1.deleteFile)(investment.logo);
            investment.logo = undefined;
            yield investment.save();
        }
        res.status(200).json({
            success: true,
            message: 'Yatırım teklifi logosu başarıyla silindi'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Dosya silme hatası',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
    }
}));
// Döküman yükleme
router.post('/document', auth_1.protect, upload_1.upload.single('document'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Lütfen bir dosya yükleyin'
            });
        }
        const fileUrl = `/uploads/documents/${req.file.filename}`;
        res.status(200).json({
            success: true,
            message: 'Döküman başarıyla yüklendi',
            data: {
                url: fileUrl
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Dosya yükleme hatası',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
    }
}));
exports.default = router;
