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
      const prompt = `You are an AI assistant specialized in analyzing company information. Analyze the given text and extract company details.

Your task:
1. Carefully read the text
2. Find company information (company name, email, phone, website, address, description)
3. Return the found information in JSON format
4. If any information is not found, leave that field as an empty string ("")
5. ONLY return JSON, do not write anything else
6. Do not use markdown

Expected JSON format:
{
  "companyName": "Company name",
  "email": "Email address",
  "phone": "Phone number",
  "website": "Website address",
  "address": "Address",
  "description": "Company description"
}

Here's the text to analyze:
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
