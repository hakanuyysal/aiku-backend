import { Router } from 'express';
import { upload } from '../config/upload';
import { protect } from '../middleware/auth';
import { Request, Response } from 'express';
import { Company } from '../models/Company';
import { Product } from '../models/Product';

const router = Router();

// Profil fotoğrafı yükleme
router.post('/profile-photo', protect, upload.single('photo'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Lütfen bir dosya yükleyin'
      });
    }

    // Dosya yolu
    const fileUrl = `/uploads/images/${req.file.filename}`;

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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Dosya yükleme hatası',
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
});

// Şirket logosu yükleme
router.post('/company-logo/:companyId', protect, upload.single('logo'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Lütfen bir dosya yükleyin'
      });
    }

    const company = await Company.findById(req.params.companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Şirket bulunamadı'
      });
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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Dosya yükleme hatası',
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
});

// Ürün logosu yükleme
router.post('/product-logo/:productId', protect, upload.single('logo'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Lütfen bir dosya yükleyin'
      });
    }

    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı'
      });
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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Dosya yükleme hatası',
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
});

// Döküman yükleme
router.post('/document', protect, upload.single('document'), async (req: Request, res: Response) => {
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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Dosya yükleme hatası',
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
});

export default router; 