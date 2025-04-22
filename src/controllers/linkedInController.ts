import { Request, Response } from "express";
import { LinkedInService } from "../services/linkedInService";
import logger from "../config/logger";
export class LinkedInController {
  private linkedInService: LinkedInService;

  constructor() {
    this.linkedInService = new LinkedInService();
  }

  async getAuthUrl(req: Request, res: Response) {
    try {
      const authUrl = this.linkedInService.getAuthUrl();
      console.log("Generated auth URL:", authUrl);
      res.json({ authUrl });
    } catch (error: any) {
      console.error("Auth URL error:", error);
      res
        .status(500)
        .json({
          error: "LinkedIn auth URL oluşturulamadı",
          details: error.message,
        });
    }
  }

  async handleCallback(req: Request, res: Response) {
    try {
      console.log("Received callback with query:", req.query);
      const { code, state } = req.query;

      if (!code || typeof code !== "string") {
        throw new Error("Geçersiz auth code");
      }

      console.log("Getting access token for code:", code);
      const accessToken = await this.linkedInService.getAccessToken(code);

      console.log("Access token received, getting profile data");
      const profileData = await this.linkedInService.getProfile(accessToken);

      console.log("Profile data received:", profileData);

      const authResult = await this.linkedInService.handleAuth(profileData);

      res.json({
        success: true,
        data: authResult,
        redirectUrl: `${process.env.CLIENT_URL}/auth/callback?token=${authResult.token}`,
      });
    } catch (error: any) {
      console.error("Callback error:", error);
      logger.error(`LinkedIn callback hatası: ${error.message}`);
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  }
}
