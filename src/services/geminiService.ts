import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import puppeteer, { ElementHandle, Page } from "puppeteer";

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not defined in environment variables");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

interface FormData {
  companyName: string;
  companyLogo?: string;
  companyType?: 'Enterprise' | 'Entrepreneur' | 'Investor' | 'Startup';
  openForInvestments?: boolean;
  businessModel?: 'B2B' | 'B2C' | 'B2G' | 'C2C' | 'C2B' | 'D2C' | 'B2B2C';
  companySector?: string;
  companySize?: '1-10' | '11-50' | '51-200' | '201-500' | '501-1000' | '1001-5000' | '5001-10000' | '10001+';
  companyEmail: string;
  companyPhone: string;
  companyInfo?: string;
  detailedDescription?: string;
  companyWebsite?: string;
  companyAddress: string;
  companyLinkedIn?: string;
  companyTwitter?: string;
  companyInstagram?: string;
  interestedSectors?: string[];
}

interface PageMetadata {
  title: string;
  metaDescription: string;
  metaKeywords: string;
  ogTitle: string;
  ogDescription: string;
}

interface ContactInfo {
  emails: string[];
  phones: string[];
}

interface ScrapeResult {
  content: string;
  foundUrls: string[];
}

export class GeminiService {
  private model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  private cleanJsonString(text: string): string {
    text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    text = text.trim();
    return text;
  }

  private validateUrl(url: string): string {
    if (!url.startsWith("http")) {
      url = "https://" + url;
    }

    try {
      const parsedUrl = new URL(url);
      if (!parsedUrl.hostname.includes(".")) {
        throw new Error("Geçersiz domain");
      }
      return url;
    } catch (error) {
      throw new Error("Geçersiz URL formatı");
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async checkRobotsRules(url: string): Promise<boolean> {
    try {
      const parsedUrl = new URL(url);
      const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}/robots.txt`;
      const response = await fetch(robotsUrl);
      const robotsText = await response.text();

      const userAgentRules = robotsText.toLowerCase().includes("user-agent: *");
      const disallowed = robotsText.toLowerCase().includes("disallow: /");

      return !userAgentRules || !disallowed;
    } catch (error) {
      console.warn("robots.txt kontrol edilemedi:", error);
      return true;
    }
  }

  private async findSubPages(page: Page): Promise<string[]> {
    return await page.evaluate(() => {
      const subPages: string[] = [];
      const relevantKeywords = [
        "about",
        "contact",
        "hakkinda",
        "hakkımızda",
        "iletisim",
        "iletişim",
        "biz-kimiz",
        "kurumsal",
        "corporate",
        "company",
      ];

      document.querySelectorAll("a").forEach((link) => {
        const href = link.getAttribute("href");
        const text = link.textContent?.toLowerCase() || "";

        if (
          href &&
          !href.startsWith("#") &&
          !href.startsWith("tel:") &&
          !href.startsWith("mailto:")
        ) {
          if (
            relevantKeywords.some(
              (keyword) =>
                href.toLowerCase().includes(keyword) || text.includes(keyword)
            )
          ) {
            subPages.push(href);
          }
        }
      });

      return [...new Set(subPages)];
    });
  }

  private async scrapeWebsite(url: string): Promise<ScrapeResult> {
    try {
      url = this.validateUrl(url);
      const baseUrl = new URL(url).origin;
      let allContent = "";
      const visitedUrls = new Set<string>();
      const foundUrls: string[] = [];

      const isAllowed = await this.checkRobotsRules(url);
      if (!isAllowed) {
        throw new Error("Bu site robots.txt tarafından engellenmiş");
      }

      const browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      });

      console.log("Browser launched");

      try {
        const page = await browser.newPage();
        await page.setUserAgent(
          "Mozilla/5.0 (compatible; AIKUBot/1.0; +https://aiku.com/bot)"
        );

        // Ana sayfayı tara
        await this.scrapePage(page, url, visitedUrls);
        allContent += await this.extractPageContent(page);

        // Alt sayfaları bul
        const subPages = await this.findSubPages(page);

        // Her alt sayfayı tara
        for (const subPath of subPages) {
          try {
            const fullUrl = subPath.startsWith("http")
              ? subPath
              : new URL(subPath, baseUrl).href;

            // Aynı domain'de olduğundan emin ol
            if (!fullUrl.startsWith(baseUrl)) continue;

            // Daha önce ziyaret edilmediyse tara
            if (!visitedUrls.has(fullUrl)) {
              await this.delay(2000); // Rate limiting
              await this.scrapePage(page, fullUrl, visitedUrls);
              allContent += "\n\n--- " + fullUrl + " ---\n";
              allContent += await this.extractPageContent(page);
              foundUrls.push(fullUrl);
            }
          } catch (error) {
            console.warn("Sub-page scraping error:", error);
            continue;
          }
        }

        await page.close();
      } finally {
        await browser.close();
      }

      return {
        content: this.sanitizeText(allContent),
        foundUrls,
      };
    } catch (error) {
      console.error("Web scraping error:", error);
      throw new Error(
        "Web sitesi içeriği alınamadı: " + (error as Error).message
      );
    }
  }
  private async scrapePage(
    page: Page,
    url: string,
    visitedUrls: Set<string>
  ): Promise<void> {
    if (visitedUrls.has(url)) return;

    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        await page.goto(url, {
          waitUntil: "networkidle0",
          timeout: 30000,
        });
        visitedUrls.add(url);
        break;
      } catch (error) {
        retryCount++;
        if (retryCount === maxRetries) throw error;
        await this.delay(2000 * retryCount);
      }
    }

    const hasCaptcha = await page.evaluate(() => {
      return (
        document.body.textContent?.toLowerCase().includes("captcha") ||
        document.body.innerHTML.toLowerCase().includes("recaptcha")
      );
    });

    if (hasCaptcha) {
      throw new Error("Captcha tespit edildi, scraping yapılamıyor");
    }
  }

  private async extractPageContent(page: Page): Promise<string> {
    const metadata = await page.evaluate(() => {
      const getMetaContent = (selector: string): string =>
        document.querySelector(selector)?.getAttribute("content") || "";

      const filterSensitiveData = (text: string): string => {
        return text.replace(/[^\w\s@.-]/g, "").trim();
      };

      return {
        title: filterSensitiveData(document.title),
        metaDescription: filterSensitiveData(
          getMetaContent('meta[name="description"]')
        ),
        metaKeywords: filterSensitiveData(
          getMetaContent('meta[name="keywords"]')
        ),
        ogTitle: filterSensitiveData(
          getMetaContent('meta[property="og:title"]')
        ),
        ogDescription: filterSensitiveData(
          getMetaContent('meta[property="og:description"]')
        ),
      } as PageMetadata;
    });

    const logoUrl = await page.evaluate(() => {
      const logoImg = document.querySelector(
        'img[alt*="logo" i], img[src*="logo" i], a img'
      ) as HTMLImageElement;
      return logoImg?.src || "";
    });

    const contactInfo = await page.evaluate(() => {
      const text = document.body.innerText;
      const emailPattern =
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      const phonePattern =
        /(?:(?:\+|00)?[0-9]{1,3}[-. ]?)?\(?[0-9]{3}\)?[-. ]?[0-9]{3}[-. ]?[0-9]{2,4}/g;

      const emails = [...new Set(text.match(emailPattern) || [])];
      const phones = [...new Set(text.match(phonePattern) || [])];

      document.querySelectorAll('a[href^="mailto:"]').forEach((el: Element) => {
        const email = el.getAttribute("href")?.replace("mailto:", "");
        if (email) emails.push(email);
      });

      document.querySelectorAll('a[href^="tel:"]').forEach((el: Element) => {
        const phone = el.getAttribute("href")?.replace("tel:", "");
        if (phone) phones.push(phone);
      });

      return {
        emails: [...new Set(emails)],
        phones: [...new Set(phones)],
      } as ContactInfo;
    });

    const socialLinks = await page.evaluate(() => {
      const links: string[] = [];
      document
        .querySelectorAll(
          'a[href*="facebook.com"], a[href*="twitter.com"], a[href*="instagram.com"], a[href*="linkedin.com"], a[href*="youtube.com"]'
        )
        .forEach((el: Element) => {
          const href = el.getAttribute("href");
          if (href) links.push(href);
        });
      return [...new Set(links)];
    });

    const addressInfo = await page.evaluate(() => {
      const addresses: string[] = [];

      const mapsElements = document.querySelectorAll(
        'iframe[src*="google.com/maps"], iframe[src*="maps.google.com"], a[href*="maps.google.com"], a[href*="google.com/maps"]'
      );

      mapsElements.forEach((el: Element) => {
        const src = el.getAttribute("src") || el.getAttribute("href") || "";

        const placeMatch = src.match(/(?:place|q|query)=([^&]+)/);
        const coordsMatch = src.match(/(?:@|ll=)([-\d.]+),([-\d.]+)/);

        if (placeMatch) {
          const place = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
          addresses.push(place);
        }

        let parent = el.parentElement;
        for (let i = 0; i < 5 && parent; i++) {
          const text = parent.textContent?.trim();
          if (text && text.length > 10 && text.length < 200) {
            addresses.push(text);
          }
          parent = parent.parentElement;
        }
      });

      const contactSelectors = [
        ".contact-info",
        ".contact-details",
        ".address",
        ".location",
        "#contact-address",
        "[data-address]",
        ".footer-address",
        ".office-address",
        "address",
        ".contact-section address",
        ".contact-section .address",
        ".contact-box",
        ".contact-info-box",
      ];

      contactSelectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {
          const text = el.textContent?.trim();
          if (text && text.length > 10 && text.length < 200) {
            addresses.push(text);
          }
        });
      });

      const addressKeywords = [
        "adres",
        "address",
        "location",
        "konum",
        "ofis",
        "office",
        "merkez",
        "headquarters",
      ];
      document.querySelectorAll("p, div, span").forEach((el: Element) => {
        const text = el.textContent?.trim() || "";
        if (
          text.length > 10 &&
          text.length < 200 &&
          addressKeywords.some((keyword) =>
            text.toLowerCase().includes(keyword)
          )
        ) {
          addresses.push(text);
        }
      });

      document
        .querySelectorAll(
          "[data-address], [data-location], [data-venue], [data-office]"
        )
        .forEach((el: Element) => {
          const addr =
            el.getAttribute("data-address") ||
            el.getAttribute("data-location") ||
            el.getAttribute("data-venue") ||
            el.getAttribute("data-office");
          if (addr) addresses.push(addr);
        });

      return [...new Set(addresses)];
    });

    return `
Page Title: ${metadata.title}
OG Title: ${metadata.ogTitle}
Meta Description: ${metadata.metaDescription}
OG Description: ${metadata.ogDescription}
Meta Keywords: ${metadata.metaKeywords}

Logo URL: ${logoUrl}

Found Emails: ${contactInfo.emails.join(", ")}
Found Phones: ${contactInfo.phones.join(", ")}

Social Media Links:
${socialLinks.join("\n")}

Found Addresses:
${addressInfo.join("\n")}
    `.trim();
  }

  private sanitizeText(text: string): string {
    text = text.replace(
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
      "[FILTERED]"
    );
    text = text.replace(/\b\d{11}\b/g, "[FILTERED]");
    text = text.replace(
      /\b(password|şifre|tc|tckn)\b[:=]\s*\S+/gi,
      "[FILTERED]"
    );
    return text;
  }

  private calculateAddressScore(text: string): number {
    let score = 0;

    if (/kolektif\s+house/i.test(text)) score += 5;
    if (/ataşehir/i.test(text)) score += 4;

    if (/\b\d{5}\b/.test(text)) score += 3;

    if (/mahalle|sokak|cadde|plaza|kule/i.test(text)) score += 2;

    if (/no|kat|daire|blok/i.test(text)) score += 2;

    if (/istanbul|ankara|izmir|bursa|antalya/i.test(text)) score += 2;

    if (/[,.:]/g.test(text)) score += 1;
    if (/\d+/g.test(text)) score += 1;

    return score;
  }

  async analyzeWebsite(url: string): Promise<FormData> {
    try {
      const { content: websiteContent, foundUrls } = await this.scrapeWebsite(
        url
      );
      let socialLinks: string[] = [];

      try {
        const browser = await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: "networkidle0" });

        socialLinks = await page.evaluate(() => {
          const links: string[] = [];
          document
            .querySelectorAll(
              'a[href*="facebook.com"], a[href*="twitter.com"], a[href*="instagram.com"], a[href*="linkedin.com"], a[href*="youtube.com"]'
            )
            .forEach((el: Element) => {
              const href = el.getAttribute("href");
              if (href) links.push(href);
            });
          return [...new Set(links)];
        });

        await browser.close();
      } catch (error) {
        console.error("Social media scraping error:", error);
      }

      const prompt = `You are an AI assistant specialized in analyzing website content. Analyze the following website content and extract company information.

Instructions:
1. Carefully examine the provided website content, especially the 'Found Addresses' section and contact information
2. Look for company information in all sections including meta data, page content, and contact sections
3. Extract and format the following details:
   - companyName: Extract from title, OG title, or about section. Remove common suffixes like "Inc.", "Ltd." unless they're integral to the name
   - companyEmail: IMPORTANT - Look for ALL email addresses in contact section, footer, and throughout the content. Include ALL found emails separated by commas
   - companyPhone: IMPORTANT - Look for ALL phone numbers in contact section, footer, and throughout the content. Format them properly and include ALL found numbers separated by commas
   - companyWebsite: Use the provided URL (base domain without path)
   - companyAddress: CRITICAL - Look in 'Found Addresses' section first, then contact section and footer. If multiple addresses found, use the most complete and relevant one
   - companyInfo: Write a PROFESSIONAL and FORMAL 2-3 sentence company description focusing on their core business, main offerings, and market position. Write in third person, present tense, and avoid phrases like "appears to be" or "seems to". Example: "[Company] is a leading provider of [services/products] specializing in [focus area]. The company delivers [key offerings] to [target market]."
   - detailedDescription: Write a COMPREHENSIVE and FORMAL 4-5 paragraph company description that includes:
     * Paragraph 1: Company overview and core business
     * Paragraph 2: Products and services in detail
     * Paragraph 3: Market focus and target audience
     * Paragraph 4: Company strengths and unique value propositions
     Write in third person, present tense, using professional business language. DO NOT use uncertain language like "appears to be" or "seems to". DO NOT mention the source of information or make observations about missing information.
   - companyType: Based on the content, determine if it's 'Enterprise', 'Entrepreneur', 'Investor', or 'Startup'
   - businessModel: Based on their customer focus, determine if it's 'B2B', 'B2C', 'B2G', 'C2C', 'C2B', 'D2C', or 'B2B2C'
   - companySector: Determine their main industry sector
   - companySize: Based on any employee information, determine size ('1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10001+')

4. IMPORTANT NOTES:
   - DO NOT leave fields empty if information can be found or reasonably inferred from the content
   - Write descriptions in a professional, authoritative tone without speculative language
   - If multiple contact details found (emails, phones), include ALL of them
   - Make educated guesses for companyType, businessModel, and companySector based on the content
   - Use proper formatting and separate multiple items with commas
   - NEVER include phrases like "based on the content", "appears to be", "seems to", or any other uncertain language
   - Write as if you are creating official company documentation

5. Return ONLY a JSON object with these exact field names
6. If information is truly not found, use empty string ("")

Website Content:
${websiteContent}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = this.cleanJsonString(response.text());

      try {
        const parsed = JSON.parse(text);
        const websiteUrl = new URL(url).origin;

        return {
          companyName: parsed.companyName?.trim() || "",
          companyEmail: parsed.companyEmail?.trim() || "",
          companyPhone: parsed.companyPhone?.trim() || "",
          companyWebsite: parsed.companyWebsite || websiteUrl,
          companyAddress: parsed.companyAddress?.trim() || "",
          companyInfo: parsed.companyInfo?.trim() || "",
          detailedDescription: parsed.detailedDescription?.trim() || "",
          companyType: parsed.companyType || "",
          businessModel: parsed.businessModel || "",
          companySector: parsed.companySector || "",
          companySize: parsed.companySize || "",
          companyLinkedIn: socialLinks.find((link: string) => link.includes("linkedin.com")) || "",
          companyTwitter: socialLinks.find((link: string) => link.includes("twitter.com")) || "",
          companyInstagram: socialLinks.find((link: string) => link.includes("instagram.com")) || "",
        };
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        console.error("Received text:", text);
        throw new Error("AI response is not in JSON format");
      }
    } catch (error) {
      console.error("Website analysis error:", error);
      throw error;
    }
  }

  async analyzeDocument(documentText: string): Promise<FormData> {
    try {
      const prompt = `You are an AI assistant specialized in extracting company information from documents. Your task is to thoroughly analyze the given text and extract all relevant company details according to these specific fields:

Instructions:
1. Carefully examine the entire text
2. Extract the following details:
   - companyName: Company name (required)
   - companyEmail: Business email address (required)
   - companyPhone: Contact phone number (required)
   - companyWebsite: Website URL
   - companyAddress: Physical address (required)
   - companyInfo: Brief company information
   - detailedDescription: Detailed company description
   - companyType: Try to determine if it's 'Enterprise', 'Entrepreneur', 'Investor', or 'Startup'
   - businessModel: Try to determine if it's 'B2B', 'B2C', 'B2G', 'C2C', 'C2B', 'D2C', or 'B2B2C'
   - companySector: Main industry or sector
   - companySize: Try to determine company size ('1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10001+')
3. Return ONLY a JSON object with these exact field names
4. If information is not found, use empty string ("")

Text to analyze:
${documentText}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = this.cleanJsonString(response.text());

      try {
        const parsed = JSON.parse(text);
        return {
          companyName: parsed.companyName?.trim() || "",
          companyEmail: parsed.companyEmail?.trim() || "",
          companyPhone: parsed.companyPhone?.trim() || "",
          companyWebsite: parsed.companyWebsite?.trim() || "",
          companyAddress: parsed.companyAddress?.trim() || "",
          companyInfo: parsed.companyInfo?.trim() || "",
          detailedDescription: parsed.detailedDescription?.trim() || "",
          companyType: parsed.companyType || "",
          businessModel: parsed.businessModel || "",
          companySector: parsed.companySector || "",
          companySize: parsed.companySize || "",
          companyLinkedIn: parsed.companyLinkedIn?.trim() || "",
          companyTwitter: parsed.companyTwitter?.trim() || "",
          companyInstagram: parsed.companyInstagram?.trim() || "",
        };
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
      const prompt = `Analyze this LinkedIn profile and extract company information according to these specific fields:

Instructions:
1. Carefully examine the LinkedIn profile content
2. Extract the following details:
   - companyName: Company name (required)
   - companyEmail: Business email address (required)
   - companyPhone: Contact phone number (required)
   - companyWebsite: Website URL
   - companyAddress: Physical address (required)
   - companyInfo: Brief company information
   - detailedDescription: Detailed company description
   - companyType: Try to determine if it's 'Enterprise', 'Entrepreneur', 'Investor', or 'Startup'
   - businessModel: Try to determine if it's 'B2B', 'B2C', 'B2G', 'C2C', 'C2B', 'D2C', or 'B2B2C'
   - companySector: Main industry or sector
   - companySize: Try to determine company size ('1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10001+')
3. Return ONLY a JSON object with these exact field names
4. If information is not found, use empty string ("")

Profile: ${linkedInData}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = this.cleanJsonString(response.text());

      try {
        const parsed = JSON.parse(text);
        return {
          companyName: parsed.companyName?.trim() || "",
          companyEmail: parsed.companyEmail?.trim() || "",
          companyPhone: parsed.companyPhone?.trim() || "",
          companyWebsite: parsed.companyWebsite?.trim() || "",
          companyAddress: parsed.companyAddress?.trim() || "",
          companyInfo: parsed.companyInfo?.trim() || "",
          detailedDescription: parsed.detailedDescription?.trim() || "",
          companyType: parsed.companyType || "",
          businessModel: parsed.businessModel || "",
          companySector: parsed.companySector || "",
          companySize: parsed.companySize || "",
          companyLinkedIn: parsed.companyLinkedIn?.trim() || "",
          companyTwitter: parsed.companyTwitter?.trim() || "",
          companyInstagram: parsed.companyInstagram?.trim() || "",
        };
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
