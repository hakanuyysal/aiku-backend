import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { Product } from '../models/Product';
import mongoose from 'mongoose';

// **Yeni Ürün Oluşturma**
export const createProduct = async (req: Request, res: Response) => {
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
      productName,
      productLogo,
      productCategory,
      productDescription,
      detailedDescription,
      tags,
      problems,
      solutions,
      improvements,
      keyFeatures,
      pricingModel,
      releaseDate,
      productPrice,
      productWebsite,
      productLinkedIn,
      productTwitter,
      isHighlighted,
      companyName,
      companyId,
    } = req.body;

    // Yeni ürün oluştur
    const product = await Product.create({
      productName,
      productLogo,
      productCategory,
      productDescription,
      detailedDescription,
      tags,
      problems,
      solutions,
      improvements,
      keyFeatures,
      pricingModel,
      releaseDate,
      productPrice,
      productWebsite,
      productLinkedIn,
      productTwitter,
      isHighlighted,
      companyName,
      companyId,
      user: userId,
    });

    res.status(201).json({ success: true, product });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
  }
};

// **Ürünü Güncelleme**
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
    }
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded.id;

    const { id } = req.params;
    let product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Ürün bulunamadı' });
    }
    if (product.user.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Bu ürünü güncelleme yetkiniz yok' });
    }

    // Güncellenecek alanları belirle
    Object.assign(product, req.body);

    await product.save();
    res.status(200).json({ success: true, product });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
  }
};

// **Ürünü Silme**
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
    }
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded.id;

    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Ürün bulunamadı' });
    }
    if (product.user.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Bu ürünü silme yetkiniz yok' });
    }

    await product.deleteOne();
    res.status(200).json({ success: true, message: 'Ürün başarıyla silindi' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
  }
};

// **Belirli Bir Ürünü Getirme**
export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id).populate('companyId', 'companyName companyLogo');
    if (!product) {
      return res.status(404).json({ success: false, message: 'Ürün bulunamadı' });
    }
    res.status(200).json({ success: true, product });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
  }
};

// **Kullanıcının Tüm Ürünlerini Getirme**
export const getProductsByUser = async (req: Request, res: Response) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
    }
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded.id;

    const products = await Product.find({ user: userId }).populate('companyId', 'companyName companyLogo');
    res.status(200).json({ success: true, products });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
  }
};

// **Belirli Bir Şirkete Ait Ürünleri Getirme**
export const getProductsByCompany = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res.status(400).json({ success: false, message: "Geçersiz Şirket ID'si" });
    }

    const products = await Product.find({ companyId: companyId }).populate('companyId', 'companyName companyLogo');
    res.status(200).json({ success: true, products });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
  }
};

// **Tüm Ürünleri Getirme**
export const getAllProducts = async (req: Request, res: Response) => {
  try {
    // Ürünleri getir ve ilgili şirket bilgilerini al
    const products = await Product.find().populate('companyId', 'companyName companyLogo');

    // console.log("User from req.user:", req.user); 

    // Kullanıcı giriş yapmış olsa bile artık abonelik kontrolü YOK!
    return res.status(200).json({ success: true, products });

  } catch (err: any) {
    console.error("❌ Sunucu hatası:", err.message);
    res.status(500).json({ success: false, message: 'Server error', error: err.message });
  }
};

