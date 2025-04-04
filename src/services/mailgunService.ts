import formData from "form-data";
import Mailgun from "mailgun.js";

class MailgunService {
  private mailgun: any;
  private domain: string;

  constructor() {
    console.log("Mailgun service initializing...");
    const apiKey = process.env.MAILGUN_API_KEY || "";
    console.log("API Key:", apiKey);
    console.log("Domain:", process.env.MAILGUN_DOMAIN);

    const mailgun = new Mailgun(formData);
    this.mailgun = mailgun.client({
      username: "api",
      key: apiKey,
      url: "https://api.eu.mailgun.net",
    });
    this.domain = process.env.MAILGUN_DOMAIN || "";
    console.log("Mailgun service initialized with domain:", this.domain);
  }

  async sendVerificationEmail(
    email: string,
    verificationToken: string
  ): Promise<void> {
    const verificationUrl = `${process.env.FRONTEND_URL}/api/auth/verify-email/${verificationToken}`;
    console.log("Preparing to send verification email to:", email);
    console.log("Verification URL:", verificationUrl);

    const messageData = {
      from: `AIKU AI Platform <postmaster@${this.domain}>`,
      to: email,
      subject: "Email Verification",
      template: "email-verification",
      "t:variables": JSON.stringify({
        verification_url: verificationUrl,
      }),
    };

    console.log("Email message data:", messageData);

    try {
      console.log("Attempting to send email via Mailgun...");
      console.log("Using domain:", this.domain);
      console.log(
        "Using API key:",
        this.mailgun.apiKey ? "Present" : "Missing"
      );
      const result = await this.mailgun.messages.create(
        this.domain,
        messageData
      );
      console.log("Email sent successfully:", result);
    } catch (error) {
      console.error("E-posta gönderimi başarısız:", error);
      console.error("Error details:", {
        domain: this.domain,
        apiKey: this.mailgun.apiKey ? "Present" : "Missing",
        error: error instanceof Error ? error.message : error,
      });
      throw new Error("E-posta gönderimi başarısız oldu");
    }
  }
}

export const mailgunService = new MailgunService();
