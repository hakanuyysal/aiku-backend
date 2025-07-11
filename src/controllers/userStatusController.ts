import { Request, Response } from 'express';
import { User } from '../models/User';
import { userStatusService } from '../app';
import logger from '../config/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

/**
 * Get online users list
 */
export const getOnlineUsers = async (req: Request, res: Response) => {
  try {
    const onlineUserIds = userStatusService.getOnlineUsers();
    
    const onlineUsers = await User.find({
      _id: { $in: onlineUserIds }
    }).select('_id firstName lastName profilePhoto isOnline lastSeen');

    res.status(200).json({
      success: true,
      count: onlineUsers.length,
      data: onlineUsers
    });
  } catch (error) {
    logger.error('Error fetching online users', { error });
    res.status(500).json({
      success: false,
      message: 'Online kullanıcılar alınırken bir hata oluştu',
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
};

/**
 * Get user status by ID
 */
export const getUserStatus = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı ID gerekli'
      });
    }

    const user = await User.findById(userId).select('_id firstName lastName isOnline lastSeen');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    const isOnlineNow = userStatusService.isUserOnline(userId);

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
  } catch (error) {
    logger.error('Error fetching user status', { error, userId: req.params.userId });
    res.status(500).json({
      success: false,
      message: 'Kullanıcı durumu alınırken bir hata oluştu',
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
};

/**
 * Get multiple users status
 */
export const getUsersStatus = async (req: Request, res: Response) => {
  try {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Kullanıcı ID listesi gerekli'
      });
    }

    const users = await User.find({
      _id: { $in: userIds }
    }).select('_id firstName lastName isOnline lastSeen');

    const usersWithStatus = users.map(user => ({
      userId: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      isOnline: userStatusService.isUserOnline(user._id.toString()),
      lastSeen: user.lastSeen
    }));

    res.status(200).json({
      success: true,
      count: usersWithStatus.length,
      data: usersWithStatus
    });
  } catch (error) {
    logger.error('Error fetching users status', { error });
    res.status(500).json({
      success: false,
      message: 'Kullanıcı durumları alınırken bir hata oluştu',
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
};

/**
 * Update current user's last seen
 */
export const updateLastSeen = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Yetkisiz erişim'
      });
    }

    await User.findByIdAndUpdate(userId, {
      lastSeen: new Date()
    });

    res.status(200).json({
      success: true,
      message: 'Son görülme zamanı güncellendi'
    });
  } catch (error) {
    logger.error('Error updating last seen', { error, userId: req.user?.id });
    res.status(500).json({
      success: false,
      message: 'Son görülme zamanı güncellenirken bir hata oluştu',
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
};

/**
 * Get online users count
 */
export const getOnlineUsersCount = async (req: Request, res: Response) => {
  try {
    const count = userStatusService.getOnlineUsersCount();

    res.status(200).json({
      success: true,
      data: {
        onlineCount: count
      }
    });
  } catch (error) {
    logger.error('Error fetching online users count', { error });
    res.status(500).json({
      success: false,
      message: 'Online kullanıcı sayısı alınırken bir hata oluştu',
      error: error instanceof Error ? error.message : 'Bilinmeyen hata'
    });
  }
};