// src/middleware/ensureGuest.ts
import { Request, Response, NextFunction } from "express";
import { v4 as uuid } from "uuid";

declare module "express" {
    interface Request {
        guestId?: string;
    }
}

export const ensureGuest = (req: Request, res: Response, next: NextFunction) => {
    let gid = req.cookies?.gid;
    if (!gid) {
        gid = uuid();
        res.cookie("gid", gid, {
            httpOnly: true,
            sameSite: "lax",
            maxAge: 1000 * 60 * 60 * 24 * 365 // 1 yıl
        });
    }
    req.guestId = gid;
    next();
};
