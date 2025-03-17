import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

interface JwtPayload {
  id: string;
}

// Request tipini genişletiyoruz
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  // Token kontrolü
  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
    console.log("Token bulundu:", token.substring(0, 15) + "...");
  } else {
    console.log("Authorization header bulunamadı veya Bearer formatında değil:", req.headers.authorization);
  }

  if (!token) {
    console.log("Token bulunamadı, kullanıcı oturum açmamış");
    return res.status(401).json({
      success: false,
      message: "Oturum açmanız gerekiyor",
    });
  }

  try {
    // Token'i doğrula
    console.log("Token doğrulanıyor...");
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    console.log("Token doğrulandı, kullanıcı ID:", decoded.id);

    // Kullanıcıyı veritabanında ara (şifreyi hariç tut)
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      console.log("Kullanıcı bulunamadı, ID:", decoded.id);
      return res.status(404).json({
        success: false,
        message: "Kullanıcı bulunamadı",
      });
    }

    console.log("Kullanıcı bulundu:", user.email);
    // Kullanıcıyı request objesine ekleyerek sonraki middleware'lere ilet
    req.user = user;
    next();
  } catch (err) {
    console.error("Token doğrulama hatası:", err);
    return res.status(401).json({
      success: false,
      message: "Geçersiz veya süresi dolmuş token",
    });
  }
};
