import express from "express";
import { GeminiAcademicService } from "../services/geminiAcademicService";
import logger from "../config/logger";
import { AcademicChatSession } from "../models/AcademicChatSession";
import { AcademicMessage } from "../models/AcademicMessage";

const router = express.Router();
const geminiAcademicService = new GeminiAcademicService();

router.post("/chat", async (req, res) => {
  try {
    const { message, sessionId = null } = req.body;
    if (!message) {
      return res.status(400).json({
        success: false,
        error: "Mesaj gereklidir",
      });
    }
    let session;
    if (sessionId) {
      session = await AcademicChatSession.findById(sessionId);
    }
    if (!session) {
      session = await AcademicChatSession.create({
        title: "Akademik Sohbet",
        lastMessageText: message,
        lastMessageDate: new Date(),
      });
    }
    const userMsg = await AcademicMessage.create({
      chatSession: session._id,
      content: message,
    });
    const chatResponse = await geminiAcademicService.chatAcademic(message, []);
    const aiMsg = await AcademicMessage.create({
      chatSession: session._id,
      content: chatResponse.response,
    });
    session.lastMessageText = chatResponse.response;
    session.lastMessageDate = new Date();
    await session.save();
    res.json({
      success: true,
      sessionId: session._id,
      response: chatResponse.response,
      conversation: [userMsg, aiMsg],
    });
  } catch (error) {
    console.error("Akademik sohbet hatası:", error);
    res.status(500).json({
      success: false,
      error: (error as Error).message || "Bilinmeyen bir sohbet hatası oluştu",
    });
    logger.error("Akademik sohbet hatası:", error);
  }
});

export default router; 