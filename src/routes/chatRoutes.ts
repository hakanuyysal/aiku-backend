import express from 'express';
import {
  getCompanyChatSessions,
  createChatSession,
  getCompanyChatStatuses,
  getChatMessages,
  sendMessage,
  toggleArchiveChat,
  deleteChat,
  broadcastToAllCompanies
} from '../controllers/chatController';
import { protect } from '../middleware/auth';
import { check } from 'express-validator';

const router = express.Router();

// Bir şirketin tüm sohbet oturumlarını getirme
// GET /api/chat/sessions/:companyId
router.get('/sessions/:companyId', protect, getCompanyChatSessions);

// Yeni bir sohbet oturumu oluşturma
// POST /api/chat/sessions
router.post(
  '/sessions',
  protect,
  [
    check('initiatorCompanyId', 'Başlatıcı şirket ID zorunludur')
      .not()
      .isEmpty(),
    check('targetCompanyId', 'Hedef şirket ID zorunludur').not().isEmpty(),
    check('title', 'Sohbet başlığı zorunludur').not().isEmpty(),
  ],
  createChatSession
);

// Bir sohbet oturumunun mesajlarını getirme
// GET /api/chat/messages/:chatSessionId?companyId=xxx
router.get('/messages/:chatSessionId', protect, getChatMessages);

// Yeni bir mesaj gönderme
// POST /api/chat/messages
router.post(
  '/messages',
  protect,
  [
    check('chatSessionId', 'Sohbet oturumu ID zorunludur').not().isEmpty(),
    check('senderId', 'Gönderen ID zorunludur').not().isEmpty(),
    check('content', 'Mesaj içeriği zorunludur').not().isEmpty(),
  ],
  sendMessage
);

// Sohbeti arşivleme/arşivden çıkarma
// PATCH /api/chat/archive/:chatSessionId
router.patch('/archive/:chatSessionId', protect, toggleArchiveChat);

// Sohbeti silme
// DELETE /api/chat/sessions/:chatSessionId
router.delete('/sessions/:chatSessionId', protect, deleteChat);

// Tüm şirketlere toplu mesaj gönderme
// POST /api/chat/broadcast
router.post(
  '/broadcast',
  protect,
  [
    check('content', 'Mesaj içeriği zorunludur').not().isEmpty(),
  ],
  broadcastToAllCompanies
);

// ————— Mevcut sohbet oturumlarını çek —————
// GET /api/chat/sessions/:companyId
router.get(
  '/sessions/:companyId',
  protect,
  getCompanyChatSessions
);

// ————— Yeni: sadece online durumlarını çek —————
// GET /api/chat/sessions/:companyId/statuses
router.get(
  '/sessions/:companyId/statuses',
  protect,
  getCompanyChatStatuses
);

export default router; 