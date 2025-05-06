import { Request, Response, NextFunction } from "express";

// Engellenen IP'ler listesi
const BLOCKED_IPS = new Set(["154.83.103.179", "23.27.46.35", "168.76.20.229"]);

// IP engelleyici middleware
export const ipBlocker = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.ip || req.socket.remoteAddress || "";

  if (BLOCKED_IPS.has(clientIP)) {
    // IP engellenmişse 403 hatası döndür
    return res.status(403).json({
      status: "error",
      message: "Bu IP adresi engellenmiştir.",
      code: "IP_BLOCKED",
    });
  }

  next();
};

// IP ekleme ve kaldırma fonksiyonları
export const addBlockedIP = (ip: string) => {
  BLOCKED_IPS.add(ip);
};

export const removeBlockedIP = (ip: string) => {
  BLOCKED_IPS.delete(ip);
};

export const getBlockedIPs = () => {
  return Array.from(BLOCKED_IPS);
};
