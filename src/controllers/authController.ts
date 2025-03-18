import { Request, Response } from "express";
import { validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { IUser, User } from "../models/User";
import { UserResponse } from "../types/UserResponse";
import { authService } from "../services/authService";

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

    const {
      firstName,
      lastName,
      email,
      password,
      phone,
      title,
      location,
      profileInfo,
      profilePhoto,
      linkedin,
      instagram,
      facebook,
      twitter,
    } = req.body;

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
      phone,
      title,
      location,
      profileInfo,
      profilePhoto,
      linkedin,
      instagram,
      facebook,
      twitter,
      authProvider: "email",
    });

    const token = createToken(user._id);

    const hasActiveSubscription =
      user.subscriptionStatus === "active" ||
      user.subscriptionStatus === "trial";

    const userResponse: UserResponse = {
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
      emailVerified: user.emailVerified,
      locale: user.locale,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionStartDate: user.subscriptionStartDate,
      trialEndsAt: user.trialEndsAt,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionPeriod: user.subscriptionPeriod,
      subscriptionAmount: user.subscriptionAmount,
      autoRenewal: user.autoRenewal,
      paymentMethod: user.paymentMethod,
      savedCardId: user.savedCardId ? user.savedCardId.toString() : undefined,
      lastPaymentDate: user.lastPaymentDate,
      nextPaymentDate: user.nextPaymentDate,
      billingAddress: user.billingAddress,
      vatNumber: user.vatNumber,
      isSubscriptionActive: hasActiveSubscription,
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

    const hasActiveSubscription =
      user.subscriptionStatus === "active" ||
      user.subscriptionStatus === "trial";

    const userResponse: UserResponse = {
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
      emailVerified: user.emailVerified,
      locale: user.locale,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionStartDate: user.subscriptionStartDate,
      trialEndsAt: user.trialEndsAt,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionPeriod: user.subscriptionPeriod,
      subscriptionAmount: user.subscriptionAmount,
      autoRenewal: user.autoRenewal,
      paymentMethod: user.paymentMethod,
      savedCardId: user.savedCardId ? user.savedCardId.toString() : undefined,
      lastPaymentDate: user.lastPaymentDate,
      nextPaymentDate: user.nextPaymentDate,
      billingAddress: user.billingAddress,
      vatNumber: user.vatNumber,
      isSubscriptionActive: hasActiveSubscription,
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
    // @ts-expect-error - req.user tipini IUser olarak kabul ediyoruz
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Oturum açmanız gerekiyor",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı",
      });
    }

    // Kullanıcı aktif bir aboneliğe sahip mi?
    const hasActiveSubscription =
      user.subscriptionStatus === "active" ||
      user.subscriptionStatus === "trial";

    // Debug bilgileri
    const subscriptionDebug = {
      statusValue: user.subscriptionStatus,
      statusType: typeof user.subscriptionStatus,
      statusLength: user.subscriptionStatus
        ? user.subscriptionStatus.length
        : 0,
      statusCharCodes: user.subscriptionStatus
        ? Array.from(user.subscriptionStatus).map((c) => c.charCodeAt(0))
        : [],
      trimmedStatus: user.subscriptionStatus
        ? user.subscriptionStatus.trim()
        : "",
      isEqualActive: user.subscriptionStatus === "active",
      isEqualTrial: user.subscriptionStatus === "trial",
      manualCalculation: hasActiveSubscription,
    };

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
        emailVerified: user.emailVerified,
        locale: user.locale,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionStartDate: user.subscriptionStartDate,
        trialEndsAt: user.trialEndsAt,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionPeriod: user.subscriptionPeriod,
        subscriptionAmount: user.subscriptionAmount,
        autoRenewal: user.autoRenewal,
        paymentMethod: user.paymentMethod,
        savedCardId: user.savedCardId ? user.savedCardId.toString() : undefined,
        lastPaymentDate: user.lastPaymentDate,
        nextPaymentDate: user.nextPaymentDate,
        billingAddress: user.billingAddress,
        vatNumber: user.vatNumber,
        isSubscriptionActive: hasActiveSubscription,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: "Kullanıcı bilgileri alınırken bir hata oluştu",
    });
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
    const user = await User.findById(decoded.id);
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

    // Şifre güncelleniyorsa hashle
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();

    const hasActiveSubscription =
      user.subscriptionStatus === "active" ||
      user.subscriptionStatus === "trial";

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
      emailVerified: user.emailVerified,
      locale: user.locale,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionStartDate: user.subscriptionStartDate,
      trialEndsAt: user.trialEndsAt,
      subscriptionPlan: user.subscriptionPlan,
      subscriptionPeriod: user.subscriptionPeriod,
      subscriptionAmount: user.subscriptionAmount,
      autoRenewal: user.autoRenewal,
      paymentMethod: user.paymentMethod,
      savedCardId: user.savedCardId ? user.savedCardId.toString() : undefined,
      lastPaymentDate: user.lastPaymentDate,
      nextPaymentDate: user.nextPaymentDate,
      billingAddress: user.billingAddress,
      vatNumber: user.vatNumber,
      isSubscriptionActive: hasActiveSubscription,
    };

    res.status(200).json({ success: true, user: updatedUserResponse });
  } catch (err: any) {
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

    const hasActiveSubscription =
      user.subscriptionStatus === "active" ||
      user.subscriptionStatus === "trial";

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
        emailVerified: user.emailVerified,
        locale: user.locale,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionStartDate: user.subscriptionStartDate,
        trialEndsAt: user.trialEndsAt,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionPeriod: user.subscriptionPeriod,
        subscriptionAmount: user.subscriptionAmount,
        autoRenewal: user.autoRenewal,
        paymentMethod: user.paymentMethod,
        savedCardId: user.savedCardId ? user.savedCardId.toString() : undefined,
        lastPaymentDate: user.lastPaymentDate,
        nextPaymentDate: user.nextPaymentDate,
        billingAddress: user.billingAddress,
        vatNumber: user.vatNumber,
        isSubscriptionActive: hasActiveSubscription,
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
    const user = await User.findById(decoded.id);
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
    const user = await User.findById(decoded.id);
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
    console.log('[GoogleCallback] Callback başladı');
    
    if (!req.user) {
      console.error('[GoogleCallback] Kullanıcı bulunamadı');
      return res.redirect(`${process.env.CLIENT_URL}/auth/login?error=google-user-not-found`);
    }
    
    console.log('[GoogleCallback] Kullanıcı bilgileri alındı:', { 
      userId: (req.user as IUser)._id,
      email: (req.user as IUser).email 
    });
    
    // JWT token oluştur
    const token = createToken((req.user as IUser)._id);
    console.log('[GoogleCallback] JWT token oluşturuldu');
    
    // Frontend'e yönlendir
    const user = req.user as IUser;
    const hasActiveSubscription = user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trial';
    
    const redirectUrl = encodeURIComponent(
      JSON.stringify({
        token,
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          profilePhoto: user.profilePhoto,
          isSubscriptionActive: hasActiveSubscription
        }
      })
    );
    
    console.log('[GoogleCallback] Frontend\'e yönlendirme:', `${process.env.CLIENT_URL}/auth/social-callback?data=${redirectUrl}`);
    return res.redirect(`${process.env.CLIENT_URL}/auth/social-callback?data=${redirectUrl}`);
  } catch (error) {
    console.error('[GoogleCallback] Hata:', error);
    return res.redirect(`${process.env.CLIENT_URL}/auth/login?error=google-callback-failed`);
  }
};

export const fixSubscription = async (req: Request, res: Response) => {
  try {
    // @ts-expect-error - req.user tipini IUser olarak kabul ediyoruz
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Oturum açmanız gerekiyor",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı",
      });
    }

    // Abonelik durumunu kontrol et
    const hasActiveSubscription =
      user.subscriptionStatus === "active" ||
      user.subscriptionStatus === "trial";

    let updated = false;

    // Eğer paymentHistory içerisinde başarılı ödeme varsa ve status active değilse
    if (
      user.paymentHistory &&
      user.paymentHistory.length > 0 &&
      user.paymentHistory.some((p) => p.status === "success")
    ) {
      if (!hasActiveSubscription) {
        user.subscriptionStatus = "active";
        updated = true;
      }

      // isSubscriptionActive değeri false ise düzelt
      if (!user.isSubscriptionActive) {
        user.isSubscriptionActive = true;
        updated = true;
      }

      // Güncellemeler varsa kaydet
      if (updated) {
        await user.save();
        console.log("Kullanıcı abonelik durumu güncellendi:", {
          userId: user._id,
          status: user.subscriptionStatus,
          isActive: user.isSubscriptionActive,
        });
      }
    }

    // Tüm kullanıcı verilerini getirerek durumu kontrol et
    const refreshedUser = await User.findById(userId);

    // Son başarılı ödeme tarihini ve kullanıcı bilgilerini getir
    const lastSuccessfulPayment = refreshedUser?.paymentHistory?.find(
      (p) => p.status === "success"
    );

    res.status(200).json({
      success: true,
      updated,
      data: {
        userId: refreshedUser?._id,
        subscriptionStatus: refreshedUser?.subscriptionStatus,
        isSubscriptionActive: refreshedUser?.isSubscriptionActive,
        manualCheck:
          refreshedUser?.subscriptionStatus === "active" ||
          refreshedUser?.subscriptionStatus === "trial",
        subscriptionStartDate: refreshedUser?.subscriptionStartDate,
        lastPaymentDate: refreshedUser?.lastPaymentDate,
        lastSuccessfulPayment,
        debug: {
          subscriptionStatusType: typeof refreshedUser?.subscriptionStatus,
          subscriptionStatusLength: refreshedUser?.subscriptionStatus
            ? refreshedUser.subscriptionStatus.length
            : 0,
          statusRaw: refreshedUser?.subscriptionStatus,
          statusTrimmed: refreshedUser?.subscriptionStatus
            ? refreshedUser.subscriptionStatus.trim()
            : "",
          statusCharCodes: refreshedUser?.subscriptionStatus
            ? Array.from(refreshedUser.subscriptionStatus).map((c) =>
                c.charCodeAt(0)
              )
            : [],
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Abonelik durumu kontrol edilirken bir hata oluştu",
      error: error.message,
    });
  }
};

export const createOrUpdateSubscription = async (
  req: Request,
  res: Response
) => {
  try {
    // @ts-expect-error - req.user tipini IUser olarak kabul ediyoruz
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Oturum açmanız gerekiyor",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı",
      });
    }

    const { plan, period, paymentMethod, cardId } = req.body;

    if (!plan || !period || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Plan, dönem ve ödeme yöntemi gereklidir",
      });
    }

    // Ödeme yöntemi kredi kartı ise ve kart id yoksa hata ver
    if (paymentMethod === "creditCard" && !cardId) {
      return res.status(400).json({
        success: false,
        message: "Kredi kartı ödemesi için kart bilgisi gereklidir",
      });
    }

    // Plan tipini kontrol et
    if (!["startup", "business", "investor"].includes(plan)) {
      return res.status(400).json({
        success: false,
        message: "Geçersiz plan türü",
      });
    }

    // Dönem tipini kontrol et
    if (!["monthly", "yearly"].includes(period)) {
      return res.status(400).json({
        success: false,
        message: "Geçersiz dönem türü",
      });
    }

    // İlk abonelik mi kontrol et
    const isFirstSubscription =
      !user.subscriptionStatus ||
      user.subscriptionStatus === "expired" ||
      user.subscriptionStatus === "cancelled";

    const now = new Date();
    let nextPaymentDate;

    // Startup planı ve ilk abonelik ise 3 aylık deneme süresi ver
    if (isFirstSubscription && plan === "startup") {
      // 3 aylık trial süresi
      const trialEndDate = new Date(now);
      trialEndDate.setMonth(trialEndDate.getMonth() + 3);

      user.subscriptionStatus = "trial";
      user.trialEndsAt = trialEndDate;
      user.subscriptionStartDate = now;
      user.nextPaymentDate = trialEndDate;
      user.isSubscriptionActive = true;

      nextPaymentDate = trialEndDate;
    } else {
      // Normal ücretli abonelik
      user.subscriptionStatus = "active";
      user.subscriptionStartDate = now;
      user.isSubscriptionActive = true;

      // Dönem sonunu hesapla
      if (period === "monthly") {
        nextPaymentDate = new Date(now);
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
      } else {
        // yearly
        nextPaymentDate = new Date(now);
        nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
      }

      user.nextPaymentDate = nextPaymentDate;
      user.lastPaymentDate = now;
    }

    // Abonelik bilgilerini güncelle
    user.subscriptionPlan = plan;
    user.subscriptionPeriod = period;
    user.paymentMethod = paymentMethod;
    user.autoRenewal = true;

    // Kart bilgisini kaydet
    if (paymentMethod === "creditCard" && cardId) {
      user.savedCardId = cardId;
    }

    // Plana göre fiyatı belirle
    let amount = 0;
    if (plan === "startup") {
      amount = period === "monthly" ? 99 : 990;
    } else if (plan === "business") {
      amount = period === "monthly" ? 199 : 1990;
    } else if (plan === "investor") {
      amount = period === "monthly" ? 299 : 2990;
    }

    user.subscriptionAmount = amount;

    // Deneme süreci değilse, ödeme kaydı ekle
    if (user.subscriptionStatus !== "trial") {
      // Ödeme kaydı oluştur
      if (!user.paymentHistory) {
        user.paymentHistory = [];
      }

      user.paymentHistory.push({
        amount,
        date: now,
        status: "success",
        type: "subscription",
        plan,
        period,
      });
    }

    await user.save();

    // Yanıt döndür
    const hasActiveSubscription =
      user.subscriptionStatus === "active" ||
      user.subscriptionStatus === "trial";

    res.status(200).json({
      success: true,
      subscription: {
        status: user.subscriptionStatus,
        plan: user.subscriptionPlan,
        period: user.subscriptionPeriod,
        startDate: user.subscriptionStartDate,
        amount: user.subscriptionAmount,
        nextPaymentDate: user.nextPaymentDate,
        isActive: hasActiveSubscription,
        trialEndsAt: user.trialEndsAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: "Abonelik işlemi sırasında bir hata oluştu",
      error: err.message,
    });
  }
};

// Trial abonelikler için kontrol ve otomatik ödeme yenileme - bu genellikle bir cronjob olarak çalışır
// Bu kod örnek olup, gerçek uygulamada bir cronjob servisi tarafından günlük olarak çağrılmalıdır
export const checkAndRenewTrialSubscriptions = async (
  req: Request,
  res: Response
) => {
  try {
    // Sadece admin kullanıcısına izin ver
    // @ts-expect-error - req.user tipini IUser olarak kabul ediyoruz
    const userId = req.user?._id;
    const user = await User.findById(userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Bu işlem için yetkiniz bulunmamaktadır",
      });
    }

    const now = new Date();

    // Deneme süresi bugün biten ve otomatik yenileme açık olan kullanıcıları bul
    const usersWithEndingTrial = await User.find({
      subscriptionStatus: "trial",
      trialEndsAt: { $lte: now },
      autoRenewal: true,
      savedCardId: { $exists: true, $ne: null },
    });

    let processed = 0;
    let failed = 0;

    // Her bir kullanıcı için
    for (const trialUser of usersWithEndingTrial) {
      try {
        // Gerçek uygulamada burada bir ödeme servisi ile entegrasyon olmalı
        // Örnek: const paymentResult = await paymentService.chargeCard(trialUser.savedCardId, trialUser.subscriptionAmount);

        // Ödeme başarılı kabul edelim (gerçek uygulamada ödeme API yanıtına göre belirlenecek)
        const paymentSuccess = true;

        if (paymentSuccess) {
          // Aboneliği aktif hale getir
          trialUser.subscriptionStatus = "active";
          trialUser.isSubscriptionActive = true;
          trialUser.lastPaymentDate = now;

          // Bir sonraki ödeme tarihini hesapla
          let nextPaymentDate;
          if (trialUser.subscriptionPeriod === "monthly") {
            nextPaymentDate = new Date(now);
            nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
          } else {
            // yearly
            nextPaymentDate = new Date(now);
            nextPaymentDate.setFullYear(nextPaymentDate.getFullYear() + 1);
          }

          trialUser.nextPaymentDate = nextPaymentDate;

          // Ödeme geçmişine ekle
          if (!trialUser.paymentHistory) {
            trialUser.paymentHistory = [];
          }

          trialUser.paymentHistory.push({
            amount: trialUser.subscriptionAmount || 0,
            date: now,
            status: "success",
            type: "subscription",
            plan: trialUser.subscriptionPlan,
            period: trialUser.subscriptionPeriod,
          });

          await trialUser.save();
          processed++;
        } else {
          // Ödeme başarısız olursa aboneliği süresi dolmuş olarak işaretle
          trialUser.subscriptionStatus = "expired";
          trialUser.isSubscriptionActive = false;

          if (!trialUser.paymentHistory) {
            trialUser.paymentHistory = [];
          }

          // Başarısız ödeme kaydı
          trialUser.paymentHistory.push({
            amount: trialUser.subscriptionAmount || 0,
            date: now,
            status: "failed",
            type: "subscription",
            plan: trialUser.subscriptionPlan,
            period: trialUser.subscriptionPeriod,
          });

          await trialUser.save();
          failed++;
        }
      } catch (error) {
        console.error(`Trial renewal failed for user ${trialUser._id}:`, error);
        failed++;
      }
    }

    res.status(200).json({
      success: true,
      message: `İşlem tamamlandı: ${processed} kullanıcı başarıyla yenilendi, ${failed} kullanıcı için işlem başarısız oldu.`,
      processed,
      failed,
      total: usersWithEndingTrial.length,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: "Trial abonelik kontrolü sırasında bir hata oluştu",
      error: err.message,
    });
  }
};

/**
 * Google token ile giriş yapar ve JWT token döndürür
 * @param req Express request
 * @param res Express response
 */
export const googleLogin = async (req: Request, res: Response) => {
  console.log('[GoogleLogin] Giriş işlemi başlatıldı', { ip: req.ip, userAgent: req.headers['user-agent'] });
  
  try {
    console.log('[GoogleLogin] Request body:', JSON.stringify(req.body));
    console.log('[GoogleLogin] Request headers:', JSON.stringify(req.headers));
    
    // idToken veya accessToken parametresini kontrol et
    const { idToken, accessToken } = req.body;
    const tokenToUse = idToken || accessToken;

    if (!tokenToUse) {
      console.log('[GoogleLogin] Token bulunamadı, request headers:', JSON.stringify(req.headers));
      console.log('[GoogleLogin] Request body tam içerik:', JSON.stringify(req.body, null, 2));
      console.log('[GoogleLogin] Tüm istek bilgileri:', {
        method: req.method,
        path: req.path,
        params: req.params,
        query: req.query,
        cookies: req.cookies
      });
      
      return res.status(400).json({
        success: false,
        error: 'Google ID token veya Access token gerekli'
      });
    }

    // Token'ın ilk ve son birkaç karakterini göster (güvenlik için)
    console.log(`[GoogleLogin] Token: ${tokenToUse.substring(0, 10)}...${tokenToUse.substring(tokenToUse.length - 10)}`);
    console.log(`[GoogleLogin] Token uzunluğu: ${tokenToUse.length} karakter`);
    console.log('[GoogleLogin] Token doğrulanıyor');
    
    // Eğer accessToken ise Google API ile kullanıcı bilgilerini al
    if (accessToken && !idToken) {
      try {
        console.log('[GoogleLogin] Access token kullanılıyor, Google People API ile kullanıcı bilgileri alınıyor');
        
        // Axios ile Google'dan kullanıcı bilgilerini al
        const axios = require('axios');
        const googleUserInfo = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        
        if (googleUserInfo.data) {
          const { sub, email, name, picture, email_verified } = googleUserInfo.data;
          
          if (!email) {
            console.error('[GoogleLogin] Email adresi bulunamadı');
            return res.status(400).json({
              success: false,
              error: 'Google hesabınızdan email adresi alınamadı'
            });
          }
          
          console.log('[GoogleLogin] Kullanıcı bilgileri alındı:', { 
            sub, 
            email,
            name: name || 'N/A'
          });
          
          console.log('[GoogleLogin] Kullanıcı veritabanında aranıyor:', { email });
          // Kullanıcı veritabanında var mı kontrol et
          let user = await User.findOne({ email });
          
          // Kullanıcı yoksa oluştur
          if (!user) {
            console.log('[GoogleLogin] Kullanıcı bulunamadı, yeni kullanıcı oluşturuluyor');
            // İsmi parçalara ayır (varsa)
            let firstName = '';
            let lastName = '';
            
            if (name) {
              if (name.includes(' ')) {
                const nameParts = name.split(' ');
                firstName = nameParts[0];
                lastName = nameParts.slice(1).join(' ');
              } else {
                // Eğer isimde boşluk yoksa, ismi hem firstName hem de lastName olarak kullan
                firstName = name;
                lastName = name; // Veya "." ya da başka bir varsayılan değer atanabilir
                console.log('[GoogleLogin] Tek parçalı isim, aynı değer firstName ve lastName için kullanılıyor');
              }
            } else {
              // Ad yoksa, email'i hem isim hem soyisim olarak kullan
              firstName = email.split('@')[0];
              lastName = email.split('@')[0];
              console.log('[GoogleLogin] İsim bulunamadı, email adı kullanılıyor');
            }
            
            user = await User.create({
              firstName,
              lastName,
              email,
              profilePhoto: picture,
              emailVerified: true,
              authProvider: "google",
              googleId: sub
            });
            console.log('[GoogleLogin] Yeni kullanıcı oluşturuldu:', { userId: user._id, email });
          } else {
            console.log('[GoogleLogin] Mevcut kullanıcı bulundu:', { userId: user._id, email });
            // Kullanıcı varsa Google ile giriş yaptığını güncelle
            user.authProvider = "google";
            user.googleId = sub;
            if (picture && !user.profilePhoto) {
              user.profilePhoto = picture;
            }
            await user.save();
            console.log('[GoogleLogin] Kullanıcı bilgileri güncellendi');
          }
          
          // JWT token oluştur
          console.log('[GoogleLogin] JWT token oluşturuluyor');
          const token = createToken(user._id);
          console.log('[GoogleLogin] JWT token oluşturuldu');
          
          const hasActiveSubscription = user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trial';
          console.log('[GoogleLogin] Abonelik durumu:', { 
            subscriptionStatus: user.subscriptionStatus, 
            isActive: hasActiveSubscription 
          });
          
          const userResponse: UserResponse = {
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
            emailVerified: user.emailVerified,
            locale: user.locale,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            subscriptionStatus: user.subscriptionStatus,
            subscriptionStartDate: user.subscriptionStartDate,
            trialEndsAt: user.trialEndsAt,
            subscriptionPlan: user.subscriptionPlan,
            subscriptionPeriod: user.subscriptionPeriod,
            subscriptionAmount: user.subscriptionAmount,
            autoRenewal: user.autoRenewal,
            paymentMethod: user.paymentMethod,
            savedCardId: user.savedCardId ? user.savedCardId.toString() : undefined,
            lastPaymentDate: user.lastPaymentDate,
            nextPaymentDate: user.nextPaymentDate,
            billingAddress: user.billingAddress,
            vatNumber: user.vatNumber,
            isSubscriptionActive: hasActiveSubscription,
          };
          
          console.log('[GoogleLogin] Başarılı giriş, yanıt gönderiliyor', { userId: user._id });
          return res.status(200).json({
            success: true,
            token,
            user: userResponse,
          });
        }
      } catch (accessTokenError) {
        console.error('[GoogleLogin] Access token ile bilgi alma hatası:', accessTokenError);
        return res.status(401).json({
          success: false, 
          error: 'Google access token doğrulama hatası',
          details: process.env.NODE_ENV === 'development' ? accessTokenError.message : 'Kimlik doğrulama başarısız'
        });
      }
    }
    
    // ID Token ile kimlik doğrulama (mevcut kod)
    try {
      const decodedToken = await authService.verifyIdToken(tokenToUse);
      console.log('[GoogleLogin] Token doğrulandı:', { 
        uid: decodedToken.uid, 
        email: decodedToken.email,
        name: decodedToken.name || 'N/A', 
        picture: decodedToken.picture ? 'Var' : 'Yok',
        emailVerified: decodedToken.email_verified || false
      });
      
      // Kullanıcı bilgilerini al
      const { uid, email, name, picture } = decodedToken;
      
      if (!email) {
        console.error('[GoogleLogin] Email adresi bulunamadı');
        return res.status(400).json({
          success: false,
          error: 'Google hesabınızdan email adresi alınamadı'
        });
      }
      
      console.log('[GoogleLogin] Kullanıcı veritabanında aranıyor:', { email });
      // Kullanıcı veritabanında var mı kontrol et
      let user = await User.findOne({ email });
      
      // Kullanıcı yoksa oluştur
      if (!user) {
        console.log('[GoogleLogin] Kullanıcı bulunamadı, yeni kullanıcı oluşturuluyor');
        // İsmi parçalara ayır (varsa)
        let firstName = '';
        let lastName = '';
        
        if (name) {
          if (name.includes(' ')) {
            const nameParts = name.split(' ');
            firstName = nameParts[0];
            lastName = nameParts.slice(1).join(' ');
          } else {
            // Eğer isimde boşluk yoksa, ismi hem firstName hem de lastName olarak kullan
            firstName = name;
            lastName = name; // Veya "." ya da başka bir varsayılan değer atanabilir
            console.log('[GoogleLogin] Tek parçalı isim, aynı değer firstName ve lastName için kullanılıyor');
          }
        } else {
          // Ad yoksa, email'i hem isim hem soyisim olarak kullan
          firstName = email.split('@')[0];
          lastName = email.split('@')[0];
          console.log('[GoogleLogin] İsim bulunamadı, email adı kullanılıyor');
        }
        
        user = await User.create({
          firstName,
          lastName,
          email,
          profilePhoto: picture,
          emailVerified: true,
          authProvider: "google",
          googleId: uid
        });
        console.log('[GoogleLogin] Yeni kullanıcı oluşturuldu:', { userId: user._id, email });
      } else {
        console.log('[GoogleLogin] Mevcut kullanıcı bulundu:', { userId: user._id, email });
        // Kullanıcı varsa Google ile giriş yaptığını güncelle
        user.authProvider = "google";
        user.googleId = uid;
        if (picture && !user.profilePhoto) {
          user.profilePhoto = picture;
        }
        await user.save();
        console.log('[GoogleLogin] Kullanıcı bilgileri güncellendi');
      }
      
      // JWT token oluştur
      console.log('[GoogleLogin] JWT token oluşturuluyor');
      const token = createToken(user._id);
      console.log('[GoogleLogin] JWT token oluşturuldu');
      
      const hasActiveSubscription = user.subscriptionStatus === 'active' || user.subscriptionStatus === 'trial';
      console.log('[GoogleLogin] Abonelik durumu:', { 
        subscriptionStatus: user.subscriptionStatus, 
        isActive: hasActiveSubscription 
      });

      const userResponse: UserResponse = {
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
        emailVerified: user.emailVerified,
        locale: user.locale,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionStartDate: user.subscriptionStartDate,
        trialEndsAt: user.trialEndsAt,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionPeriod: user.subscriptionPeriod,
        subscriptionAmount: user.subscriptionAmount,
        autoRenewal: user.autoRenewal,
        paymentMethod: user.paymentMethod,
        savedCardId: user.savedCardId ? user.savedCardId.toString() : undefined,
        lastPaymentDate: user.lastPaymentDate,
        nextPaymentDate: user.nextPaymentDate,
        billingAddress: user.billingAddress,
        vatNumber: user.vatNumber,
        isSubscriptionActive: hasActiveSubscription,
      };
      
      console.log('[GoogleLogin] Başarılı giriş, yanıt gönderiliyor', { userId: user._id });
      res.status(200).json({
        success: true,
        token,
        user: userResponse,
      });
    } catch (tokenError: any) {
      console.error('[GoogleLogin] Token doğrulama hatası:', tokenError);
      console.error('[GoogleLogin] Token doğrulama hata detayları:', {
        message: tokenError.message,
        code: tokenError.code,
        name: tokenError.name,
        stack: tokenError.stack?.split('\n').slice(0, 3).join('\n')
      });
      
      return res.status(401).json({
        success: false,
        error: 'Google kimlik doğrulama hatası',
        details: process.env.NODE_ENV === 'development' ? tokenError.message : 'Kimlik doğrulama başarısız',
        errorCode: tokenError.code || 'token_verification_failed'
      });
    }
  } catch (error: any) {
    console.error('[GoogleLogin] Hata oluştu:', error);
    console.error('[GoogleLogin] Hata detayları:', {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5).join('\n'),
      code: error.code,
      name: error.name
    });
    
    let errorMessage = 'Kimlik doğrulama başarısız';
    let errorCode = 'auth_error';
    
    if (error.code) {
      errorCode = error.code;
      
      // Yaygın hata kodları için daha açıklayıcı mesajlar
      if (error.code === 'auth/id-token-expired') {
        errorMessage = 'Token süresi dolmuş, lütfen tekrar giriş yapın';
      } else if (error.code === 'auth/id-token-revoked') {
        errorMessage = 'Token geçersiz kılınmış, lütfen tekrar giriş yapın';
      } else if (error.code === 'auth/invalid-id-token') {
        errorMessage = 'Geçersiz token formatı';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'Kullanıcı hesabı devre dışı bırakılmış';
      }
    }
    
    res.status(401).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : errorMessage,
      errorCode
    });
  }
};

/**
 * Kullanıcı oturumunu kapatır
 * @param req Express request
 * @param res Express response
 */
export const logout = async (req: Request, res: Response) => {
  try {
    // Burada kendi session/token yönetiminize göre oturum kapatma işlemi yapabilirsiniz
    res.status(200).json({
      success: true,
      message: "Oturum başarıyla kapatıldı",
    });
  } catch (error) {
    console.error("Oturum kapatılırken hata oluştu:", error);
    res.status(500).json({
      success: false,
      message: "Oturum kapatılırken bir hata oluştu",
    });
  }
};
