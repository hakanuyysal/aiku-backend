import { Request, Response } from "express";
import mongoose from "mongoose";
import BillingInfo, { IBillingInfo } from "../models/BillingInfo";

// Express request tipini genişletiyoruz
interface AuthRequest extends Request {
  user: {
    id: string;
    // Diğer kullanıcı alanları eklenebilir
  };
}

// @desc    Yeni fatura bilgisi oluştur
// @route   POST /api/billingInfo
// @access  Private
export const createBillingInfo = async (req: Request, res: Response) => {
  try {
    const {
      billingType,
      identityNumber,
      firstName,
      lastName,
      companyName,
      taxNumber,
      taxOffice,
      address,
      city,
      district,
      zipCode,
      phone,
      email,
      isDefault,
    } = req.body;

    // Temel doğrulamalar
    if (!billingType || !address || !city || !phone || !email) {
      res.status(400);
      throw new Error("Lütfen tüm zorunlu alanları doldurunuz");
    }

    // Bireysel fatura tipi için TC Kimlik No, ad ve soyad kontrolü
    if (billingType === "individual") {
      if (!identityNumber || !firstName || !lastName) {
        res.status(400);
        throw new Error(
          "Bireysel fatura için TC Kimlik No, ad ve soyad alanları zorunludur"
        );
      }

      // TC Kimlik No 11 haneli olmalı
      if (identityNumber.length !== 11) {
        res.status(400);
        throw new Error("TC Kimlik No 11 haneli olmalıdır");
      }
    }

    // Kurumsal fatura tipi için firma adı, vergi no ve vergi dairesi kontrolü
    if (billingType === "corporate") {
      if (!companyName || !taxNumber || !taxOffice) {
        res.status(400);
        throw new Error(
          "Kurumsal fatura için firma adı, vergi numarası ve vergi dairesi alanları zorunludur"
        );
      }
    }

    const userId = req.user.id;

    // İlk fatura bilgisi oluşturulduğunda otomatik olarak varsayılan yap
    const existingBillingInfos = await BillingInfo.countDocuments({
      user: userId,
    });
    const shouldBeDefault = isDefault || existingBillingInfos === 0;

    const billingInfo = await BillingInfo.create({
      user: userId,
      billingType,
      identityNumber: billingType === "individual" ? identityNumber : undefined,
      firstName: billingType === "individual" ? firstName : undefined,
      lastName: billingType === "individual" ? lastName : undefined,
      companyName: billingType === "corporate" ? companyName : undefined,
      taxNumber: billingType === "corporate" ? taxNumber : undefined,
      taxOffice: billingType === "corporate" ? taxOffice : undefined,
      address,
      city,
      district,
      zipCode,
      phone,
      email,
      isDefault: shouldBeDefault,
    });

    if (billingInfo) {
      res.status(201).json(billingInfo);
    } else {
      res.status(400);
      throw new Error("Fatura bilgisi oluşturulurken bir hata oluştu");
    }
  } catch (error: any) {
    res.status(res.statusCode >= 400 ? res.statusCode : 500);
    res.json({
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

// @desc    Kullanıcıya ait tüm fatura bilgilerini getir
// @route   GET /api/billingInfo
// @access  Private
export const getBillingInfos = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;

    const billingInfos = await BillingInfo.find({ user: userId });

    res.status(200).json(billingInfos);
  } catch (error: any) {
    res.status(res.statusCode >= 400 ? res.statusCode : 500);
    res.json({
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

// @desc    Belirli bir fatura bilgisini getir
// @route   GET /api/billingInfo/:id
// @access  Private
export const getBillingInfoById = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400);
      throw new Error("Geçersiz fatura bilgisi ID");
    }

    const billingInfo = await BillingInfo.findOne({
      _id: req.params.id,
      user: userId,
    });

    if (billingInfo) {
      res.status(200).json(billingInfo);
    } else {
      res.status(404);
      throw new Error("Fatura bilgisi bulunamadı");
    }
  } catch (error: any) {
    res.status(res.statusCode >= 400 ? res.statusCode : 500);
    res.json({
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

// @desc    Fatura bilgisini güncelle
// @route   PUT /api/billingInfo/:id
// @access  Private
export const updateBillingInfo = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400);
      throw new Error("Geçersiz fatura bilgisi ID");
    }

    const billingInfo = await BillingInfo.findOne({
      _id: req.params.id,
      user: userId,
    });

    if (!billingInfo) {
      res.status(404);
      throw new Error("Fatura bilgisi bulunamadı");
    }

    const {
      billingType,
      identityNumber,
      firstName,
      lastName,
      companyName,
      taxNumber,
      taxOffice,
      address,
      city,
      district,
      zipCode,
      phone,
      email,
      isDefault,
    } = req.body;

    // Temel doğrulamalar (güncellenecek alanlar için)
    if (billingType && billingType !== billingInfo.billingType) {
      // Fatura tipi değiştiriliyorsa ilgili alanların kontrolü
      if (
        billingType === "individual" &&
        (!identityNumber || !firstName || !lastName)
      ) {
        res.status(400);
        throw new Error(
          "Bireysel fatura için TC Kimlik No, ad ve soyad alanları zorunludur"
        );
      }

      if (
        billingType === "corporate" &&
        (!companyName || !taxNumber || !taxOffice)
      ) {
        res.status(400);
        throw new Error(
          "Kurumsal fatura için firma adı, vergi numarası ve vergi dairesi alanları zorunludur"
        );
      }
    }

    // TC Kimlik No kontrolü
    if (
      identityNumber &&
      identityNumber.length !== 11 &&
      (billingType === "individual" || billingInfo.billingType === "individual")
    ) {
      res.status(400);
      throw new Error("TC Kimlik No 11 haneli olmalıdır");
    }

    // Belirtilen alanları güncelle (sadece sağlanan alanlar)
    if (billingType) billingInfo.billingType = billingType;

    // Bireysel fatura bilgileri
    if (identityNumber) billingInfo.identityNumber = identityNumber;
    if (firstName) billingInfo.firstName = firstName;
    if (lastName) billingInfo.lastName = lastName;

    // Kurumsal fatura bilgileri
    if (companyName) billingInfo.companyName = companyName;
    if (taxNumber) billingInfo.taxNumber = taxNumber;
    if (taxOffice) billingInfo.taxOffice = taxOffice;

    // Ortak fatura bilgileri
    if (address) billingInfo.address = address;
    if (city) billingInfo.city = city;
    if (district !== undefined) billingInfo.district = district;
    if (zipCode !== undefined) billingInfo.zipCode = zipCode;
    if (phone) billingInfo.phone = phone;
    if (email) billingInfo.email = email;

    // Varsayılan fatura durumu
    if (isDefault !== undefined) billingInfo.isDefault = isDefault;

    const updatedBillingInfo = await billingInfo.save();

    res.status(200).json(updatedBillingInfo);
  } catch (error: any) {
    res.status(res.statusCode >= 400 ? res.statusCode : 500);
    res.json({
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

// @desc    Fatura bilgisini sil
// @route   DELETE /api/billingInfo/:id
// @access  Private
export const deleteBillingInfo = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400);
      throw new Error("Geçersiz fatura bilgisi ID");
    }

    const billingInfo = await BillingInfo.findOne({
      _id: req.params.id,
      user: userId,
    });

    if (!billingInfo) {
      res.status(404);
      throw new Error("Fatura bilgisi bulunamadı");
    }

    // Varsayılan fatura bilgisi siliniyor mu kontrol et
    if (billingInfo.isDefault) {
      // Başka fatura bilgisi var mı kontrol et
      const otherBillingInfos = await BillingInfo.find({
        user: userId,
        _id: { $ne: req.params.id },
      });

      if (otherBillingInfos.length > 0) {
        // Diğer fatura bilgilerinden ilkini varsayılan yap
        otherBillingInfos[0].isDefault = true;
        await otherBillingInfos[0].save();
      }
    }

    await billingInfo.deleteOne();

    res.status(200).json({ message: "Fatura bilgisi başarıyla silindi" });
  } catch (error: any) {
    res.status(res.statusCode >= 400 ? res.statusCode : 500);
    res.json({
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

// @desc    Varsayılan fatura bilgisini getir
// @route   GET /api/billingInfo/default
// @access  Private
export const getDefaultBillingInfo = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;

    const defaultBillingInfo = await BillingInfo.findOne({
      user: userId,
      isDefault: true,
    });

    if (defaultBillingInfo) {
      res.status(200).json(defaultBillingInfo);
    } else {
      res.status(404);
      throw new Error("Varsayılan fatura bilgisi bulunamadı");
    }
  } catch (error: any) {
    res.status(res.statusCode >= 400 ? res.statusCode : 500);
    res.json({
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};

// @desc    Belirli bir fatura bilgisini varsayılan yap
// @route   PUT /api/billingInfo/:id/set-default
// @access  Private
export const setDefaultBillingInfo = async (req: Request, res: Response) => {
  try {
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400);
      throw new Error("Geçersiz fatura bilgisi ID");
    }

    // Öncelikle kullanıcının bu fatura bilgisine sahip olup olmadığını kontrol et
    const billingInfo = await BillingInfo.findOne({
      _id: req.params.id,
      user: userId,
    });

    if (!billingInfo) {
      res.status(404);
      throw new Error("Fatura bilgisi bulunamadı");
    }

    // Zaten varsayılan olarak ayarlanmışsa bildirme
    if (billingInfo.isDefault) {
      return res.status(200).json({
        message: "Bu fatura bilgisi zaten varsayılan olarak ayarlanmış",
      });
    }

    // Bu fatura bilgisini varsayılan yap
    billingInfo.isDefault = true;
    await billingInfo.save(); // Save trigger'ı diğer varsayılanları false yapar

    res.status(200).json({
      message: "Fatura bilgisi varsayılan olarak ayarlandı",
      billingInfo,
    });
  } catch (error: any) {
    res.status(res.statusCode >= 400 ? res.statusCode : 500);
    res.json({
      message: error.message,
      stack: process.env.NODE_ENV === "production" ? null : error.stack,
    });
  }
};
