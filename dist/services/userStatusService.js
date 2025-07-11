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
const User_1 = require("../models/User");
const logger_1 = __importDefault(require("../config/logger"));
class UserStatusService {
    constructor(io) {
        this.userSockets = {};
        this.socketUsers = {};
        this.io = io;
    }
    /**
     * Add a socket connection for a user
     */
    addUserSocket(userId, socketId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Update in-memory mappings
                if (!this.userSockets[userId]) {
                    this.userSockets[userId] = [];
                }
                if (!this.userSockets[userId].includes(socketId)) {
                    this.userSockets[userId].push(socketId);
                }
                this.socketUsers[socketId] = userId;
                // Update user in database
                yield User_1.User.findByIdAndUpdate(userId, {
                    isOnline: true,
                    lastSeen: new Date(),
                    $addToSet: { socketIds: socketId }
                });
                // Broadcast user online status
                this.broadcastUserStatus(userId, true);
                logger_1.default.info('User connected', { userId, socketId });
            }
            catch (error) {
                logger_1.default.error('Error adding user socket', { userId, socketId, error });
            }
        });
    }
    /**
     * Remove a socket connection for a user
     */
    removeUserSocket(socketId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const userId = this.socketUsers[socketId];
                if (!userId) {
                    return;
                }
                // Remove from in-memory mappings
                if (this.userSockets[userId]) {
                    this.userSockets[userId] = this.userSockets[userId].filter(id => id !== socketId);
                    // If no more sockets, user is offline
                    if (this.userSockets[userId].length === 0) {
                        delete this.userSockets[userId];
                        // Update user in database
                        yield User_1.User.findByIdAndUpdate(userId, {
                            isOnline: false,
                            lastSeen: new Date(),
                            socketIds: []
                        });
                        // Broadcast user offline status
                        this.broadcastUserStatus(userId, false);
                    }
                    else {
                        // Update user socketIds in database
                        yield User_1.User.findByIdAndUpdate(userId, {
                            $pull: { socketIds: socketId }
                        });
                    }
                }
                delete this.socketUsers[socketId];
                logger_1.default.info('User disconnected', { userId, socketId });
            }
            catch (error) {
                logger_1.default.error('Error removing user socket', { socketId, error });
            }
        });
    }
    /**
     * Get online users
     */
    getOnlineUsers() {
        return Object.keys(this.userSockets);
    }
    /**
     * Check if user is online
     */
    isUserOnline(userId) {
        return userId in this.userSockets;
    }
    /**
     * Get user's socket IDs
     */
    getUserSockets(userId) {
        return this.userSockets[userId] || [];
    }
    /**
     * Get online users count
     */
    getOnlineUsersCount() {
        return Object.keys(this.userSockets).length;
    }
    /**
     * Broadcast user status change to all connected clients
     */
    broadcastUserStatus(userId, isOnline) {
        this.io.emit('user-status-change', {
            userId,
            isOnline,
            timestamp: new Date()
        });
        // Also broadcast to specific user channels if needed
        this.io.emit(`user-${userId}-status`, {
            userId,
            isOnline,
            timestamp: new Date()
        });
    }
    /**
     * Broadcast online users list to a specific socket
     */
    sendOnlineUsersToSocket(socketId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const onlineUserIds = this.getOnlineUsers();
                const onlineUsers = yield User_1.User.find({
                    _id: { $in: onlineUserIds }
                }).select('_id firstName lastName profilePhoto isOnline lastSeen');
                this.io.to(socketId).emit('online-users-list', {
                    users: onlineUsers,
                    count: onlineUsers.length
                });
            }
            catch (error) {
                logger_1.default.error('Error sending online users list', { socketId, error });
            }
        });
    }
    /**
     * Send typing indicator
     */
    sendTypingIndicator(userId, chatSessionId, isTyping) {
        const userSockets = this.getUserSockets(userId);
        // Broadcast to chat session room, excluding sender's sockets
        this.io.to(`chat-${chatSessionId}`).except(userSockets).emit('user-typing', {
            userId,
            chatSessionId,
            isTyping,
            timestamp: new Date()
        });
    }
    /**
     * Clean up offline users periodically
     */
    cleanupOfflineUsers() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Update users who should be offline but are marked as online in database
                const offlineThreshold = new Date(Date.now() - 30000); // 30 seconds ago
                yield User_1.User.updateMany({
                    isOnline: true,
                    lastSeen: { $lt: offlineThreshold },
                    socketIds: { $size: 0 }
                }, {
                    isOnline: false
                });
                logger_1.default.info('Cleaned up offline users');
            }
            catch (error) {
                logger_1.default.error('Error cleaning up offline users', { error });
            }
        });
    }
    /**
     * Initialize cleanup job
     */
    startCleanupJob() {
        setInterval(() => {
            this.cleanupOfflineUsers();
        }, 60000); // Run every minute
    }
}
exports.default = UserStatusService;
