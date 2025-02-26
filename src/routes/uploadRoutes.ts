import { Router } from 'express';
import { upload } from '../config/upload';
import { protect } from '../middleware/auth';
import { Request, Response } from 'express';

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