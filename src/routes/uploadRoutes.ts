import { Router } from 'express';
import { upload } from '../config/upload';
import { protect } from '../middleware/auth';
import { Request, Response } from 'express';
import { Company } from '../models/Company';
import { Product } from '../models/Product';
import { TeamMember } from '../models/TeamMember';
import { Investment } from '../models/Investment';
import { deleteFile } from '../utils/fileUtils';
import logger from '../config/logger';

const router = Router();

// Takım Üyesi Profil Fotoğrafı Yükleme / Güncelleme
router.post('/team-member-profile-photo/:teamMemberId', protect, upload.single('photo'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Lütfen bir dosya yükleyin'
      });
    }

    const teamMember = await TeamMember.findById(req.params.teamMemberId);
    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: 'Takım üyesi bulunamadı'
      });
    }

    // Eski fotoğrafı sil
    if (teamMember.profilePhoto) {
      deleteFile(teamMember.profilePhoto);
    }

    // Dosya yolunu oluştur
    const fileUrl = `/uploads/images/${req.file.filename}`;

    // Takım üyesinin profil fotoğrafını güncelle
    teamMember.profilePhoto = fileUrl;
    await teamMember.save();

    res.status(200).json({
      success: true,
      message: 'Takım üyesi profil fotoğrafı başarıyla yüklendi',
      data: { url: fileUrl }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Dosya yükleme hatası',
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
    logger.error('Dosya yükleme hatası', {
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
});

// Takım Üyesi Profil Fotoğrafı Silme
router.delete('/team-member-profile-photo/:teamMemberId', protect, async (req: Request, res: Response) => {
  try {
    const teamMember = await TeamMember.findById(req.params.teamMemberId);
    if (!teamMember) {
      return res.status(404).json({
        success: false,
        message: 'Takım üyesi bulunamadı'
      });
    }

    if (teamMember.profilePhoto) {
      deleteFile(teamMember.profilePhoto);
      teamMember.profilePhoto = undefined;
      await teamMember.save();
    }

    res.status(200).json({
      success: true,
      message: 'Takım üyesi profil fotoğrafı başarıyla silindi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Dosya silme hatası',
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
    logger.error('Dosya silme hatası', {
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
});

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

    // Eski fotoğrafı sil
    if (req.user && req.user.profilePhoto) {
      deleteFile(req.user.profilePhoto);
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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Dosya yükleme hatası',
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
    logger.error('Dosya yükleme hatası', {
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
});

// Profil fotoğrafı silme
router.delete('/profile-photo', protect, async (req: Request, res: Response) => {
  try {
    if (req.user && req.user.profilePhoto) {
      deleteFile(req.user.profilePhoto);
      req.user.profilePhoto = undefined;
      await req.user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Profil fotoğrafı başarıyla silindi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Dosya silme hatası',
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
    logger.error('Dosya silme hatası', {
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
});

// Şirket logosu yükleme/güncelleme
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

    // Eski logoyu sil
    if (company.companyLogo) {
      deleteFile(company.companyLogo);
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
    logger.error('Dosya yükleme hatası', {
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
});

// Şirket logosu silme
router.delete('/company-logo/:companyId', protect, async (req: Request, res: Response) => {
  try {
    const company = await Company.findById(req.params.companyId);
    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Şirket bulunamadı'
      });
    }

    if (company.companyLogo) {
      deleteFile(company.companyLogo);
      company.companyLogo = undefined;
      await company.save();
    }

    res.status(200).json({
      success: true,
      message: 'Şirket logosu başarıyla silindi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Dosya silme hatası',
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
});

// Ürün logosu yükleme/güncelleme
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

    // Eski logoyu sil
    if (product.productLogo) {
      deleteFile(product.productLogo);
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

// Ürün logosu silme
router.delete('/product-logo/:productId', protect, async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Ürün bulunamadı'
      });
    }

    if (product.productLogo) {
      deleteFile(product.productLogo);
      product.productLogo = undefined;
      await product.save();
    }

    res.status(200).json({
      success: true,
      message: 'Ürün logosu başarıyla silindi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Dosya silme hatası',
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
});

// Yatırım Teklifi Logosunu Yükleme / Güncelleme
router.post('/investment-logo/:investmentId', protect, upload.single('logo'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Lütfen bir dosya yükleyin'
      });
    }

    const investment = await Investment.findById(req.params.investmentId);
    if (!investment) {
      return res.status(404).json({
        success: false,
        message: 'Yatırım teklifi bulunamadı'
      });
    }

    // Eski logoyu sil
    if (investment.logo) {
      deleteFile(investment.logo);
    }

    // Dosya yolu oluşturma
    const fileUrl = `/uploads/images/${req.file.filename}`;

    // Yatırım teklifinin logosunu güncelleme
    investment.logo = fileUrl;
    await investment.save();

    res.status(200).json({
      success: true,
      message: 'Yatırım teklifi logosu başarıyla yüklendi',
      data: { url: fileUrl }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Dosya yükleme hatası',
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
});

// Yatırım Teklifi Logosunu Silme
router.delete('/investment-logo/:investmentId', protect, async (req: Request, res: Response) => {
  try {
    const investment = await Investment.findById(req.params.investmentId);
    if (!investment) {
      return res.status(404).json({
        success: false,
        message: 'Yatırım teklifi bulunamadı'
      });
    }

    if (investment.logo) {
      deleteFile(investment.logo);
      investment.logo = undefined;
      await investment.save();
    }

    res.status(200).json({
      success: true,
      message: 'Yatırım teklifi logosu başarıyla silindi'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Dosya silme hatası',
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