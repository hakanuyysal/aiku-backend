// @ts-nocheck - Akademik Gemini servisi, mevcut GeminiService yapısına benzer şekilde çalışır.
// Bu servis, akademik ortamda öğrenci/soru-cevap amaçlı kullanılacak şekilde özelleştirilmiştir.
// API anahtarı ve model nesnesi mevcut GeminiService ile ortaktır.

import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not defined in environment variables");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export class GeminiAcademicService {
  private chatModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  /**
   * Akademik ortam için özel prompt ile chat fonksiyonu
   * @param message Kullanıcıdan gelen mesaj
   * @param conversationHistory Önceki konuşma geçmişi (opsiyonel)
   * @returns AI'den gelen yanıt ve güncellenmiş konuşma geçmişi
   */
  async chatAcademic(message: string, conversationHistory: any[] = []): Promise<{ response: string; conversationHistory: any[] }> {
    try {
      // Akademik ortam için sistem talimatı
      const academicSystemInstructions = `You are an academic assistant for university students and faculty. Always provide clear, concise, and referenced answers. Prioritize academic integrity, cite sources when possible, and never fabricate information. If you don't know the answer, say so. Use formal, academic language. If the user asks for help with assignments, guide them to learn, do not provide direct answers.\n\nNow, please respond to the user's request or question using this academic context.`;

      let updatedHistory = [...conversationHistory];

      if (updatedHistory.length === 0) {
        const chat = this.chatModel.startChat({
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.9,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
          ]
        });
        const contextResult = await chat.sendMessage(academicSystemInstructions);
        const contextResponse = await contextResult.response;
        const result = await chat.sendMessage(message);
        const responseText = await result.response;
        const responseContent = responseText.text();
        updatedHistory = [
          { role: "user", content: academicSystemInstructions },
          { role: "model", content: contextResponse.text() },
          { role: "user", content: message },
          { role: "model", content: responseContent }
        ];
        return {
          response: responseContent,
          conversationHistory: updatedHistory
        };
      } else {
        const chat = this.chatModel.startChat({
          history: updatedHistory.map(item => ({
            role: item.role,
            parts: [{ text: item.content }]
          })),
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.9,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
          ]
        });
        const result = await chat.sendMessage(message);
        const responseText = await result.response;
        const responseContent = responseText.text();
        updatedHistory = [
          ...updatedHistory,
          { role: "user", content: message },
          { role: "model", content: responseContent }
        ];
        return {
          response: responseContent,
          conversationHistory: updatedHistory
        };
      }
    } catch (error) {
      console.error("Akademik chat hatası:", error);
      throw new Error(`Akademik chat sırasında hata oluştu: ${(error as Error).message}`);
    }
  }
} 