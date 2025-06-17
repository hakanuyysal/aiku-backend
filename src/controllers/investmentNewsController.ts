import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { InvestmentNews } from '../models/InvestmentNews';

// YENİ haber oluştur
export const createInvestmentNews = async (req: Request, res: Response) => {
    try {
        const { title, coverPhoto, text, date } = req.body;

        const news = await InvestmentNews.create({
            title,
            coverPhoto,
            text,
            date
        });

        res.status(201).json({ success: true, news });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
};

// HABERİ GÜNCELLE
export const updateInvestmentNews = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Geçersiz ID' });
        }

        const news = await InvestmentNews.findByIdAndUpdate(id, req.body, {
            new: true,
            runValidators: true
        });

        if (!news) {
            return res.status(404).json({ success: false, message: 'Haber bulunamadı' });
        }

        res.status(200).json({ success: true, news });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
};

// HABERİ SİL
export const deleteInvestmentNews = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Geçersiz ID' });
        }

        const deleted = await InvestmentNews.findByIdAndDelete(id);

        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Haber bulunamadı' });
        }

        res.status(200).json({ success: true, message: 'Haber silindi' });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
};

// TEK HABER GETİR
export const getInvestmentNewsById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Geçersiz ID' });
        }

        const news = await InvestmentNews.findById(id);

        if (!news) {
            return res.status(404).json({ success: false, message: 'Haber bulunamadı' });
        }

        res.status(200).json({ success: true, news });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
};

// TÜM HABERLERİ GETİR
export const getAllInvestmentNews = async (_req: Request, res: Response) => {
    try {
        const newsList = await InvestmentNews.find().sort({ date: -1 });
        res.status(200).json({ success: true, data: newsList });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
};
