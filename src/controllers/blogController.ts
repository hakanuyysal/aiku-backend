import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { Blog } from '../models/Blog';

// **Yeni Blog Oluşturma**
export const createBlog = async (req: Request, res: Response) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
        }
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
        const userId = decoded.id;

        const { title, coverPhoto, fullContent } = req.body;

        const blog = await Blog.create({
            title,
            coverPhoto,
            fullContent,
            author: userId,
            // isApproved otomatik false
        });

        res.status(201).json({ success: true, blog });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
};

// **Blog Güncelleme (kendi içeriğini güncelleme veya admin isApproved değiştirme)**
export const updateBlog = async (req: Request, res: Response) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
        }
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
        const userId = decoded.id;
        const isAdmin = decoded.isAdmin === true;

        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Geçersiz Blog ID'si" });
        }

        const blog = await Blog.findById(id);
        if (!blog) {
            return res.status(404).json({ success: false, message: 'Blog bulunamadı' });
        }

        // Normal kullanıcı yalnızca kendi blog'unu güncelleyebilir
        if (!isAdmin && blog.author.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Bu blogu güncelleme yetkiniz yok' });
        }

        // Sadece admin isApproved alanını güncelleyebilir
        const updates: any = { ...req.body };
        if (!isAdmin) {
            delete updates.isApproved;
        }

        Object.assign(blog, updates);
        await blog.save();

        res.status(200).json({ success: true, blog });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
};

// **Blog Silme**
export const deleteBlog = async (req: Request, res: Response) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
        }
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
        const userId = decoded.id;

        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Geçersiz Blog ID'si" });
        }

        const blog = await Blog.findById(id);
        if (!blog) {
            return res.status(404).json({ success: false, message: 'Blog bulunamadı' });
        }
        if (blog.author.toString() !== userId) {
            return res.status(403).json({ success: false, message: 'Bu blogu silme yetkiniz yok' });
        }

        await blog.deleteOne();
        res.status(200).json({ success: true, message: 'Blog başarıyla silindi' });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
};

// **Belirli Bir Blogu Getirme**
export const getBlogById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Geçersiz Blog ID'si" });
        }

        const blog = await Blog.findById(id).populate('author', 'username email');
        if (!blog) {
            return res.status(404).json({ success: false, message: 'Blog bulunamadı' });
        }

        res.status(200).json({ success: true, blog });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
};

// **Kullanıcının Tüm Bloglarını Getirme**
export const getBlogsByUser = async (req: Request, res: Response) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
        }
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
        const userId = decoded.id;

        const blogs = await Blog.find({ author: userId })
            .sort({ createdAt: -1 })
            .populate('author', 'username');
        res.status(200).json({ success: true, blogs });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
};

// **Tüm Blogları Getirme**
export const getAllBlogs = async (req: Request, res: Response) => {
    try {
        const blogs = await Blog.find()
            .sort({ createdAt: -1 })
            .populate('author', 'username');
        res.status(200).json({ success: true, blogs });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
    }
};
