import axios from "axios";
import { GeminiService } from "./geminiService";
import dotenv from "dotenv";
import jwt, { SignOptions, Secret } from "jsonwebtoken";
import { User } from "../models/User";

dotenv.config();

export class LinkedInService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private geminiService: GeminiService;

  constructor() {
    if (
      !process.env.LINKEDIN_CLIENT_ID ||
      !process.env.LINKEDIN_CLIENT_SECRET ||
      !process.env.LINKEDIN_REDIRECT_URI
    ) {
      throw new Error(
        "LinkedIn API bilgileri eksik. Lütfen .env dosyasını kontrol edin."
      );
    }

    this.clientId = process.env.LINKEDIN_CLIENT_ID;
    this.clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    this.redirectUri = process.env.LINKEDIN_REDIRECT_URI;
    this.geminiService = new GeminiService();

    console.log("LinkedIn Service initialized with:", {
      clientId: this.clientId,
      redirectUri: this.redirectUri,
    });
  }

  getAuthUrl(): string {
    const scopes = ["openid", "profile", "email"];

    const scope = scopes.join(",");
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${this.clientId}&redirect_uri=${this.redirectUri}&scope=${scope}&state=random123`;

    console.log("Generated LinkedIn Auth URL:", authUrl);
    return authUrl;
  }

  async getAccessToken(code: string): Promise<string> {
    try {
      console.log("Getting access token with code:", code);
      console.log("Using client ID:", this.clientId);
      console.log("Using redirect URI:", this.redirectUri);

      const response = await axios.post(
        "https://www.linkedin.com/oauth/v2/accessToken",
        null,
        {
          params: {
            grant_type: "authorization_code",
            code,
            client_id: this.clientId,
            client_secret: this.clientSecret,
            redirect_uri: this.redirectUri,
          },
        }
      );

      console.log("Access token response:", response.data);
      return response.data.access_token;
    } catch (error: any) {
      console.error(
        "LinkedIn access token error:",
        error.response?.data || error.message
      );
      throw new Error(
        `LinkedIn access token alınamadı: ${
          error.response?.data?.error_description || error.message
        }`
      );
    }
  }

  async getProfile(accessToken: string) {
    try {
      console.log("Getting user profile with access token");

      const userInfoResponse = await axios.get(
        "https://api.linkedin.com/v2/userinfo",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      console.log("User info response:", userInfoResponse.data);

      return this.formatLinkedInData(userInfoResponse.data);
    } catch (error: any) {
      console.error(
        "LinkedIn profile error:",
        error.response?.data || error.message
      );
      throw new Error(
        `LinkedIn profil bilgileri alınamadı: ${
          error.response?.data?.error_description || error.message
        }`
      );
    }
  }

  private formatLinkedInData(userInfo: any) {
    return {
      name: userInfo.name || `${userInfo.given_name} ${userInfo.family_name}`,
      email: userInfo.email,
      picture: userInfo.picture,
      locale: userInfo.locale,
      emailVerified: userInfo.email_verified,
      linkedinUrl: `https://www.linkedin.com/in/${userInfo.sub}/`,
    };
  }

  async handleAuth(linkedInData: any) {
    try {
      let user = await User.findOne({ email: linkedInData.email });

      const userData = {
        firstName: linkedInData.name.split(" ")[0],
        lastName: linkedInData.name.split(" ").slice(1).join(" "),
        email: linkedInData.email,
        profilePhoto: linkedInData.picture,
        locale: linkedInData.locale,
        emailVerified: linkedInData.emailVerified,
        linkedin: linkedInData.linkedinUrl,
        authProvider: "linkedin",
        lastLogin: new Date(),
      };

      if (!user) {
        user = new User(userData);
        await user.save();
      } else {
        user.set(userData);
        await user.save();
      }

      const jwtSecret: Secret = process.env.JWT_SECRET || "your-super-secret-jwt-key";
      const jwtOptions: SignOptions = { expiresIn: process.env.JWT_EXPIRE || "24h" };
      
      const token = jwt.sign(
        { userId: user._id.toString() },
        jwtSecret,
        jwtOptions
      );

      return {
        user: {
          id: user._id.toString(),
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          profilePhoto: user.profilePhoto,
          linkedin: user.linkedin,
          locale: user.locale,
          emailVerified: user.emailVerified,
        },
        token,
      };
    } catch (error: any) {
      console.error("LinkedIn auth error:", error);
      throw new Error("LinkedIn ile giriş işlemi başarısız: " + error.message);
    }
  }
}
