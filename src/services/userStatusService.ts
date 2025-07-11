import { Server } from "socket.io";
import mongoose from 'mongoose';
import { User } from '../models/User';
import logger from '../config/logger';

interface UserSocketMapping {
  [userId: string]: string[]; // userId -> array of socketIds
}

interface SocketUserMapping {
  [socketId: string]: string; // socketId -> userId
}

class UserStatusService {
  private userSockets: UserSocketMapping = {};
  private socketUsers: SocketUserMapping = {};
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  /**
   * Add a socket connection for a user
   */
  async addUserSocket(userId: string, socketId: string): Promise<void> {
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
      await User.findByIdAndUpdate(userId, {
        isOnline: true,
        lastSeen: new Date(),
        $addToSet: { socketIds: socketId }
      });

      // Broadcast user online status
      this.broadcastUserStatus(userId, true);

      logger.info('User connected', { userId, socketId });
    } catch (error) {
      logger.error('Error adding user socket', { userId, socketId, error });
    }
  }

  /**
   * Remove a socket connection for a user
   */
  async removeUserSocket(socketId: string): Promise<void> {
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
          await User.findByIdAndUpdate(userId, {
            isOnline: false,
            lastSeen: new Date(),
            socketIds: []
          });

          // Broadcast user offline status
          this.broadcastUserStatus(userId, false);
        } else {
          // Update user socketIds in database
          await User.findByIdAndUpdate(userId, {
            $pull: { socketIds: socketId }
          });
        }
      }

      delete this.socketUsers[socketId];

      logger.info('User disconnected', { userId, socketId });
    } catch (error) {
      logger.error('Error removing user socket', { socketId, error });
    }
  }

  /**
   * Get online users
   */
  getOnlineUsers(): string[] {
    return Object.keys(this.userSockets);
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return userId in this.userSockets;
  }

  /**
   * Get user's socket IDs
   */
  getUserSockets(userId: string): string[] {
    return this.userSockets[userId] || [];
  }

  /**
   * Get online users count
   */
  getOnlineUsersCount(): number {
    return Object.keys(this.userSockets).length;
  }

  /**
   * Broadcast user status change to all connected clients
   */
  private broadcastUserStatus(userId: string, isOnline: boolean): void {
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
  async sendOnlineUsersToSocket(socketId: string): Promise<void> {
    try {
      const onlineUserIds = this.getOnlineUsers();
      const onlineUsers = await User.find({
        _id: { $in: onlineUserIds }
      }).select('_id firstName lastName profilePhoto isOnline lastSeen');

      this.io.to(socketId).emit('online-users-list', {
        users: onlineUsers,
        count: onlineUsers.length
      });
    } catch (error) {
      logger.error('Error sending online users list', { socketId, error });
    }
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(userId: string, chatSessionId: string, isTyping: boolean): void {
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
  async cleanupOfflineUsers(): Promise<void> {
    try {
      // Update users who should be offline but are marked as online in database
      const offlineThreshold = new Date(Date.now() - 30000); // 30 seconds ago
      
      await User.updateMany({
        isOnline: true,
        lastSeen: { $lt: offlineThreshold },
        socketIds: { $size: 0 }
      }, {
        isOnline: false
      });

      logger.info('Cleaned up offline users');
    } catch (error) {
      logger.error('Error cleaning up offline users', { error });
    }
  }

  /**
   * Initialize cleanup job
   */
  startCleanupJob(): void {
    setInterval(() => {
      this.cleanupOfflineUsers();
    }, 60000); // Run every minute
  }
}

export default UserStatusService;