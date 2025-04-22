// @ts-nocheck - Typescript hatalarını görmezden gel
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import puppeteer, { ElementHandle, Page } from "puppeteer";

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not defined in environment variables");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Özel hata sınıfları
export class RobotsDisallowedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RobotsDisallowedError";
  }
}

interface FormData {
  companyName: string;
  companyLogo?: string;
  companyType?: "Business" | "Investor" | "Startup";
  openForInvestments?: boolean;
  businessModel?: "B2B" | "B2C" | "B2G" | "C2C" | "C2B" | "D2C" | "B2B2C";
  companySector?: string;
  companySize?:
  | "1-10"
  | "11-50"
  | "51-200"
  | "201-500"
  | "501-1000"
  | "1001-5000"
  | "5001-10000"
  | "10001+";
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
  productName: string;
  productLogo?: string;
  productCategory: string;
  productDescription: string;
  tags: string[];
  problems: string[];
  solutions: string[];
  improvements: string[];
  keyFeatures: string[];
  pricingModel: string;
  releaseDate?: string;
  productPrice?: number;
  productWebsite?: string;
  productLinkedIn?: string;
  productTwitter?: string;
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
  private chatModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  private cleanJsonString(text: string): string {
    text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    text = text.trim();
    return text;
  }

  private validateUrl(url: string): string {
    // Boşlukları kırp
    let formattedUrl = url.trim();

    // Eğer "www." ile başlıyorsa başına https:// ekle
    if (formattedUrl.toLowerCase().startsWith("www.")) {
      formattedUrl = "https://" + formattedUrl;
    }
    // Eğer http:// veya https:// ile başlamıyorsa yine https:// ekle
    else if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = "https://" + formattedUrl;
    }

    try {
      const parsedUrl = new URL(formattedUrl);
      // Domain kontrolü (en az bir nokta içermeli)
      if (!parsedUrl.hostname.includes(".")) {
        throw new Error("Geçersiz domain");
      }
      return formattedUrl;
    } catch (err) {
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
        throw new RobotsDisallowedError(
          "Bu site robots.txt tarafından engellenmiş"
        );
      }

      // Her sayfa için yeni bir tarayıcı örneği oluşturuyoruz
      // Bu, tarayıcı ve sayfa arasındaki bağlantı sorunlarını azaltır
      for (let attempt = 0; attempt < 2; attempt++) {
        let browser = null;
        try {
          browser = await puppeteer.launch({
            headless: true,
            args: [
              "--no-sandbox",
              "--disable-setuid-sandbox",
              "--disable-dev-shm-usage",
              "--disable-gpu",
            ],
          });

          console.log("Browser launched");

          // Ana sayfayı tara
          const page = await browser.newPage();
          await page.setUserAgent(
            "Mozilla/5.0 (compatible; AIKUBot/1.0; +https://aiku.com/bot)"
          );

          try {
            // Ana sayfayı tara
            await this.scrapePage(page, url, visitedUrls);
            const mainContent = await this.extractPageContent(page);
            allContent += mainContent;

            // Alt sayfaları bul
            const subPages = await this.findSubPages(page);

            // Alt sayfa sayısını sınırla - en fazla 2 alt sayfa ziyaret edelim (sayıyı azalttık)
            const maxSubPages = 2;
            const limitedSubPages = subPages.slice(0, maxSubPages);

            // Alt sayfaları tek tek tarayalım, her biri için ayrı sayfa nesnesi kullanalım
            for (const subPath of limitedSubPages) {
              try {
                const fullUrl = subPath.startsWith("http")
                  ? subPath
                  : new URL(subPath, baseUrl).href;

                // Aynı domain'de olduğundan emin ol
                if (!fullUrl.startsWith(baseUrl)) continue;

                // Daha önce ziyaret edilmediyse tara
                if (!visitedUrls.has(fullUrl)) {
                  await this.delay(1000); // Rate limiting - süreyi biraz daha azalttık

                  // Her alt sayfa için yeni bir sayfa nesnesi oluştur
                  const subPage = await browser.newPage();
                  try {
                    await this.scrapePage(subPage, fullUrl, visitedUrls);
                    allContent += "\n\n--- " + fullUrl + " ---\n";
                    allContent += await this.extractPageContent(subPage);
                    foundUrls.push(fullUrl);
                  } catch (subError) {
                    console.warn(`Alt sayfa tarama hatası (${fullUrl}):`, subError);
                  } finally {
                    await subPage.close().catch(e => console.warn("Alt sayfa kapatma hatası:", e));
                  }
                }
              } catch (error) {
                console.warn("Alt sayfa işleme hatası:", error);
                continue;
              }
            }

            // İşlem başarılı - döngüden çık
            await page.close().catch(e => console.warn("Ana sayfa kapatma hatası:", e));
            return {
              content: this.sanitizeText(allContent),
              foundUrls,
            };
          } catch (pageError) {
            console.error("Sayfa işleme hatası:", pageError);
            await page.close().catch(e => console.warn("Hata sonrası sayfa kapatma hatası:", e));
            // İlk denemede hata olursa, ikinci denemeye geç
            if (attempt === 0) {
              console.log("İlk deneme başarısız oldu, tekrar deneniyor...");
              continue;
            } else {
              throw pageError;
            }
          }
        } catch (browserError) {
          console.error("Tarayıcı hatası:", browserError);
          throw browserError;
        } finally {
          if (browser) {
            await browser.close().catch(e => console.warn("Tarayıcı kapatma hatası:", e));
          }
        }
      }

      // Her iki denemede de başarısız olursa buraya ulaşır
      throw new Error("Web sitesi içeriği alınamadı: Maksimum deneme sayısı aşıldı");
    } catch (error) {
      console.error("Web scraping error:", error);
      // Robots.txt hatasını yeniden fırlat, diğer hataları genel hata olarak fırlat
      if (error instanceof RobotsDisallowedError) {
        throw error;
      }
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

    // İstek engellemesini daha güvenli bir şekilde yapılandır
    try {
      // İstek engellemesini ayarla
      await page.setRequestInterception(true);

      // Event listener'ı temizlemek için referans sakla
      const requestHandler = (req: any) => {
        const resourceType = req.resourceType();

        // Gereksiz kaynakları engelle ama kritik içeriği engelleme
        if (resourceType === 'image' || resourceType === 'font' ||
          resourceType === 'media' || resourceType === 'stylesheet') {
          req.abort();
        } else {
          req.continue();
        }
      };

      // İstek dinlemeyi ekle
      page.on('request', requestHandler);

      while (retryCount < maxRetries) {
        try {
          // Timeout süresini artır ve daha basit waitUntil stratejisi kullan
          await page.goto(url, {
            waitUntil: "domcontentloaded",
            timeout: 45000, // 60 saniyeden 45 saniyeye düşürdük - daha makul bir değer
          });

          // Sayfa yüklendikten sonra kısa bir bekleme
          await this.delay(1000);

          visitedUrls.add(url);
          break;
        } catch (error) {
          console.log(`Retry ${retryCount + 1}/${maxRetries} for ${url}: ${error.message}`);
          retryCount++;
          if (retryCount === maxRetries) throw error;
          await this.delay(1500 * retryCount);
        }
      }

      // İstek dinlemeyi temizle - removeListener yerine off kullanıyoruz
      try {
        // Bazı Puppeteer sürümleri removeListener, bazıları off kullanır
        if (typeof page.off === 'function') {
          page.off('request', requestHandler);
        } else if (typeof (page as any).removeListener === 'function') {
          (page as any).removeListener('request', requestHandler);
        }
        // Her durumda request interception'ı kapatmayı dene
        await page.setRequestInterception(false).catch(() => { });
      } catch (cleanupError) {
        console.warn("Olay dinleyici temizleme hatası:", cleanupError);
        // Yine de devam et - kritik bir hata değil
      }

      // CAPTCHA tespiti
      try {
        const hasCaptcha = await page.evaluate(() => {
          return (
            document.body.textContent?.toLowerCase().includes("captcha") ||
            document.body.innerHTML.toLowerCase().includes("recaptcha")
          );
        });

        if (hasCaptcha) {
          throw new Error("Captcha tespit edildi, scraping yapılamıyor");
        }
      } catch (evalError) {
        // Sayfa içeriği değerlendirme hatası - muhtemelen sayfa yüklenemedi
        console.warn("CAPTCHA kontrolü yapılamadı:", evalError);
        // Kritik bir hata değil, devam et
      }
    } catch (error) {
      // İstek engelleme hatası olduysa, temizlemeyi dene
      try {
        await page.setRequestInterception(false).catch(() => { });
      } catch (cleanupError) {
        console.warn("İstek engelleme temizleme hatası:", cleanupError);
      }
      throw error;
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
      // Logo bulmak için tüm olası seçicileri kontrol et
      const logoSelectors = [
        // Alt veya src içinde "logo" geçen resimler
        'img[alt*="logo" i]',
        'img[src*="logo" i]',
        // Header, navbar veya footer içindeki resimler (genelde logo olur)
        "header img",
        "nav img",
        ".navbar img",
        ".header img",
        ".logo img",
        ".site-logo img",
        ".brand img",
        ".brand-logo img",
        "a.logo img",
        "a.brand img",
        ".footer .logo img",
        // Logo sınıfı olan elemanlar
        ".logo img",
        ".site-logo",
        ".company-logo",
        ".brand-logo",
        // Link içindeki logoları da bul
        'a[href="/"] img',
        'a[href="./"] img',
        'a[href="../"] img',
        // Ana sayfaya link veren logoyu bul
        'a[href="#home"] img',
        // SVG logoları
        "svg.logo",
        // Genel olarak ilk img tag'i
        "header a img",
        // Son çare olarak sayfadaki ilk resim
        "a img",
      ];

      // Tüm seçicileri dene
      for (const selector of logoSelectors) {
        const element = document.querySelector(selector) as
          | HTMLImageElement
          | SVGElement;
        if (element) {
          // Eğer HTMLImageElement ise src değerini al
          if ("src" in element && element.src) {
            return element.src;
          }
          // SVG olabilir, o zaman outerHTML'i dön
          else if (element instanceof SVGElement) {
            return `data:image/svg+xml;base64,${btoa(element.outerHTML)}`;
          }
        }
      }

      return "";
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
      let logoUrl = ""; // Logo URL'sini saklamak için değişken

      try {
        const browser = await puppeteer.launch({
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: "networkidle0" });

        // Logo URL'sini çek
        logoUrl = await page.evaluate(() => {
          // Logo bulmak için tüm olası seçicileri kontrol et
          const logoSelectors = [
            'img[alt*="logo" i]',
            'img[src*="logo" i]',
            "header img",
            "nav img",
            ".navbar img",
            ".header img",
            ".logo img",
            ".site-logo img",
            ".brand img",
            ".brand-logo img",
            "a.logo img",
            "a.brand img",
            ".footer .logo img",
            ".logo img",
            ".site-logo",
            ".company-logo",
            ".brand-logo",
            'a[href="/"] img',
            'a[href="./"] img',
            'a[href="../"] img',
            'a[href="#home"] img',
            "svg.logo",
            "header a img",
            "a img",
          ];

          for (const selector of logoSelectors) {
            const element = document.querySelector(selector) as
              | HTMLImageElement
              | SVGElement;
            if (element) {
              if ("src" in element && element.src) {
                return element.src;
              } else if (element instanceof SVGElement) {
                return `data:image/svg+xml;base64,${btoa(element.outerHTML)}`;
              }
            }
          }

          return "";
        });

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
   - companyInfo: Write a PROFESSIONAL and FORMAL 2-3 sentence company description focusing on their core business, main offerings, and market position. Write in third person, present tense, and avoid phrases like "appears to be" or "seems to". Example: "[Company] is a leading provider of [services/products] specializing in [focus area]. The company delivers [key offerings] to [target market]." Limit your answer to a maximum of 500 characters.
   - detailedDescription: Write a COMPREHENSIVE and FORMAL 4-5 paragraph company description that includes:
     * Paragraph 1: Company overview and core business
     * Paragraph 2: Products and services in detail
     * Paragraph 3: Market focus and target audience
     * Paragraph 4: Company strengths and unique value propositions
     Write in third person, present tense, using professional business language. DO NOT use uncertain language like "appears to be" or "seems to". DO NOT mention the source of information or make observations about missing information. Limit your answer to a maximum of 3000 characters.
   - companyType: Based on the content, determine if it's 'Business', 'Investor', or 'Startup'
   - businessModel: Based on their customer focus, determine if it's 'B2B', 'B2C', 'B2G', 'C2C', 'C2B', 'D2C', or 'B2B2C'
   - companySector: Determine their main industry sector
   - companySize: Based on any employee information, determine size ('1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10001+')
   - productName: The name of the product.
   - productLogo: The URL of the product logo.
   - productCategory: The category of the product.
   - productDescription: A short description of the product. Limit your answer to a maximum of 500 characters.
   - detailedDescription: A detailed, multi-paragraph description of the product. Limit your answer to a maximum of 3000 characters.
   - tags: This field should contain short, descriptive keywords or labels that summarize the product. **Return as a JSON array. If no tags are found, return an empty array []**
   - problems: This field should list the issues or challenges that the product aims to solve. For example, include problems like "high energy consumption", "inefficient workflow", "lack of user engagement", etc. **Return as a JSON array. If no problems are found, return an empty array []**
   - solutions: This field should detail the solutions or approaches the product offers to address the identified problems. For example, include solutions like "automated process optimization", "real-time analytics", "cloud-based data management", etc. **Return as a JSON array. If no solutions are found, return an empty array []**
   - improvements: This field should list potential improvements or areas where the product could be enhanced. For example, include suggestions like "enhanced UI design", "faster processing speed", "improved security features", etc. **Return as a JSON array. If no improvements are found, return an empty array []**
   - keyFeatures: This field should include the product's standout features or primary benefits. For example, include key features like "intuitive interface", "high scalability", "robust performance", "seamless integration", etc. **Return as a JSON array. If no key features are found, return an empty array []**
   - pricingModel: The pricing model (e.g., Free, Freemium, Subscription, One-time Payment, Other).
   - releaseDate: The release date in YYYY-MM-DD format. 
   - productPrice: The price if mentioned, otherwise an empty string.
   - productWebsite: The product website URL.
   - productLinkedIn: The product's LinkedIn URL if available.
  - productTwitter: The product's Twitter URL if available.

4. IMPORTANT NOTES:
   - DO NOT leave fields empty if information can be found or reasonably inferred from the content
   - Write descriptions in a professional, authoritative tone without speculative language
   - If multiple contact details found (emails, phones), include ALL of them
   - Make educated guesses for companyType, businessModel, and companySector based on the content
   - Use proper formatting and separate multiple items with commas
   - NEVER include phrases like "based on the content", "appears to be", "seems to", or any other uncertain language
   - Write as if you are creating official company documentation
   - If information is truly not found, return an empty string ("") for text fields and an empty array ([]) for array fields

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
          companyLogo: logoUrl, // Çekilen logo URL'sini ekle
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
          companyLinkedIn:
            socialLinks.find((link: string) => link.includes("linkedin.com")) ||
            "",
          companyTwitter:
            socialLinks.find((link: string) => link.includes("twitter.com")) ||
            "",
          companyInstagram:
            socialLinks.find((link: string) =>
              link.includes("instagram.com")
            ) || "",
          productName: parsed.productName || "",
          productLogo: parsed.productLogo || "",
          productCategory: parsed.productCategory || "",
          productDescription: parsed.productDescription || "",
          tags: parsed.tags || [],
          problems: parsed.problems || [],
          solutions: parsed.solutions || [],
          improvements: parsed.improvements || [],
          keyFeatures: parsed.keyFeatures || [],
          pricingModel: parsed.pricingModel || "",
          releaseDate: parsed.releaseDate || "",
          productPrice: parsed.productPrice || 0,
          productWebsite: parsed.productWebsite || url,
          productLinkedIn: parsed.productLinkedIn || "",
          productTwitter: parsed.productTwitter || "",
        };
      } catch (parseError) {
        console.error("JSON parse error:", parseError);
        console.error("Received text:", text);
        throw new Error("AI response is not in JSON format");
      }
    } catch (error) {
      console.error("Website analysis error:", error);
      // Özel hata türlerini kontrol et ve doğrudan ilet
      if (error instanceof RobotsDisallowedError) {
        throw error;
      }
      throw error;
    }
  }

  async analyzeDocument(documentText: string): Promise<FormData> {
    try {
      const prompt = `You are an AI assistant specialized in extracting company information from documents. Your task is to thoroughly analyze the given text and extract all relevant company details according to these specific fields:

Instructions:
1. Carefully examine the entire text, including contact sections and social media references
2. Extract and format the following details:
   - companyName: Company name without any suffixes
   - companyEmail: IMPORTANT - Extract ALL email addresses found in the text, separate them with commas
   - companyPhone: Extract ALL phone numbers if present
   - companyWebsite: Extract website URL if mentioned, or construct from email domain (e.g., if email is @alohalive.online, use alohalive.online)
   - companyAddress: Extract physical address if present
   - companyInfo: Write a PROFESSIONAL and FORMAL 2-3 sentence company description focusing on their core business, main offerings, and market position. Write in third person, present tense. Example: "[Company] is a leading provider of [services/products] specializing in [focus area]. The company delivers [key offerings] to [target market]."
   - detailedDescription: Write a COMPREHENSIVE and FORMAL 4-5 paragraph company description that includes:
     * Paragraph 1: Company overview and core business
     * Paragraph 2: Products and services in detail
     * Paragraph 3: Market focus and target audience
     * Paragraph 4: Company strengths and unique value propositions
     Write in third person, present tense, using professional business language.
   - companyType: MUST be one of: 'Business', 'Investor', or 'Startup' - Look for explicit mentions or infer from context
   - businessModel: MUST be one of: 'B2B', 'B2C', 'B2G', 'C2C', 'C2B', 'D2C', or 'B2B2C' - Look for explicit mentions or infer from target audience
   - companySector: Main industry sector(s)
   - companySize: MUST be one of: '1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10001+' - Infer from context if not explicitly stated

3. IMPORTANT RULES:
   - For emails: Include ALL email addresses found in the text
   - For website: If not explicitly mentioned, construct from email domain
   - For social media: Look for mentions of LinkedIn, Twitter, Instagram, etc.
   - Write descriptions in a professional, authoritative tone
   - NEVER use uncertain language like "appears to be" or "seems to"
   - If a field is mentioned in the text (even briefly), it MUST be captured
   - For companySize, if team is mentioned as "dynamic" or "startup", default to '1-10' unless stated otherwise

4. Return ONLY a JSON object with these exact field names
5. If information is truly not found, use empty string ("")

Text to analyze:
${documentText}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = this.cleanJsonString(response.text());

      try {
        const parsed = JSON.parse(text);

        // Extract domain from email if website is empty
        let website = parsed.companyWebsite?.trim() || "";
        if (!website && parsed.companyEmail) {
          const emailDomain = parsed.companyEmail.split("@")[1]?.split(",")[0];
          if (emailDomain) {
            website = `https://${emailDomain}`;
          }
        }

        // Extract social media URLs from text
        const linkedInMatch = documentText.match(/linkedin\.com\/[^\s,\n]+/);
        const twitterMatch = documentText.match(/twitter\.com\/[^\s,\n]+/);
        const instagramMatch = documentText.match(/instagram\.com\/[^\s,\n]+/);

        // @ts-expect-error - FormData tipinde tüm gerekli alanlar karşılanmamaktadır
        return {
          companyName: parsed.companyName?.trim() || "",
          companyEmail: parsed.companyEmail?.trim() || "",
          companyPhone: parsed.companyPhone?.trim() || "",
          companyWebsite: website,
          companyAddress: parsed.companyAddress?.trim() || "",
          companyInfo: parsed.companyInfo?.trim() || "",
          detailedDescription: parsed.detailedDescription?.trim() || "",
          companyType: parsed.companyType || "",
          businessModel: parsed.businessModel || "",
          companySector: parsed.companySector || "",
          companySize: parsed.companySize || "",
          companyLogo: "", // Dokümandan logo çekilemeyeceği için boş
          companyLinkedIn: linkedInMatch
            ? `https://www.${linkedInMatch[0]}`
            : "",
          companyTwitter: twitterMatch ? `https://www.${twitterMatch[0]}` : "",
          companyInstagram: instagramMatch
            ? `https://www.${instagramMatch[0]}`
            : "",
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

  async analyzeLinkedIn(linkedInData: any): Promise<FormData> {
    try {
      // LinkedIn verilerini daha okunabilir bir formata dönüştürme
      const userData = linkedInData?.data?.user;
      if (!userData) {
        throw new Error("LinkedIn kullanıcı verisi bulunamadı");
      }

      const prompt = `Analyze this LinkedIn user data and create a professional company profile:

User Information:
- Full Name: ${userData.firstName} ${userData.lastName}
- Email: ${userData.email}
- LinkedIn Profile: ${userData.linkedin}
- Location: ${userData.locale?.country || "Not specified"}

Instructions:
1. Create a professional company profile based on this individual's information
2. Assume this person is an entrepreneur or business professional
3. Format the response as a company profile with these fields:
   - companyName: Create a professional company name using the person's name (e.g., "[Last Name] Consulting" or "[Full Name] Ventures")
   - companyEmail: Use the provided email
   - companyPhone: Leave empty if not provided
   - companyWebsite: Leave empty if not provided
   - companyAddress: Use the country information if available
   - companyInfo: Write a brief, professional description focusing on individual expertise
   - detailedDescription: Create a detailed professional profile
   - companyType: Most likely 'Entrepreneur' unless other information suggests otherwise
   - businessModel: Determine based on the profile context
   - companySector: Determine based on the profile context
   - companySize: Most likely '1-10' unless other information suggests otherwise
   - companyLinkedIn: Use the provided LinkedIn profile URL

4. Return ONLY a JSON object with these exact field names
5. If information is not found, use empty string ("")`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = this.cleanJsonString(response.text());

      try {
        const parsed = JSON.parse(text);
        return {
          ...parsed,
          companyLogo: userData.profilePictureUrl || "", // Kullanıcı profil resmini logo olarak kullan
          companyLinkedIn: userData.linkedin || "",
          companyEmail: userData.email || "",
          companyName:
            parsed.companyName?.trim() ||
            `${userData.firstName} ${userData.lastName}`,
          companyPhone: parsed.companyPhone?.trim() || "",
          companyWebsite: parsed.companyWebsite?.trim() || "",
          companyAddress:
            parsed.companyAddress?.trim() || userData.locale?.country || "",
          companyInfo: parsed.companyInfo?.trim() || "",
          detailedDescription: parsed.detailedDescription?.trim() || "",
          companyType: parsed.companyType || "Entrepreneur",
          businessModel: parsed.businessModel || "",
          companySector: parsed.companySector || "",
          companySize: parsed.companySize || "1-10",
          companyTwitter: parsed.companyTwitter?.trim() || "",
          companyInstagram: parsed.companyInstagram?.trim() || "",
        };
      } catch (parseError) {
        console.error("JSON ayrıştırma hatası:", parseError);
        console.error("Alınan metin:", text);
        throw new Error("AI yanıtı JSON formatında değil");
      }
    } catch (error) {
      console.error("Gemini API hatası:", error);
      throw error;
    }
  }

  // Verilen URL'den slayt oluşturmak için yeni metot
  async createPresentationFromWebsite(url: string): Promise<any> {
    try {
      // Önce web sitesini scrape et
      const scrapeResult = await this.scrapeWebsite(url);

      // Web sitesinden önce genel bilgileri analiz edelim
      const companyData = await this.analyzeWebsite(url);

      // Web sitesinin domain adını al
      const parsedUrl = new URL(url);
      const domain = parsedUrl.hostname;

      // Web sitesinden logo URL'sini almaya çalış
      const logoUrl = await this.extractLogoFromWebsite(url);

      // CompanyData'dan önemli bilgileri string olarak formatlı hale getir
      const companyInfoDetails = `
Company Name: ${companyData.companyName}
Company Type: ${companyData.companyType}
Business Model: ${companyData.businessModel}
Company Sector: ${companyData.companySector}
Company Size: ${companyData.companySize}
Company Info: ${companyData.companyInfo}
Company Email: ${companyData.companyEmail}
Company Phone: ${companyData.companyPhone}
Company Website: ${companyData.companyWebsite}
Company Address: ${companyData.companyAddress}

Product Name: ${companyData.productName}
Product Category: ${companyData.productCategory}
Product Description: ${companyData.productDescription}
Pricing Model: ${companyData.pricingModel}

Tags: ${companyData.tags ? companyData.tags.join(', ') : ''}

Problems the product solves: 
${companyData.problems ? companyData.problems.map(p => `- ${p}`).join('\n') : ''}

Solutions offered:
${companyData.solutions ? companyData.solutions.map(s => `- ${s}`).join('\n') : ''}

Key Features:
${companyData.keyFeatures ? companyData.keyFeatures.map(f => `- ${f}`).join('\n') : ''}

Potential Improvements:
${companyData.improvements ? companyData.improvements.map(i => `- ${i}`).join('\n') : ''}

Detailed Description:
${companyData.detailedDescription}

Social Media:
LinkedIn: ${companyData.companyLinkedIn}
Twitter: ${companyData.companyTwitter}
Instagram: ${companyData.companyInstagram}
      `;

      // Gemini model ile slayt içeriği oluştur
      const prompt = `
      I need you to create a professional presentation/slide content in ENGLISH based on this EXACT company information. 
      This information comes from analyzing the website, so it's highly accurate and should be prioritized over any other content.

      Website: ${domain}
      Logo URL: ${logoUrl || companyData.companyLogo || ""}
      
      DETAILED COMPANY INFORMATION: 
      ${companyInfoDetails}
      
      Please create a comprehensive presentation that includes ALL this information, structured as follows:
      1. Create a total of 7-8 slides in JSON format
      2. First slide: Cover page with company name, logo, and brief tagline
      3. Second slide: Company Overview (using companyInfo and detailedDescription)
      4. Third slide: Products and Services (focusing on productName, productCategory, productDescription)
      5. Fourth slide: Problems & Solutions (using the problems and solutions data)
      6. Fifth slide: Key Features (highlighting the key features)
      7. Sixth slide: Business Model & Market Position (using companyType, businessModel, companySector)
      8. Final slide: Contact Information (email, phone, website, social media links)
      
      IMPORTANT:
      - Use ALL the provided company information - this is real data from the company's analysis, not placeholder text
      - Write the content in a professional, concise, and engaging manner
      - Format each slide with a clear title and bulleted content where appropriate
      - Make sure ALL key information from the input data is represented in the slides
      - Each slide should be thorough but not overcrowded
      
      Output format (as a JSON array):
      [
        {
          "slide_number": 1,
          "title": "Cover Title",
          "content": "Cover content with company name and brief tagline",
          "logo": "${logoUrl || companyData.companyLogo || ""}"
        },
        {
          "slide_number": 2,
          "title": "Company Overview",
          "content": "Detailed but concise overview..."
        },
        ... (other slides as described)
      ]
      
      Remember, this presentation will be generated as a PowerPoint file, so format accordingly.
      `;

      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();

      // JSON yanıtını temizle ve ayrıştır
      const cleanedJson = this.cleanJsonString(responseText);
      try {
        const slides = JSON.parse(cleanedJson);
        return {
          success: true,
          websiteUrl: url,
          domain: domain,
          logoUrl: logoUrl || companyData.companyLogo || null,
          slides: slides,
          // Şirket bilgilerini de ekleyelim
          companyDetails: {
            companyName: companyData.companyName || "",
            companyInfo: companyData.companyInfo || "",
            companyType: companyData.companyType || "",
            businessModel: companyData.businessModel || "",
            companySector: companyData.companySector || "",
            companyEmail: companyData.companyEmail || "",
            companyPhone: companyData.companyPhone || "",
            companyAddress: companyData.companyAddress || "",
            companySize: companyData.companySize || "",
            companyWebsite: companyData.companyWebsite || "",
            socialMedia: {
              linkedin: companyData.companyLinkedIn || "",
              twitter: companyData.companyTwitter || "",
              instagram: companyData.companyInstagram || "",
            },
            productInfo: {
              productName: companyData.productName || "",
              productDescription: companyData.productDescription || "",
              productCategory: companyData.productCategory || "",
              tags: companyData.tags || [],
              problems: companyData.problems || [],
              solutions: companyData.solutions || [],
              keyFeatures: companyData.keyFeatures || [],
              pricingModel: companyData.pricingModel || "",
            },
          },
        };
      } catch (error) {
        console.error("JSON parsing error:", error);
        throw new Error("Slayt içeriği oluşturulamadı: Geçersiz JSON formatı");
      }
    } catch (error) {
      console.error("Presentation creation error:", error);
      if (error instanceof RobotsDisallowedError) {
        throw error;
      }
      throw new Error("Slayt oluşturulamadı: " + (error as Error).message);
    }
  }

  // Web sitesinden logo URL'sini çıkarmak için yardımcı metot
  private async extractLogoFromWebsite(url: string): Promise<string | null> {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      });

      try {
        const page = await browser.newPage();
        await page.setUserAgent(
          "Mozilla/5.0 (compatible; AIKUBot/1.0; +https://aiku.com/bot)"
        );

        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

        // waitForTimeout yerine Promise ile setTimeout kullanma
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Logo seçicileri - genellikle kullanılan yaygın class ve ID'ler
        const logoSelectors = [
          'img[id*="logo"]',
          'img[class*="logo"]',
          'img[alt*="logo"]',
          'img[src*="logo"]',
          'svg[id*="logo"]',
          'svg[class*="logo"]',
          ".logo img",
          "#logo img",
          "header img",
          ".header img",
          ".navbar-brand img",
          ".brand img",
          'a[class*="logo"] img',
        ];

        // Tüm seçicileri dene
        for (const selector of logoSelectors) {
          const logoElement = await page.$(selector);
          if (logoElement) {
            // Eğer img etiketi ise
            if (selector.includes("img")) {
              const src = await page.evaluate(
                (el) => el.getAttribute("src"),
                logoElement
              );
              if (src) {
                // Göreceli URL ise mutlak URL'ye çevir
                const absoluteUrl = new URL(src, url).href;
                return absoluteUrl;
              }
            }
            // Eğer SVG etiketi ise
            else if (selector.includes("svg")) {
              // SVG'nin outerHTML'ini al
              const svgHtml = await page.evaluate(
                (el) => el.outerHTML,
                logoElement
              );
              // Base64 olarak kodla
              return `data:image/svg+xml;base64,${Buffer.from(svgHtml).toString(
                "base64"
              )}`;
            }
          }
        }

        return null;
      } finally {
        await browser.close();
      }
    } catch (error) {
      console.error("Logo extraction error:", error);
      return null;
    }
  }

  /**
   * Gemini modeli ile chat yaparak sohbet fonksiyonu
   * @param message Kullanıcının mesajı
   * @param conversationHistory Önceki konuşma geçmişi (opsiyonel)
   * @returns AI'den gelen yanıt ve güncellenmiş konuşma geçmişi
   */
  async chat(message: string, conversationHistory: any[] = []): Promise<{ response: string; conversationHistory: any[] }> {
    try {
      // Aiku platform information
      const aikuWebsiteInfo = {
        "companyName": "Aiku AI Startup Platform",
        "companyLogo": "https://aikuaiplatform.com/static/media/ai-startup-logo3.01c8164f5d9593a28c2a.png",
        "companyEmail": "info@aikuaiplatform.com",
        "companyPhone": "+90 850 757 94",
        "companyWebsite": "https://aikuaiplatform.com",
        "companyAddress": "",
        "companyInfo": "Aiku AI Startup Platform brings together AI startup products. The platform serves as a central hub for various AI solutions. It positions itself within the AI startup ecosystem.",
        "detailedDescription": "Aiku AI Startup Platform is designed to aggregate AI startup products into a single, accessible platform, streamlining the discovery and integration of emerging AI technologies.\n\nThe platform simplifies access to a diverse range of AI tools and services, catering to individuals and organizations looking to leverage innovative AI solutions.\n\nBy centralizing these products, Aiku AI aims to reduce the complexities of navigating the fragmented AI market, making it easier for users to find and implement the AI solutions they need.\n\nAiku AI Startup Platform focuses on providing a convenient and efficient way to explore the AI landscape, facilitating collaboration and innovation within the AI startup community.",
        "companyType": "Startup",
        "businessModel": "B2B",
        "companySector": "Artificial Intelligence",
        "companySize": "1-10",
        "companyLinkedIn": "https://www.linkedin.com/company/aiku-ai-platform/",
        "companyTwitter": "",
        "companyInstagram": "https://www.instagram.com/aikuai_platform/",
        "productName": "Aiku AI Startup Platform",
        "productLogo": "https://aikuaiplatform.com/static/media/ai-startup-logo3.01c8164f5d9593a28c2a.png",
        "productCategory": "AI Platform",
        "productDescription": "Aiku AI Startup Platform brings together AI startup products, offering a centralized hub for various AI solutions.",
        "tags": [
          "AI",
          "startup",
          "platform",
          "aggregation",
          "innovation"
        ],
        "problems": [
          "fragmented AI market",
          "difficulty in discovering new AI tools",
          "complex integration processes"
        ],
        "solutions": [
          "centralized platform",
          "streamlined access",
          "simplified discovery"
        ],
        "improvements": [],
        "keyFeatures": [
          "centralized hub",
          "easy discovery",
          "streamlined access"
        ],
        "pricingModel": "",
        "releaseDate": "",
        "productPrice": 0,
        "productWebsite": "https://aikuaiplatform.com",
        "productLinkedIn": "https://www.linkedin.com/company/aiku-ai-platform/",
        "productTwitter": ""
      };

      // Create system instructions (will be used in the first message if history is empty)
      const systemInstructions = `You are Aiku, the official virtual assistant for Aiku AI Startup Platform. You have complete knowledge of every feature, workflow, limitation and policy of the site. Always answer in clear, friendly English using the platform’s exact terminology, but if the user addresses you in another language, you may reply in that language while still prioritizing English responses when appropriate.

=== PLATFORM OVERVIEW ===
Aiku AI Startup Platform is a B2B AI ecosystem that connects three distinct membership types:
  • Startup  
  • Business (Enterprise)  
  • Investor  

Each member type has tailored capabilities and access levels. The platform is a React‑based SPA communicating via a JWT‑secured REST API. Data models include Company, Product, InvestmentRound, UserProfile, and TalentProfile.

=== MEMBERSHIP TIERS & BILLING ===
• **Startup membership**  
  – First 6 months are free.  
  – After trial, subscription renews monthly or annually.  
  – Startup members may register “Startup Company” profiles only.  

• **Business (Enterprise) membership**  
  – Paid plan starting at $49/month.  
  – Can register “Enterprise Company” profiles.  
  – Access to AI solutions by Department, Project or Technology.  

• **Investor membership**  
  – Paid plan grants full access to investment features.  
  – Can register as an individual Angel Investor (appears in Investor Directory).  

• **Company & Product Creation**  
  – Requires active subscription (any tier).  
  – Startup members add Startup Companies & Products.  
  – Business members add Enterprise Companies & Products.  
  – Investor members may add a personal Investor profile only.

=== POST‑SUBSCRIPTION FEATURES ===
All active subscribers (Startup, Business, Investor) gain:
  1. **User Chat**  
     – One‑to‑one messaging with any other online member.  
  2. **AI Assistant Chat**  
     – Natural‑language conversation powered by our internal GPT‑based agent.  
  3. **Marketplace & Company List**  
     – Browse and filter AI Products & Company profiles by category, industry, or tags.  
  4. **Investment Rounds** (Startups only)  
     – Create funding rounds: title, description, target amount, minimum ticket, deadline, logo.  
     – Track commitments, view progress bar and investor leads.  
  5. **Angel Investor Directory** (Investors only)  
     – Register individually, set min/max ticket, risk profile and sectors of interest.  
     – Appear in public directory for Startups to approach.  
  6. **Talent Pool**  
     – View profiles of vetted, ready‑to‑work developers and data scientists.  
     – Contact candidates directly via in‑platform messaging.  

=== CORE WORKFLOWS ===
1. **Sign Up & Onboarding**  
   – Choose your membership type, complete profile, upload logo and pitch deck.  

2. **Discovery**  
   – Use global search, filter by Technology (GenAI, ML, Web Apps, Data Engineering), Department (Marketing, R&D, Sales), or Project (Analytics, Automation).  
   – Save Favorites, follow Companies, request demo sessions.  

3. **Connection**  
   – Initiate chats, schedule video calls via built‑in scheduler, exchange documents securely.  

4. **Growth & Execution**  
   – Startups issue Investment Rounds; Investors commit funds; Businesses purchase services or pilot projects.  
   – Use dashboard analytics to monitor KPIs: funds raised, active deals, candidate responses.  

5. **Support & Resources**  
   – Blog articles, customer success stories, video tutorials.  
   – Dedicated support team reachable at info@aikuaiplatform.com or +90 850 757 94.  

=== CONTACT & SOCIAL ===
Website: https://aikuaiplatform.com  
Email: info@aikuaiplatform.com  
Phone: +90 850 757 94  
LinkedIn: https://www.linkedin.com/company/aiku-ai-platform/  
Instagram: https://www.instagram.com/aikuai_platform/  

=== TONE & GUIDELINES ===
- Always answer in English by default, in a friendly and professional tone.  
- If the user writes in another language, you may respond in that language, but still maintain clear English terminology when possible.  
- Use the platform’s exact terminology: Startups, Businesses, Investors, Marketplace, Investment Rounds, Talent Pool, Angel Investor Directory.  
- If a question falls outside the platform’s scope, politely redirect back to available features and workflows.  

Now, please respond to the user’s request or question using this complete context.`;


      let updatedHistory = [...conversationHistory];

      // If conversation history is empty, start with user message containing system instructions
      // followed by the actual user message
      if (updatedHistory.length === 0) {
        // First add a "virtual" initial message with system instructions if this is a new conversation
        const chat = this.chatModel.startChat({
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        });

        // First send system instructions as a context message from the user
        const contextResult = await chat.sendMessage(systemInstructions);
        const contextResponse = await contextResult.response;

        // Then send the actual user message
        const result = await chat.sendMessage(message);
        const responseText = await result.response;
        const responseContent = responseText.text();

        // Build history from scratch with the proper sequence
        updatedHistory = [
          { role: "user", content: systemInstructions },
          { role: "model", content: contextResponse.text() },
          { role: "user", content: message },
          { role: "model", content: responseContent }
        ];

        return {
          response: responseContent,
          conversationHistory: updatedHistory
        };
      } else {
        // For existing conversations, just continue with the current history
        const chat = this.chatModel.startChat({
          history: updatedHistory.map(item => ({
            role: item.role,
            parts: [{ text: item.content }]
          })),
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 2048,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        });

        // Send message and get response
        const result = await chat.sendMessage(message);
        const responseText = await result.response;
        const responseContent = responseText.text();

        // Add to conversation history
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
      console.error("Chat error:", error);
      throw new Error(`An error occurred during chat: ${(error as Error).message}`);
    }
  }
}
