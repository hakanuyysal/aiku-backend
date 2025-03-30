"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = void 0;
// @ts-nocheck - Typescript hatalarını görmezden gel
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = require("../models/User"); // Kullanıcı modelinin yolu - named import kullanılmalı
const optionalAuth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    let token;
    if ((_a = req.headers.authorization) === null || _a === void 0 ? void 0 : _a.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
    }
    if (!token) {
        req.user = null;
        console.log("No token found. req.user is NULL");
        return next();
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const user = yield User_1.User.findById(decoded.id).select("-password");
        if (!user) {
            req.user = null;
            console.log("User not found in DB. req.user is NULL");
            return next();
        }
        req.user = user;
        console.log("Authenticated User:", req.user); // Kullanıcı doğrulandı mı kontrol et!
        next();
    }
    catch (err) {
        req.user = null;
        // console.log("Token invalid. req.user is NULL");
        return next();
    }
});
exports.optionalAuth = optionalAuth;
