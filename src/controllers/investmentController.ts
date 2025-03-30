// @ts-nocheck - Typescript hatalarını görmezden gel
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { Investment } from '../models/Investment';
import mongoose from 'mongoose';

// **Yeni Yatırım Teklifi Oluşturma**
export const createInvestment = async (req: Request, res: Response) => {
    try {
        // Validasyon hatalarını kontrol et
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        // Token doğrulama
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
        }
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
        const userId = decoded.id;

        const {
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
        } = req.body;

        // Yeni yatırım teklifi oluştur
        const investment = await Investment.create({
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
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
};

// **Yatırım Teklifini Güncelleme**
export const updateInvestment = async (req: Request, res: Response) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
        }
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
        const userId = decoded.id;

        const { id } = req.params;
        let investment = await Investment.findById(id);
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

        await investment.save();
        res.status(200).json({ success: true, investment });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
};

// **Yatırım Teklifini Silme**
export const deleteInvestment = async (req: Request, res: Response) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
        }
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
        const userId = decoded.id;

        const { id } = req.params;
        const investment = await Investment.findById(id);
        if (!investment) {
            return res.status(404).json({ success: false, message: 'Yatırım teklifi bulunamadı' });
        }
        // @ts-expect-error - IInvestment tipinde user alanı tanımlı değil fakat kod içinde kullanılıyor
        if (investment.user && investment.user.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Bu yatırım teklifini silme yetkiniz yok' });
        }

        await investment.deleteOne();
        res.status(200).json({ success: true, message: 'Yatırım teklifi başarıyla silindi' });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
};

// **Belirli Bir Yatırım Teklifini Getirme**
export const getInvestmentById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const investment = await Investment.findById(id)
            .populate('companyId', 'companyName companyLogo')
            .populate('productId', 'productName productLogo');
        if (!investment) {
            return res.status(404).json({ success: false, message: 'Yatırım teklifi bulunamadı' });
        }
        res.status(200).json({ success: true, investment });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
};

// **Tüm Yatırım Tekliflerini Getirme**
export const getAllInvestments = async (req: Request, res: Response) => {
    try {
        const investments = await Investment.find()
            .populate('companyId', 'companyName companyLogo')
            .populate('productId', 'productName productLogo');
        res.status(200).json({ success: true, investments });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
};

// **Belirli Bir Şirkete Ait Yatırım Tekliflerini Getirme**
export const getInvestmentsByCompany = async (req: Request, res: Response) => {
    try {
        const { companyId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(companyId)) {
            return res.status(400).json({ success: false, message: "Geçersiz Şirket ID'si" });
        }
        const investments = await Investment.find({ companyId })
            .populate('companyId', 'companyName companyLogo')
            .populate('productId', 'productName productLogo');
        res.status(200).json({ success: true, investments });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
};

// **Belirli Bir Ürüne Ait Yatırım Tekliflerini Getirme**
export const getInvestmentsByProduct = async (req: Request, res: Response) => {
    try {
        const { productId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({ success: false, message: "Geçersiz Ürün ID'si" });
        }
        const investments = await Investment.find({ productId })
            .populate('companyId', 'companyName companyLogo')
            .populate('productId', 'productName productLogo');
        res.status(200).json({ success: true, investments });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
};
