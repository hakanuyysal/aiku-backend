import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { Company, ICompany } from '../models/Company';
import mongoose from "mongoose";

interface CompanyResponse {
  id: string;
  companyName: string;
  companyLogo?: string;
  companyType: string;
  openForInvestments?: boolean;
  businessModel: string;
  companySector: string;
  companySize: string;
  companyEmail: string;
  companyPhone: string;
  companyInfo: string;
  detailedDescription: string;
  companyWebsite?: string;
  companyAddress: string;
  companyLinkedIn?: string;
  companyTwitter?: string;
  user: string;
  createdAt: Date;
}


// Şirket oluşturma
export const createCompany = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    // Token doğrulama
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
    }
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded.id;

    const {
      companyName,
      companyLogo,
      companyType,
      openForInvestments,
      businessModel,
      companySector,
      companySize,
      companyEmail,
      companyPhone,
      companyInfo,
      detailedDescription,
      companyWebsite,
      companyAddress,
      companyLinkedIn,
      companyTwitter,
    } = req.body;

    const company = await Company.create({
      companyName,
      companyLogo,
      companyType,
      openForInvestments,
      businessModel,
      companySector,
      companySize,
      companyEmail,
      companyPhone,
      companyInfo,
      detailedDescription,
      companyWebsite,
      companyAddress,
      companyLinkedIn,
      companyTwitter,
      user: userId,
    });

    const companyResponse: CompanyResponse = {
      id: company._id,
      companyName: company.companyName,
      companyLogo: company.companyLogo,
      companyType: company.companyType,
      openForInvestments: company.openForInvestments,
      businessModel: company.businessModel,
      companySector: company.companySector,
      companySize: company.companySize,
      companyEmail: company.companyEmail,
      companyPhone: company.companyPhone,
      companyInfo: company.companyInfo,
      detailedDescription: company.detailedDescription,
      companyWebsite: company.companyWebsite,
      companyAddress: company.companyAddress,
      companyLinkedIn: company.companyLinkedIn,
      companyTwitter: company.companyTwitter,
      user: company.user.toString(),
      createdAt: company.createdAt,
    };

    res.status(201).json({ success: true, company: companyResponse });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
  }
};


// Belirtilen ID'ye sahip şirketi getirme
export const getCompany = async (req: Request, res: Response) => {
  try {
    // Token doğrulama
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
    }
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded.id;

    const { id } = req.params;
    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Şirket bulunamadı' });
    }

    if (company.user.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Bu şirketi görüntüleme yetkiniz yok' });
    }

    const companyResponse: CompanyResponse = {
      id: company._id,
      companyName: company.companyName,
      companyLogo: company.companyLogo,
      companyType: company.companyType,
      openForInvestments: company.openForInvestments,
      businessModel: company.businessModel,
      companySector: company.companySector,
      companySize: company.companySize,
      companyEmail: company.companyEmail,
      companyPhone: company.companyPhone,
      companyInfo: company.companyInfo,
      detailedDescription: company.detailedDescription,
      companyWebsite: company.companyWebsite,
      companyAddress: company.companyAddress,
      companyLinkedIn: company.companyLinkedIn,
      companyTwitter: company.companyTwitter,
      user: company.user.toString(),
      createdAt: company.createdAt,
    };

    res.status(200).json({ success: true, company: companyResponse });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
  }
};


// Kullanıcıya ait tüm şirketleri getirme
export const getCompaniesForUser = async (req: Request, res: Response) => {
  try {
    // Token doğrulaması
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
    }
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded.id;

    // 🛠 **Eğer `userId` bir ObjectId değilse, ObjectId'ye çevir**
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Geçersiz Kullanıcı ID'si" });
    }

    // Kullanıcıya ait tüm şirketleri bulma
    const companies = await Company.find({ user: new mongoose.Types.ObjectId(userId) });

    // Şirket listesini response için düzenleme
    const companiesResponse = companies.map(company => ({
      id: company._id,
      companyName: company.companyName,
      companyLogo: company.companyLogo,
      companyType: company.companyType,
      openForInvestments: company.openForInvestments,
      businessModel: company.businessModel,
      companySector: company.companySector,
      companySize: company.companySize,
      companyEmail: company.companyEmail,
      companyPhone: company.companyPhone,
      companyInfo: company.companyInfo,
      detailedDescription: company.detailedDescription,
      companyWebsite: company.companyWebsite,
      companyAddress: company.companyAddress,
      companyLinkedIn: company.companyLinkedIn,
      companyTwitter: company.companyTwitter,
      user: company.user.toString(),
      createdAt: company.createdAt,
    }));

    res.status(200).json({ success: true, companies: companiesResponse });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
  }
};


// Şirket bilgilerini güncelleme
export const updateCompany = async (req: Request, res: Response) => {
  try {
    // Token doğrulama
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
    }
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded.id;

    const { id } = req.params;
    let company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Şirket bulunamadı' });
    }
    if (company.user.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Bu şirket üzerinde yetkiniz yok' });
    }

    const {
      companyName,
      companyLogo,
      companyType,
      openForInvestments,
      businessModel,
      companySector,
      companySize,
      companyEmail,
      companyPhone,
      companyInfo,
      detailedDescription,
      companyWebsite,
      companyAddress,
      companyLinkedIn,
      companyTwitter,
    } = req.body;

    if (companyName) company.companyName = companyName;
    if (companyLogo) company.companyLogo = companyLogo;
    if (companyType) company.companyType = companyType;
    if (openForInvestments !== undefined) company.openForInvestments = openForInvestments;
    if (businessModel) company.businessModel = businessModel;
    if (companySector) company.companySector = companySector;
    if (companySize) company.companySize = companySize;
    if (companyEmail) company.companyEmail = companyEmail;
    if (companyPhone) company.companyPhone = companyPhone;
    if (companyInfo) company.companyInfo = companyInfo;
    if (detailedDescription) company.detailedDescription = detailedDescription;
    if (companyWebsite) company.companyWebsite = companyWebsite;
    if (companyAddress) company.companyAddress = companyAddress;
    if (companyLinkedIn) company.companyLinkedIn = companyLinkedIn;
    if (companyTwitter) company.companyTwitter = companyTwitter;

    await company.save();

    const companyResponse: CompanyResponse = {
      id: company._id,
      companyName: company.companyName,
      companyLogo: company.companyLogo,
      companyType: company.companyType,
      openForInvestments: company.openForInvestments,
      businessModel: company.businessModel,
      companySector: company.companySector,
      companySize: company.companySize,
      companyEmail: company.companyEmail,
      companyPhone: company.companyPhone,
      companyInfo: company.companyInfo,
      detailedDescription: company.detailedDescription,
      companyWebsite: company.companyWebsite,
      companyAddress: company.companyAddress,
      companyLinkedIn: company.companyLinkedIn,
      companyTwitter: company.companyTwitter,
      user: company.user.toString(),
      createdAt: company.createdAt,
    };

    res.status(200).json({ success: true, company: companyResponse });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
  }
};


// Şirket silme
export const deleteCompany = async (req: Request, res: Response) => {
  try {
    // Token doğrulaması
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ success: false, message: 'Yetkilendirme başarısız, token bulunamadı' });
    }
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded.id;

    const { id } = req.params;
    const company = await Company.findById(id);
    if (!company) {
      return res.status(404).json({ success: false, message: 'Şirket bulunamadı' });
    }
    if (company.user.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'Bu şirket üzerinde yetkiniz yok' });
    }

    await company.remove();
    res.status(200).json({ success: true, message: 'Şirket başarıyla silindi' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Sunucu hatası', error: err.message });
  }
};
