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
exports.getOnlineUsersCount = exports.updateLastSeen = exports.getUsersStatus = exports.getUserStatus = exports.getOnlineUsers = void 0;
const User_1 = require("../models/User");
const app_1 = require("../app");
const logger_1 = __importDefault(require("../config/logger"));
/**
 * Get online users list
 */
const getOnlineUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const onlineUserIds = app_1.userStatusService.getOnlineUsers();
        const onlineUsers = yield User_1.User.find({
            _id: { $in: onlineUserIds }
        }).select('_id firstName lastName profilePhoto isOnline lastSeen');
        res.status(200).json({
            success: true,
            count: onlineUsers.length,
            data: onlineUsers
        });
    }
    catch (error) {
        logger_1.default.error('Error fetching online users', { error });
        res.status(500).json({
            success: false,
            message: 'Online kullanıcılar alınırken bir hata oluştu',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
    }
});
exports.getOnlineUsers = getOnlineUsers;
/**
 * Get user status by ID
 */
const getUserStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'Kullanıcı ID gerekli'
            });
        }
        const user = yield User_1.User.findById(userId).select('_id firstName lastName isOnline lastSeen');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Kullanıcı bulunamadı'
            });
        }
        const isOnlineNow = app_1.userStatusService.isUserOnline(userId);
        res.status(200).json({
            success: true,
            data: {
                userId: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                isOnline: isOnlineNow,
                lastSeen: user.lastSeen
            }
        });
    }
    catch (error) {
        logger_1.default.error('Error fetching user status', { error, userId: req.params.userId });
        res.status(500).json({
            success: false,
            message: 'Kullanıcı durumu alınırken bir hata oluştu',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
    }
});
exports.getUserStatus = getUserStatus;
/**
 * Get multiple users status
 */
const getUsersStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userIds } = req.body;
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Kullanıcı ID listesi gerekli'
            });
        }
        const users = yield User_1.User.find({
            _id: { $in: userIds }
        }).select('_id firstName lastName isOnline lastSeen');
        const usersWithStatus = users.map(user => ({
            userId: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            isOnline: app_1.userStatusService.isUserOnline(user._id.toString()),
            lastSeen: user.lastSeen
        }));
        res.status(200).json({
            success: true,
            count: usersWithStatus.length,
            data: usersWithStatus
        });
    }
    catch (error) {
        logger_1.default.error('Error fetching users status', { error });
        res.status(500).json({
            success: false,
            message: 'Kullanıcı durumları alınırken bir hata oluştu',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
    }
});
exports.getUsersStatus = getUsersStatus;
/**
 * Update current user's last seen
 */
const updateLastSeen = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Yetkisiz erişim'
            });
        }
        yield User_1.User.findByIdAndUpdate(userId, {
            lastSeen: new Date()
        });
        res.status(200).json({
            success: true,
            message: 'Son görülme zamanı güncellendi'
        });
    }
    catch (error) {
        logger_1.default.error('Error updating last seen', { error, userId: (_b = req.user) === null || _b === void 0 ? void 0 : _b.id });
        res.status(500).json({
            success: false,
            message: 'Son görülme zamanı güncellenirken bir hata oluştu',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
    }
});
exports.updateLastSeen = updateLastSeen;
/**
 * Get online users count
 */
const getOnlineUsersCount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const count = app_1.userStatusService.getOnlineUsersCount();
        res.status(200).json({
            success: true,
            data: {
                onlineCount: count
            }
        });
    }
    catch (error) {
        logger_1.default.error('Error fetching online users count', { error });
        res.status(500).json({
            success: false,
            message: 'Online kullanıcı sayısı alınırken bir hata oluştu',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata'
        });
    }
});
exports.getOnlineUsersCount = getOnlineUsersCount;
