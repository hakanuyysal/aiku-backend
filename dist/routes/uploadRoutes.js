"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const upload_1 = require("../config/upload");
const auth_1 = require("../middleware/auth");
const Company_1 = require("../models/Company");
const Product_1 = require("../models/Product");
const fileUtils_1 = require("../utils/fileUtils");
const router = (0, express_1.Router)();
// Profil fotoğrafı yükleme
router.post('/profile-photo', auth_1.protect, upload_1.upload.single('photo'), async (req, res) => {
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
            await req.user.save();
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
});
// Profil fotoğrafı silme
router.delete('/profile-photo', auth_1.protect, async (req, res) => {
    try {
        if (req.user && req.user.profilePhoto) {
            (0, fileUtils_1.deleteFile)(req.user.profilePhoto);
            req.user.profilePhoto = undefined;
            await req.user.save();
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
});
// Şirket logosu yükleme/güncelleme
router.post('/company-logo/:companyId', auth_1.protect, upload_1.upload.single('logo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Lütfen bir dosya yükleyin'
            });
        }
        const company = await Company_1.Company.findById(req.params.companyId);
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
        await company.save();
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
});
// Şirket logosu silme
router.delete('/company-logo/:companyId', auth_1.protect, async (req, res) => {
    try {
        const company = await Company_1.Company.findById(req.params.companyId);
        if (!company) {
            return res.status(404).json({
                success: false,
                message: 'Şirket bulunamadı'
            });
        }
        if (company.companyLogo) {
            (0, fileUtils_1.deleteFile)(company.companyLogo);
            company.companyLogo = undefined;
            await company.save();
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
});
// Ürün logosu yükleme/güncelleme
router.post('/product-logo/:productId', auth_1.protect, upload_1.upload.single('logo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Lütfen bir dosya yükleyin'
            });
        }
        const product = await Product_1.Product.findById(req.params.productId);
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
        await product.save();
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
});
// Ürün logosu silme
router.delete('/product-logo/:productId', auth_1.protect, async (req, res) => {
    try {
        const product = await Product_1.Product.findById(req.params.productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Ürün bulunamadı'
            });
        }
        if (product.productLogo) {
            (0, fileUtils_1.deleteFile)(product.productLogo);
            product.productLogo = undefined;
            await product.save();
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
});
// Döküman yükleme
router.post('/document', auth_1.protect, upload_1.upload.single('document'), async (req, res) => {
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
});
exports.default = router;
