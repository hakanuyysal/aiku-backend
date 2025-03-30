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
exports.deleteChat = exports.toggleArchiveChat = exports.sendMessage = exports.getChatMessages = exports.createChatSession = exports.getCompanyChatSessions = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const ChatSession_1 = require("../models/ChatSession");
const Message_1 = require("../models/Message");
const Company_1 = require("../models/Company");
const app_1 = require("../app");
// Bir şirketin tüm sohbet oturumlarını getirme
const getCompanyChatSessions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const companyId = req.params.companyId;
        // Geçerli bir MongoDB ObjectId mi kontrol et
        if (!mongoose_1.default.Types.ObjectId.isValid(companyId)) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz şirket ID',
            });
        }
        // Şirketin başlattığı veya hedef olduğu tüm sohbetleri bul
        const chatSessions = yield ChatSession_1.ChatSession.find({
            $or: [
                { initiatorCompany: companyId, deletedByInitiator: false },
                { targetCompany: companyId, deletedByTarget: false },
            ],
        })
            .populate('initiatorCompany', 'companyName companyLogo')
            .populate('targetCompany', 'companyName companyLogo')
            .populate('lastMessageSender', 'companyName')
            .sort({ lastMessageDate: -1 }); // En son mesaj alınanlar en üstte
        res.status(200).json({
            success: true,
            count: chatSessions.length,
            data: chatSessions,
        });
    }
    catch (error) {
        console.error('Sohbet oturumları alınırken hata:', error);
        res.status(500).json({
            success: false,
            message: 'Sohbet oturumları alınırken bir hata oluştu',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata',
        });
    }
});
exports.getCompanyChatSessions = getCompanyChatSessions;
// Yeni bir sohbet oturumu oluşturma
const createChatSession = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { initiatorCompanyId, targetCompanyId, title } = req.body;
        // Gerekli alanları kontrol et
        if (!initiatorCompanyId || !targetCompanyId || !title) {
            return res.status(400).json({
                success: false,
                message: 'Başlatıcı şirket ID, hedef şirket ID ve başlık alanları zorunludur',
            });
        }
        // Kendisiyle konuşmayı engelle
        if (initiatorCompanyId === targetCompanyId) {
            return res.status(400).json({
                success: false,
                message: 'Bir şirket kendisiyle sohbet başlatamaz',
            });
        }
        // Her iki şirketin de var olduğunu kontrol et
        const initiatorExists = yield Company_1.Company.exists({ _id: initiatorCompanyId });
        const targetExists = yield Company_1.Company.exists({ _id: targetCompanyId });
        if (!initiatorExists || !targetExists) {
            return res.status(404).json({
                success: false,
                message: 'Bir veya her iki şirket bulunamadı',
            });
        }
        // Aynı şirketler arasında zaten var olan bir sohbet var mı kontrol et
        let chatSession = yield ChatSession_1.ChatSession.findOne({
            $or: [
                { initiatorCompany: initiatorCompanyId, targetCompany: targetCompanyId },
                { initiatorCompany: targetCompanyId, targetCompany: initiatorCompanyId },
            ],
        });
        if (chatSession) {
            // Eğer sohbet silinmişse, tekrar aktive et
            if ((chatSession.initiatorCompany.toString() === initiatorCompanyId && chatSession.deletedByInitiator) ||
                (chatSession.targetCompany.toString() === initiatorCompanyId && chatSession.deletedByTarget)) {
                if (chatSession.initiatorCompany.toString() === initiatorCompanyId) {
                    chatSession.deletedByInitiator = false;
                }
                else {
                    chatSession.deletedByTarget = false;
                }
                yield chatSession.save();
            }
            return res.status(200).json({
                success: true,
                message: 'Var olan sohbet bulundu',
                data: chatSession,
            });
        }
        // Yeni bir sohbet oturumu oluştur
        chatSession = yield ChatSession_1.ChatSession.create({
            initiatorCompany: initiatorCompanyId,
            targetCompany: targetCompanyId,
            title,
        });
        res.status(201).json({
            success: true,
            message: 'Sohbet oturumu başarıyla oluşturuldu',
            data: chatSession,
        });
    }
    catch (error) {
        console.error('Sohbet oluşturma hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Sohbet oturumu oluşturulurken bir hata oluştu',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata',
        });
    }
});
exports.createChatSession = createChatSession;
// Bir sohbet oturumunun mesajlarını getirme
const getChatMessages = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { chatSessionId } = req.params;
        const { companyId } = req.query;
        if (!chatSessionId || !companyId) {
            return res.status(400).json({
                success: false,
                message: 'Sohbet oturumu ID ve şirket ID parametreleri zorunludur',
            });
        }
        // Sohbet oturumunu bul
        const chatSession = yield ChatSession_1.ChatSession.findById(chatSessionId);
        if (!chatSession) {
            return res.status(404).json({
                success: false,
                message: 'Sohbet oturumu bulunamadı',
            });
        }
        // Şirketin bu sohbete erişim izni var mı kontrol et
        if (chatSession.initiatorCompany.toString() !== companyId &&
            chatSession.targetCompany.toString() !== companyId) {
            return res.status(403).json({
                success: false,
                message: 'Bu sohbete erişim izniniz yok',
            });
        }
        // Sohbetteki mesajları getir
        const messages = yield Message_1.Message.find({ chatSession: chatSessionId })
            .populate('sender', 'companyName companyLogo')
            .sort({ createdAt: 1 }); // Mesajları eski->yeni sırayla getir
        // Okunmamış mesajları "okundu" olarak işaretle
        const isInitiator = chatSession.initiatorCompany.toString() === companyId;
        // Şirketin karşı tarafından gelen mesajları okundu olarak işaretle
        yield Message_1.Message.updateMany({
            chatSession: chatSessionId,
            sender: isInitiator ? chatSession.targetCompany : chatSession.initiatorCompany,
            isRead: false
        }, { isRead: true });
        // Okunmamış mesaj sayacını sıfırla
        if (isInitiator) {
            chatSession.unreadCountInitiator = 0;
        }
        else {
            chatSession.unreadCountTarget = 0;
        }
        yield chatSession.save();
        res.status(200).json({
            success: true,
            count: messages.length,
            data: messages,
        });
    }
    catch (error) {
        console.error('Mesajlar alınırken hata:', error);
        res.status(500).json({
            success: false,
            message: 'Mesajlar alınırken bir hata oluştu',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata',
        });
    }
});
exports.getChatMessages = getChatMessages;
// Yeni bir mesaj gönderme
const sendMessage = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { chatSessionId, senderId, content, attachment } = req.body;
        // Gerekli alanları kontrol et
        if (!chatSessionId || !senderId || !content) {
            return res.status(400).json({
                success: false,
                message: 'Sohbet oturumu ID, gönderen ID ve mesaj içeriği zorunludur',
            });
        }
        // Sohbet oturumunu bul
        const chatSession = yield ChatSession_1.ChatSession.findById(chatSessionId);
        if (!chatSession) {
            return res.status(404).json({
                success: false,
                message: 'Sohbet oturumu bulunamadı',
            });
        }
        // Gönderen şirketin bu sohbete katılımını kontrol et
        if (chatSession.initiatorCompany.toString() !== senderId &&
            chatSession.targetCompany.toString() !== senderId) {
            return res.status(403).json({
                success: false,
                message: 'Bu sohbete mesaj gönderme yetkiniz yok',
            });
        }
        // Yeni mesaj oluştur
        const message = yield Message_1.Message.create({
            chatSession: chatSessionId,
            sender: senderId,
            content,
            attachment,
        });
        // Sohbet oturumunu son mesaj bilgileriyle güncelle
        chatSession.lastMessageText = content;
        chatSession.lastMessageSender = senderId;
        chatSession.lastMessageDate = new Date();
        // Okunmamış mesaj sayacını artır (karşı taraf için)
        const isInitiator = chatSession.initiatorCompany.toString() === senderId;
        if (isInitiator) {
            chatSession.unreadCountTarget += 1;
        }
        else {
            chatSession.unreadCountInitiator += 1;
        }
        // Arşivden çıkar (eğer arşivlenmişse)
        if (isInitiator && chatSession.archivedByInitiator) {
            chatSession.archivedByInitiator = false;
        }
        else if (!isInitiator && chatSession.archivedByTarget) {
            chatSession.archivedByTarget = false;
        }
        yield chatSession.save();
        // Mesajı popüle et ve geri dön
        const populatedMessage = yield Message_1.Message.findById(message._id).populate('sender', 'companyName companyLogo');
        // Socket.io ile gerçek zamanlı bildirim gönder
        // 1. Sohbet odasına mesaj gönder
        app_1.io.to(`chat-${chatSessionId}`).emit('new-message', populatedMessage);
        // 2. Alıcı şirkete bildirim gönder
        const recipientCompanyId = isInitiator ? chatSession.targetCompany.toString() : chatSession.initiatorCompany.toString();
        app_1.io.to(`company-${recipientCompanyId}`).emit('chat-notification', {
            type: 'new-message',
            chatSessionId,
            message: populatedMessage,
            unreadCount: isInitiator ? chatSession.unreadCountTarget : chatSession.unreadCountInitiator,
        });
        res.status(201).json({
            success: true,
            message: 'Mesaj başarıyla gönderildi',
            data: populatedMessage,
        });
    }
    catch (error) {
        console.error('Mesaj gönderilirken hata:', error);
        res.status(500).json({
            success: false,
            message: 'Mesaj gönderilirken bir hata oluştu',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata',
        });
    }
});
exports.sendMessage = sendMessage;
// Sohbeti arşivleme/arşivden çıkarma
const toggleArchiveChat = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { chatSessionId } = req.params;
        const { companyId, archive } = req.body;
        if (!chatSessionId || !companyId || archive === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Sohbet oturumu ID, şirket ID ve arşiv durumu zorunludur',
            });
        }
        // Sohbet oturumunu bul
        const chatSession = yield ChatSession_1.ChatSession.findById(chatSessionId);
        if (!chatSession) {
            return res.status(404).json({
                success: false,
                message: 'Sohbet oturumu bulunamadı',
            });
        }
        // Şirketin bu sohbete erişim izni var mı kontrol et
        if (chatSession.initiatorCompany.toString() !== companyId &&
            chatSession.targetCompany.toString() !== companyId) {
            return res.status(403).json({
                success: false,
                message: 'Bu sohbete erişim izniniz yok',
            });
        }
        // Arşiv durumunu güncelle
        if (chatSession.initiatorCompany.toString() === companyId) {
            chatSession.archivedByInitiator = archive;
        }
        else {
            chatSession.archivedByTarget = archive;
        }
        yield chatSession.save();
        res.status(200).json({
            success: true,
            message: `Sohbet ${archive ? 'arşivlendi' : 'arşivden çıkarıldı'}`,
            data: chatSession,
        });
    }
    catch (error) {
        console.error('Sohbet arşivleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Sohbet arşivlenirken bir hata oluştu',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata',
        });
    }
});
exports.toggleArchiveChat = toggleArchiveChat;
// Sohbeti silme (aslında soft delete)
const deleteChat = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { chatSessionId } = req.params;
        const { companyId } = req.body;
        if (!chatSessionId || !companyId) {
            return res.status(400).json({
                success: false,
                message: 'Sohbet oturumu ID ve şirket ID zorunludur',
            });
        }
        // Sohbet oturumunu bul
        const chatSession = yield ChatSession_1.ChatSession.findById(chatSessionId);
        if (!chatSession) {
            return res.status(404).json({
                success: false,
                message: 'Sohbet oturumu bulunamadı',
            });
        }
        // Şirketin bu sohbete erişim izni var mı kontrol et
        if (chatSession.initiatorCompany.toString() !== companyId &&
            chatSession.targetCompany.toString() !== companyId) {
            return res.status(403).json({
                success: false,
                message: 'Bu sohbete erişim izniniz yok',
            });
        }
        // Silme işlemi (soft delete)
        if (chatSession.initiatorCompany.toString() === companyId) {
            chatSession.deletedByInitiator = true;
        }
        else {
            chatSession.deletedByTarget = true;
        }
        // Her iki taraf da silerse, mesajları da silebiliriz (opsiyonel)
        if (chatSession.deletedByInitiator && chatSession.deletedByTarget) {
            // Sohbete ait mesajları silmek istiyorsanız bu bloğu aktif edebilirsiniz
            // await Message.deleteMany({ chatSession: chatSessionId });
        }
        yield chatSession.save();
        res.status(200).json({
            success: true,
            message: 'Sohbet başarıyla silindi',
        });
    }
    catch (error) {
        console.error('Sohbet silme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Sohbet silinirken bir hata oluştu',
            error: error instanceof Error ? error.message : 'Bilinmeyen hata',
        });
    }
});
exports.deleteChat = deleteChat;
