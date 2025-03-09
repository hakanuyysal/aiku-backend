import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not defined in environment variables");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

interface FormData {
  companyName?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  description?: string;
}

export class GeminiService {
  private model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  private cleanJsonString(text: string): string {
    // Remove markdown markers
    text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    // Clean leading and trailing whitespace
    text = text.trim();
    return text;
  }

  async analyzeDocument(documentText: string): Promise<FormData> {
    try {
      const prompt = `You are an AI assistant specialized in extracting company information from documents. Your task is to thoroughly analyze the given text and extract all relevant company details.

Instructions:
1. Carefully examine the entire text for any company-related information
2. Look for both explicit and implicit information
3. Search for:
   - Company name (look for business names, brands, letterhead information)
   - Email addresses (any business or contact email)
   - Phone numbers (any business or contact phone numbers)
   - Website URLs (company websites, social media)
   - Physical address (office location, headquarters, branches)
   - Company description (what they do, services, products, industry)
4. Return ONLY a JSON object with the found information
5. If information is not found, use empty string ("")
6. Do not include any explanatory text or markdown

Expected JSON format:
{
  "companyName": "Company name",
  "email": "Email address",
  "phone": "Phone number",
  "website": "Website address",
  "address": "Address",
  "description": "Company description"
}

Text to analyze:
${documentText}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = this.cleanJsonString(response.text());
      
      try {
        return JSON.parse(text);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        console.error("Received text:", text);
        throw new Error("AI response is not in JSON format");
      }
    } catch (error) {
      console.error("Gemini API error:", error);
      throw error;
    }
  }

  async analyzeWebsite(url: string): Promise<FormData> {
    try {
      const prompt = `Analyze this website and return information in JSON format. ONLY return JSON, do not write anything else. Do not use markdown. If any information is not found, leave that field as an empty string:

{
  "companyName": "Company name",
  "email": "Email address",
  "phone": "Phone number",
  "website": "${url}",
  "address": "Address",
  "description": "Company description"
}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = this.cleanJsonString(response.text());
      
      try {
        return JSON.parse(text);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        console.error("Received text:", text);
        throw new Error("AI response is not in JSON format");
      }
    } catch (error) {
      console.error("Gemini API error:", error);
      throw error;
    }
  }

  async analyzeLinkedIn(linkedInData: string): Promise<FormData> {
    try {
      const prompt = `Analyze this LinkedIn profile and return information in JSON format. ONLY return JSON, do not write anything else. Do not use markdown. If any information is not found, leave that field as an empty string:

{
  "companyName": "Company name",
  "email": "Email address",
  "phone": "Phone number",
  "website": "Website address",
  "address": "Address",
  "description": "Company description"
}

Profile: ${linkedInData}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = this.cleanJsonString(response.text());
      
      try {
        return JSON.parse(text);
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        console.error("Received text:", text);
        throw new Error("AI response is not in JSON format");
      }
    } catch (error) {
      console.error("Gemini API error:", error);
      throw error;
    }
  }
}
