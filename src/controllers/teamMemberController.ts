// @ts-nocheck - Typescript hatalarını görmezden gel
import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { TeamMember } from '../models/TeamMember';

// **Yeni Takım Üyesi Oluşturma**
export const createTeamMember = async (req: Request, res: Response) => {
  try {
    // Validasyon hatalarını kontrol et
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Token doğrulama
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
    }
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded.id;

    const { firstName, lastName, title, profilePhoto, company, companyName } = req.body;

    // Yeni takım üyesi oluştur
    const teamMember = await TeamMember.create({
      firstName,
      lastName,
      title,
      profilePhoto,
      company,
      companyName,
      user: userId,
    });

    res.status(201).json({ success: true, teamMember });
  } catch (err: any) {
    res
      .status(500)
      .json({ success: false, message: 'Sunucu hatası', error: err.message });
  }
};

// **Takım Üyesini Güncelleme**
export const updateTeamMember = async (req: Request, res: Response) => {
  try {
    // Token doğrulama
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
    }
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded.id;

    const { id } = req.params;
    const teamMember = await TeamMember.findById(id);
    if (!teamMember) {
      return res.status(404).json({ success: false, message: 'Takım üyesi bulunamadı' });
    }
    // @ts-expect-error - ITeamMember tipinde user alanı tanımlı değil fakat kod içinde kullanılıyor
    if (teamMember.user.toString() !== userId) {
      return res
        .status(403)
        .json({ success: false, message: 'Bu takım üyesini güncelleme yetkiniz yok' });
    }

    // Güncellenecek alanları belirle
    Object.assign(teamMember, req.body);

    await teamMember.save();
    res.status(200).json({ success: true, teamMember });
  } catch (err: any) {
    res
      .status(500)
      .json({ success: false, message: 'Sunucu hatası', error: err.message });
  }
};

// **Takım Üyesini Silme**
export const deleteTeamMember = async (req: Request, res: Response) => {
  try {
    // Token doğrulama
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
    }
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded.id;

    const { id } = req.params;
    const teamMember = await TeamMember.findById(id);
    if (!teamMember) {
      return res.status(404).json({ success: false, message: 'Takım üyesi bulunamadı' });
    }
    // @ts-expect-error - ITeamMember tipinde user alanı tanımlı değil fakat kod içinde kullanılıyor
    if (teamMember.user.toString() !== userId) {
      return res
        .status(403)
        .json({ success: false, message: 'Bu takım üyesini silme yetkiniz yok' });
    }

    await teamMember.deleteOne();
    res
      .status(200)
      .json({ success: true, message: 'Takım üyesi başarıyla silindi' });
  } catch (err: any) {
    res
      .status(500)
      .json({ success: false, message: 'Sunucu hatası', error: err.message });
  }
};

// **Belirli Bir Takım Üyesini Getirme**
export const getTeamMemberById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const teamMember = await TeamMember.findById(id).populate('company', 'companyName');
    if (!teamMember) {
      return res.status(404).json({ success: false, message: 'Takım üyesi bulunamadı' });
    }
    res.status(200).json({ success: true, teamMember });
  } catch (err: any) {
    res
      .status(500)
      .json({ success: false, message: 'Sunucu hatası', error: err.message });
  }
};

// **Kullanıcının Tüm Takım Üyelerini Getirme**
export const getTeamMembersByUser = async (req: Request, res: Response) => {
  try {
    // Token doğrulama
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
    }
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded.id;

    const teamMembers = await TeamMember.find({ user: userId }).populate('company', 'companyName');
    res.status(200).json({ success: true, teamMembers });
  } catch (err: any) {
    res
      .status(500)
      .json({ success: false, message: 'Sunucu hatası', error: err.message });
  }
};

// **Belirli Bir Şirkete Ait Takım Üyelerini Getirme**
export const getTeamMembersByCompany = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      return res
        .status(400)
        .json({ success: false, message: "Geçersiz Şirket ID'si" });
    }

    const teamMembers = await TeamMember.find({ company: companyId }).populate('company', 'companyName');
    res.status(200).json({ success: true, teamMembers });
  } catch (err: any) {
    res
      .status(500)
      .json({ success: false, message: 'Sunucu hatası', error: err.message });
  }
};

// **Tüm Takım Üyelerini Getirme**
export const getAllTeamMembers = async (_req: Request, res: Response) => {
  try {
    const teamMembers = await TeamMember.find().populate('company', 'companyName');
    res.status(200).json({ success: true, teamMembers });
  } catch (err: any) {
    res
      .status(500)
      .json({ success: false, message: 'Sunucu hatası', error: err.message });
  }
};
