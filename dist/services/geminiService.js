"use strict";
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value);
          });
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  };
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiService = void 0;
// @ts-nocheck - Typescript hatalarını görmezden gel
const generative_ai_1 = require("@google/generative-ai");
const dotenv_1 = __importDefault(require("dotenv"));
const puppeteer_1 = __importDefault(require("puppeteer"));
dotenv_1.default.config();
if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not defined in environment variables");
}
const genAI = new generative_ai_1.GoogleGenerativeAI(
  process.env.GEMINI_API_KEY
);
class GeminiService {
  constructor() {
    this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  }
  cleanJsonString(text) {
    text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    text = text.trim();
    return text;
  }
  validateUrl(url) {
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
  delay(ms) {
    return __awaiter(this, void 0, void 0, function* () {
      return new Promise((resolve) => setTimeout(resolve, ms));
    });
  }
  checkRobotsRules(url) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        const parsedUrl = new URL(url);
        const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}/robots.txt`;
        const response = yield fetch(robotsUrl);
        const robotsText = yield response.text();
        const userAgentRules = robotsText
          .toLowerCase()
          .includes("user-agent: *");
        const disallowed = robotsText.toLowerCase().includes("disallow: /");
        return !userAgentRules || !disallowed;
      } catch (error) {
        console.warn("robots.txt kontrol edilemedi:", error);
        return true;
      }
    });
  }
  findSubPages(page) {
    return __awaiter(this, void 0, void 0, function* () {
      return yield page.evaluate(() => {
        const subPages = [];
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
          var _a;
          const href = link.getAttribute("href");
          const text =
            ((_a = link.textContent) === null || _a === void 0
              ? void 0
              : _a.toLowerCase()) || "";
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
    });
  }
  scrapeWebsite(url) {
    return __awaiter(this, void 0, void 0, function* () {
      try {
        url = this.validateUrl(url);
        const baseUrl = new URL(url).origin;
        let allContent = "";
        const visitedUrls = new Set();
        const foundUrls = [];
        const isAllowed = yield this.checkRobotsRules(url);
        if (!isAllowed) {
          throw new Error("Bu site robots.txt tarafından engellenmiş");
        }
        
        // Her sayfa için yeni bir tarayıcı örneği oluşturuyoruz
        // Bu, tarayıcı ve sayfa arasındaki bağlantı sorunlarını azaltır
        for (let attempt = 0; attempt < 2; attempt++) {
          let browser = null;
          try {
            browser = yield puppeteer_1.default.launch({
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
            const page = yield browser.newPage();
            yield page.setUserAgent(
              "Mozilla/5.0 (compatible; AIKUBot/1.0; +https://aiku.com/bot)"
            );
            
            try {
              // Ana sayfayı tara
              yield this.scrapePage(page, url, visitedUrls);
              const mainContent = yield this.extractPageContent(page);
              allContent += mainContent;
              
              // Alt sayfaları bul
              const subPages = yield this.findSubPages(page);
              
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
                    yield this.delay(1000); // Rate limiting - süreyi biraz daha azalttık
                    
                    // Her alt sayfa için yeni bir sayfa nesnesi oluştur
                    const subPage = yield browser.newPage();
                    try {
                      yield this.scrapePage(subPage, fullUrl, visitedUrls);
                      allContent += "\n\n--- " + fullUrl + " ---\n";
                      allContent += yield this.extractPageContent(subPage);
                      foundUrls.push(fullUrl);
                    } catch (subError) {
                      console.warn(`Alt sayfa tarama hatası (${fullUrl}):`, subError);
                    } finally {
                      yield subPage.close().catch(e => console.warn("Alt sayfa kapatma hatası:", e));
                    }
                  }
                } catch (error) {
                  console.warn("Alt sayfa işleme hatası:", error);
                  continue;
                }
              }
              
              // İşlem başarılı - döngüden çık
              yield page.close().catch(e => console.warn("Ana sayfa kapatma hatası:", e));
              return {
                content: this.sanitizeText(allContent),
                foundUrls,
              };
            } catch (pageError) {
              console.error("Sayfa işleme hatası:", pageError);
              yield page.close().catch(e => console.warn("Hata sonrası sayfa kapatma hatası:", e));
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
              yield browser.close().catch(e => console.warn("Tarayıcı kapatma hatası:", e));
            }
          }
        }
        
        // Her iki denemede de başarısız olursa buraya ulaşır
        throw new Error("Web sitesi içeriği alınamadı: Maksimum deneme sayısı aşıldı");
      } catch (error) {
        console.error("Web scraping error:", error);
        throw new Error("Web sitesi içeriği alınamadı: " + error.message);
      }
    });
  }
  scrapePage(page, url, visitedUrls) {
    return __awaiter(this, void 0, void 0, function* () {
      if (visitedUrls.has(url)) return;
      let retryCount = 0;
      const maxRetries = 3;
      
      // İstek engellemesini daha güvenli bir şekilde yapılandır
      try {
        // İstek engellemesini ayarla
        yield page.setRequestInterception(true);
        
        // Event listener'ı temizlemek için referans sakla
        const requestHandler = (req) => {
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
            yield page.goto(url, {
              waitUntil: "domcontentloaded",
              timeout: 45000, // 60 saniyeden 45 saniyeye düşürdük - daha makul bir değer
            });
            
            // Sayfa yüklendikten sonra kısa bir bekleme
            yield this.delay(1000);
            
            visitedUrls.add(url);
            break;
          } catch (error) {
            console.log(`Retry ${retryCount + 1}/${maxRetries} for ${url}: ${error.message}`);
            retryCount++;
            if (retryCount === maxRetries) throw error;
            yield this.delay(1500 * retryCount);
          }
        }
        
        // İstek dinlemeyi temizle
        page.removeListener('request', requestHandler);
        yield page.setRequestInterception(false).catch(() => {}); // Hata olursa görmezden gel
        
        // CAPTCHA tespiti
        try {
          const hasCaptcha = yield page.evaluate(() => {
            var _a;
            return (
              ((_a = document.body.textContent) === null || _a === void 0
                ? void 0
                : _a.toLowerCase().includes("captcha")) ||
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
          yield page.setRequestInterception(false).catch(() => {});
        } catch (cleanupError) {
          console.warn("İstek engelleme temizleme hatası:", cleanupError);
        }
        throw error;
      }
    });
  }
  extractPageContent(page) {
    return __awaiter(this, void 0, void 0, function* () {
      const metadata = yield page.evaluate(() => {
        const getMetaContent = (selector) => {
          var _a;
          return (
            ((_a = document.querySelector(selector)) === null || _a === void 0
              ? void 0
              : _a.getAttribute("content")) || ""
          );
        };
        const filterSensitiveData = (text) => {
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
        };
      });
      const logoUrl = yield page.evaluate(() => {
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
          const element = document.querySelector(selector);
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
      const contactInfo = yield page.evaluate(() => {
        const text = document.body.innerText;
        const emailPattern =
          /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        const phonePattern =
          /(?:(?:\+|00)?[0-9]{1,3}[-. ]?)?\(?[0-9]{3}\)?[-. ]?[0-9]{3}[-. ]?[0-9]{2,4}/g;
        const emails = [...new Set(text.match(emailPattern) || [])];
        const phones = [...new Set(text.match(phonePattern) || [])];
        document.querySelectorAll('a[href^="mailto:"]').forEach((el) => {
          var _a;
          const email =
            (_a = el.getAttribute("href")) === null || _a === void 0
              ? void 0
              : _a.replace("mailto:", "");
          if (email) emails.push(email);
        });
        document.querySelectorAll('a[href^="tel:"]').forEach((el) => {
          var _a;
          const phone =
            (_a = el.getAttribute("href")) === null || _a === void 0
              ? void 0
              : _a.replace("tel:", "");
          if (phone) phones.push(phone);
        });
        return {
          emails: [...new Set(emails)],
          phones: [...new Set(phones)],
        };
      });
      const socialLinks = yield page.evaluate(() => {
        const links = [];
        document
          .querySelectorAll(
            'a[href*="facebook.com"], a[href*="twitter.com"], a[href*="instagram.com"], a[href*="linkedin.com"], a[href*="youtube.com"]'
          )
          .forEach((el) => {
            const href = el.getAttribute("href");
            if (href) links.push(href);
          });
        return [...new Set(links)];
      });
      const addressInfo = yield page.evaluate(() => {
        const addresses = [];
        const mapsElements = document.querySelectorAll(
          'iframe[src*="google.com/maps"], iframe[src*="maps.google.com"], a[href*="maps.google.com"], a[href*="google.com/maps"]'
        );
        mapsElements.forEach((el) => {
          var _a;
          const src = el.getAttribute("src") || el.getAttribute("href") || "";
          const placeMatch = src.match(/(?:place|q|query)=([^&]+)/);
          const coordsMatch = src.match(/(?:@|ll=)([-\d.]+),([-\d.]+)/);
          if (placeMatch) {
            const place = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
            addresses.push(place);
          }
          let parent = el.parentElement;
          for (let i = 0; i < 5 && parent; i++) {
            const text =
              (_a = parent.textContent) === null || _a === void 0
                ? void 0
                : _a.trim();
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
            var _a;
            const text =
              (_a = el.textContent) === null || _a === void 0
                ? void 0
                : _a.trim();
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
        document.querySelectorAll("p, div, span").forEach((el) => {
          var _a;
          const text =
            ((_a = el.textContent) === null || _a === void 0
              ? void 0
              : _a.trim()) || "";
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
          .forEach((el) => {
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
    });
  }
  sanitizeText(text) {
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
  calculateAddressScore(text) {
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
  analyzeWebsite(url) {
    return __awaiter(this, void 0, void 0, function* () {
      var _a, _b, _c, _d, _e, _f;
      try {
        const { content: websiteContent, foundUrls } = yield this.scrapeWebsite(
          url
        );
        let socialLinks = [];
        let logoUrl = ""; // Logo URL'sini saklamak için değişken
        try {
          const browser = yield puppeteer_1.default.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
          });
          const page = yield browser.newPage();
          yield page.goto(url, { waitUntil: "networkidle0" });
          // Logo URL'sini çek
          logoUrl = yield page.evaluate(() => {
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
              const element = document.querySelector(selector);
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
          socialLinks = yield page.evaluate(() => {
            const links = [];
            document
              .querySelectorAll(
                'a[href*="facebook.com"], a[href*="twitter.com"], a[href*="instagram.com"], a[href*="linkedin.com"], a[href*="youtube.com"]'
              )
              .forEach((el) => {
                const href = el.getAttribute("href");
                if (href) links.push(href);
              });
            return [...new Set(links)];
          });
          yield browser.close();
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
   - companyType: Based on the content, determine if it's 'Business', 'Investor', or 'Startup'
   - businessModel: Based on their customer focus, determine if it's 'B2B', 'B2C', 'B2G', 'C2C', 'C2B', 'D2C', or 'B2B2C'
   - companySector: Determine their main industry sector
   - companySize: Based on any employee information, determine size ('1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5001-10000', '10001+')
   - productName: The name of the product.
   - productLogo: The URL of the product logo.
   - productCategory: The category of the product.
   - productDescription: A short description of the product.
   - detailedDescription: A detailed, multi-paragraph description of the product.
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
        const result = yield this.model.generateContent(prompt);
        const response = yield result.response;
        const text = this.cleanJsonString(response.text());
        try {
          const parsed = JSON.parse(text);
          const websiteUrl = new URL(url).origin;
          return {
            companyName:
              ((_a = parsed.companyName) === null || _a === void 0
                ? void 0
                : _a.trim()) || "",
            companyLogo: logoUrl, // Çekilen logo URL'sini ekle
            companyEmail:
              ((_b = parsed.companyEmail) === null || _b === void 0
                ? void 0
                : _b.trim()) || "",
            companyPhone:
              ((_c = parsed.companyPhone) === null || _c === void 0
                ? void 0
                : _c.trim()) || "",
            companyWebsite: parsed.companyWebsite || websiteUrl,
            companyAddress:
              ((_d = parsed.companyAddress) === null || _d === void 0
                ? void 0
                : _d.trim()) || "",
            companyInfo:
              ((_e = parsed.companyInfo) === null || _e === void 0
                ? void 0
                : _e.trim()) || "",
            detailedDescription:
              ((_f = parsed.detailedDescription) === null || _f === void 0
                ? void 0
                : _f.trim()) || "",
            companyType: parsed.companyType || "",
            businessModel: parsed.businessModel || "",
            companySector: parsed.companySector || "",
            companySize: parsed.companySize || "",
            companyLinkedIn:
              socialLinks.find((link) => link.includes("linkedin.com")) || "",
            companyTwitter:
              socialLinks.find((link) => link.includes("twitter.com")) || "",
            companyInstagram:
              socialLinks.find((link) => link.includes("instagram.com")) || "",
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
        throw error;
      }
    });
  }
  analyzeDocument(documentText) {
    return __awaiter(this, void 0, void 0, function* () {
      var _a, _b, _c, _d, _e, _f, _g, _h;
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
        const result = yield this.model.generateContent(prompt);
        const response = yield result.response;
        const text = this.cleanJsonString(response.text());
        try {
          const parsed = JSON.parse(text);
          // Extract domain from email if website is empty
          let website =
            ((_a = parsed.companyWebsite) === null || _a === void 0
              ? void 0
              : _a.trim()) || "";
          if (!website && parsed.companyEmail) {
            const emailDomain =
              (_b = parsed.companyEmail.split("@")[1]) === null || _b === void 0
                ? void 0
                : _b.split(",")[0];
            if (emailDomain) {
              website = `https://${emailDomain}`;
            }
          }
          // Extract social media URLs from text
          const linkedInMatch = documentText.match(/linkedin\.com\/[^\s,\n]+/);
          const twitterMatch = documentText.match(/twitter\.com\/[^\s,\n]+/);
          const instagramMatch = documentText.match(
            /instagram\.com\/[^\s,\n]+/
          );
          // @ts-expect-error - FormData tipinde tüm gerekli alanlar karşılanmamaktadır
          return {
            companyName:
              ((_c = parsed.companyName) === null || _c === void 0
                ? void 0
                : _c.trim()) || "",
            companyEmail:
              ((_d = parsed.companyEmail) === null || _d === void 0
                ? void 0
                : _d.trim()) || "",
            companyPhone:
              ((_e = parsed.companyPhone) === null || _e === void 0
                ? void 0
                : _e.trim()) || "",
            companyWebsite: website,
            companyAddress:
              ((_f = parsed.companyAddress) === null || _f === void 0
                ? void 0
                : _f.trim()) || "",
            companyInfo:
              ((_g = parsed.companyInfo) === null || _g === void 0
                ? void 0
                : _g.trim()) || "",
            detailedDescription:
              ((_h = parsed.detailedDescription) === null || _h === void 0
                ? void 0
                : _h.trim()) || "",
            companyType: parsed.companyType || "",
            businessModel: parsed.businessModel || "",
            companySector: parsed.companySector || "",
            companySize: parsed.companySize || "",
            companyLogo: "", // Dokümandan logo çekilemeyeceği için boş
            companyLinkedIn: linkedInMatch
              ? `https://www.${linkedInMatch[0]}`
              : "",
            companyTwitter: twitterMatch
              ? `https://www.${twitterMatch[0]}`
              : "",
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
    });
  }
  analyzeLinkedIn(linkedInData) {
    return __awaiter(this, void 0, void 0, function* () {
      var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
      try {
        // LinkedIn verilerini daha okunabilir bir formata dönüştürme
        const userData =
          (_a =
            linkedInData === null || linkedInData === void 0
              ? void 0
              : linkedInData.data) === null || _a === void 0
            ? void 0
            : _a.user;
        if (!userData) {
          throw new Error("LinkedIn kullanıcı verisi bulunamadı");
        }
        const prompt = `Analyze this LinkedIn user data and create a professional company profile:

User Information:
- Full Name: ${userData.firstName} ${userData.lastName}
- Email: ${userData.email}
- LinkedIn Profile: ${userData.linkedin}
- Location: ${
          ((_b = userData.locale) === null || _b === void 0
            ? void 0
            : _b.country) || "Not specified"
        }

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
        const result = yield this.model.generateContent(prompt);
        const response = yield result.response;
        const text = this.cleanJsonString(response.text());
        try {
          const parsed = JSON.parse(text);
          return Object.assign(Object.assign({}, parsed), {
            companyLogo: userData.profilePictureUrl || "",
            companyLinkedIn: userData.linkedin || "",
            companyEmail: userData.email || "",
            companyName:
              ((_c = parsed.companyName) === null || _c === void 0
                ? void 0
                : _c.trim()) || `${userData.firstName} ${userData.lastName}`,
            companyPhone:
              ((_d = parsed.companyPhone) === null || _d === void 0
                ? void 0
                : _d.trim()) || "",
            companyWebsite:
              ((_e = parsed.companyWebsite) === null || _e === void 0
                ? void 0
                : _e.trim()) || "",
            companyAddress:
              ((_f = parsed.companyAddress) === null || _f === void 0
                ? void 0
                : _f.trim()) ||
              ((_g = userData.locale) === null || _g === void 0
                ? void 0
                : _g.country) ||
              "",
            companyInfo:
              ((_h = parsed.companyInfo) === null || _h === void 0
                ? void 0
                : _h.trim()) || "",
            detailedDescription:
              ((_j = parsed.detailedDescription) === null || _j === void 0
                ? void 0
                : _j.trim()) || "",
            companyType: parsed.companyType || "Entrepreneur",
            businessModel: parsed.businessModel || "",
            companySector: parsed.companySector || "",
            companySize: parsed.companySize || "1-10",
            companyTwitter:
              ((_k = parsed.companyTwitter) === null || _k === void 0
                ? void 0
                : _k.trim()) || "",
            companyInstagram:
              ((_l = parsed.companyInstagram) === null || _l === void 0
                ? void 0
                : _l.trim()) || "",
          });
        } catch (parseError) {
          console.error("JSON ayrıştırma hatası:", parseError);
          console.error("Alınan metin:", text);
          throw new Error("AI yanıtı JSON formatında değil");
        }
      } catch (error) {
        console.error("Gemini API hatası:", error);
        throw error;
      }
    });
  }
}
exports.GeminiService = GeminiService;
