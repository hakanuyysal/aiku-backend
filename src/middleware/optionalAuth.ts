import jwt, { JwtPayload } from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";
import User from "../models/User"; // Kullanıcı modelinin yolu

export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  if (req.headers.authorization?.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    req.user = null;
    console.log("No token found. req.user is NULL");
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      req.user = null;
      console.log("User not found in DB. req.user is NULL");
      return next();
    }

    req.user = user;
    console.log("Authenticated User:", req.user); // Kullanıcı doğrulandı mı kontrol et!
    next();
  } catch (err) {
    req.user = null;
    // console.log("Token invalid. req.user is NULL");
    return next();
  }
};
