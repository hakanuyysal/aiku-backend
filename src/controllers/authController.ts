import { Request, Response } from "express";
import { validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { IUser, User } from "../models/User";
import { UserResponse } from '../types/UserResponse';

interface UserResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  title?: string;
  location?: string;
  profileInfo?: string;
  profilePhoto?: string;
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
}

const createToken = (id: string): string => {
  return jwt.sign({ id }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

export const register = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { firstName, lastName, email, password } = req.body;

    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        message: "Bu email adresi zaten kayıtlı",
      });
    }

    user = await User.create({
      firstName,
      lastName,
      email,
      password,
      authProvider: "email",
    });

    const token = createToken(user._id);

    const userResponse: UserResponse = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    };

    res.status(201).json({
      success: true,
      token,
      user: userResponse,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Sunucu hatası",
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Geçersiz email veya şifre",
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Geçersiz email veya şifre",
      });
    }

    user.authProvider = "email";
    await user.save();

    const token = createToken(user._id);

    const userResponse: UserResponse = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    };

    res.status(200).json({
      success: true,
      token,
      user: userResponse,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Sunucu hatası",
    });
  }
};

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Yetkilendirme başarısız, token bulunamadı",
      });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Kullanıcı bulunamadı" });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        title: user.title,
        location: user.location,
        profileInfo: user.profileInfo,
        profilePhoto: user.profilePhoto,
        linkedin: user.linkedin,
        instagram: user.instagram,
        facebook: user.facebook,
        twitter: user.twitter,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Sunucu hatası", error: err.message });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Yetkilendirme başarısız, token bulunamadı",
      });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    let user = await User.findById(decoded.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Kullanıcı bulunamadı" });
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      title,
      location,
      profileInfo,
      profilePhoto,
      linkedin,
      instagram,
      facebook,
      twitter,
      password,
    } = req.body;

    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (title) user.title = title;
    if (location) user.location = location;
    if (profileInfo) user.profileInfo = profileInfo;
    if (profilePhoto) user.profilePhoto = profilePhoto;
    if (linkedin) user.linkedin = linkedin;
    if (instagram) user.instagram = instagram;
    if (facebook) user.facebook = facebook;
    if (twitter) user.twitter = twitter;

    // **Şifre güncelleniyorsa hashle**
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();

    const updatedUserResponse: UserResponse = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      title: user.title,
      location: user.location,
      profileInfo: user.profileInfo,
      profilePhoto: user.profilePhoto,
      linkedin: user.linkedin,
      instagram: user.instagram,
      facebook: user.facebook,
      twitter: user.twitter,
    };

    res.status(200).json({ success: true, user: updatedUserResponse });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Sunucu hatası", error: err.message });
  }
};

export const getUserById = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Kullanıcı bulunamadı" });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        title: user.title,
        location: user.location,
        profileInfo: user.profileInfo,
        profilePhoto: user.profilePhoto,
        linkedin: user.linkedin,
        instagram: user.instagram,
        facebook: user.facebook,
        twitter: user.twitter,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    res
      .status(500)
      .json({ success: false, message: "Sunucu hatası", error: err.message });
  }
};

export const addFavorite = async (req: Request, res: Response) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Yetkilendirme başarısız, token bulunamadı",
      });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    let user = await User.findById(decoded.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Kullanıcı bulunamadı" });
    }

    const { type, itemId } = req.body;
    if (!type || !itemId) {
      return res.status(400).json({
        success: false,
        message: "type ve itemId alanları gereklidir",
      });
    }

    if (type === "user") {
      if (user.favoriteUsers && user.favoriteUsers.includes(itemId)) {
        return res
          .status(400)
          .json({ success: false, message: "Kullanıcı zaten favorilerde" });
      }
      user.favoriteUsers = user.favoriteUsers || [];
      user.favoriteUsers.push(itemId);
    } else if (type === "company") {
      if (user.favoriteCompanies && user.favoriteCompanies.includes(itemId)) {
        return res
          .status(400)
          .json({ success: false, message: "Şirket zaten favorilerde" });
      }
      user.favoriteCompanies = user.favoriteCompanies || [];
      user.favoriteCompanies.push(itemId);
    } else if (type === "product") {
      if (user.favoriteProducts && user.favoriteProducts.includes(itemId)) {
        return res
          .status(400)
          .json({ success: false, message: "Ürün zaten favorilerde" });
      }
      user.favoriteProducts = user.favoriteProducts || [];
      user.favoriteProducts.push(itemId);
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Geçersiz favori türü" });
    }

    await user.save();
    res.status(200).json({ success: true, message: "Favorilere eklendi" });
  } catch (err: any) {
    res
      .status(500)
      .json({ success: false, message: "Sunucu hatası", error: err.message });
  }
};

export const removeFavorite = async (req: Request, res: Response) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Yetkilendirme başarısız, token bulunamadı",
      });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    let user = await User.findById(decoded.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Kullanıcı bulunamadı" });
    }

    const { type, itemId } = req.body;
    if (!type || !itemId) {
      return res.status(400).json({
        success: false,
        message: "type ve itemId alanları gereklidir",
      });
    }
    if (type === "user") {
      user.favoriteUsers = user.favoriteUsers || [];
      user.favoriteUsers = user.favoriteUsers.filter(
        (fav) => fav.toString() !== itemId
      );
    } else if (type === "company") {
      user.favoriteCompanies = user.favoriteCompanies || [];
      user.favoriteCompanies = user.favoriteCompanies.filter(
        (fav) => fav.toString() !== itemId
      );
    } else if (type === "product") {
      user.favoriteProducts = user.favoriteProducts || [];
      user.favoriteProducts = user.favoriteProducts.filter(
        (fav) => fav.toString() !== itemId
      );
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Geçersiz favori türü" });
    }

    await user.save();
    res.status(200).json({ success: true, message: "Favoriden kaldırıldı" });
  } catch (err: any) {
    res
      .status(500)
      .json({ success: false, message: "Sunucu hatası", error: err.message });
  }
};

export const getFavorites = async (req: Request, res: Response) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Yetkilendirme başarısız, token bulunamadı",
      });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const user = await User.findById(decoded.id)
      .populate("favoriteUsers", "firstName lastName email")
      .populate("favoriteCompanies", "name description")
      .populate("favoriteProducts", "name price")
      .lean();
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Kullanıcı bulunamadı" });
    }

    user.favoriteUsers = (user.favoriteUsers || []).filter((fav) => fav);

    res.status(200).json({
      success: true,
      favorites: {
        favoriteUsers: user.favoriteUsers,
        favoriteCompanies: user.favoriteCompanies,
        favoriteProducts: user.favoriteProducts,
      },
    });
  } catch (err: any) {
    res
      .status(500)
      .json({ success: false, message: "Sunucu hatası", error: err.message });
  }
};

export const googleCallback = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Google ile giriş başarısız",
      });
    }

    const user = req.user as any;
    
    // JWT token oluştur
    const token = createToken(user._id);

    // Kullanıcı bilgilerini hazırla
    const userResponse: UserResponse = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    };

    // Başarılı yanıt
    const redirectUrl = `${process.env.CLIENT_URL}/auth/social-callback?token=${token}&firstName=${user.firstName}&lastName=${user.lastName}&email=${user.email}&id=${user._id}`;
    return res.redirect(redirectUrl);
  } catch (error) {
    return res.redirect(`${process.env.CLIENT_URL}/auth/login?error=google-login-failed`);
  }
};
