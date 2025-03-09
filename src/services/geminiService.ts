import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import puppeteer, { ElementHandle, Page } from 'puppeteer';

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

export class GeminiService {
  private model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  private cleanJsonString(text: string): string {
    text = text.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    text = text.trim();
    return text;
  }

  private async scrapeWebsite(url: string): Promise<string> {
    try {
      // URL'i normalize et
      if (!url.startsWith("http")) {
        url = "https://" + url;
      }

      // Tarayıcıyı başlat
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });

      console.log('Browser launched');

      // Yeni sayfa aç
      const page = await browser.newPage();
      
      // Sayfayı yükle ve tüm kaynakların yüklenmesini bekle
      await page.goto(url, {
        waitUntil: 'networkidle0',
        timeout: 30000
      });

      console.log('Page loaded');

      // Meta bilgilerini topla
      const metadata = await page.evaluate(() => {
        const getMetaContent = (selector: string): string => 
          document.querySelector(selector)?.getAttribute('content') || '';
          
        return {
          title: document.title,
          metaDescription: getMetaContent('meta[name="description"]'),
          metaKeywords: getMetaContent('meta[name="keywords"]'),
          ogTitle: getMetaContent('meta[property="og:title"]'),
          ogDescription: getMetaContent('meta[property="og:description"]')
        } as PageMetadata;
      });

      // Logo URL'ini bul
      const logoUrl = await page.evaluate(() => {
        const logoImg = document.querySelector('img[alt*="logo" i], img[src*="logo" i], a img') as HTMLImageElement;
        return logoImg?.src || '';
      });

      // Email ve telefon numaralarını bul
      const contactInfo = await page.evaluate(() => {
        const text = document.body.innerText;
        const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
        const phonePattern = /(?:(?:\+|00)?[0-9]{1,3}[-. ]?)?\(?[0-9]{3}\)?[-. ]?[0-9]{3}[-. ]?[0-9]{2,4}/g;
        
        const emails = [...new Set(text.match(emailPattern) || [])];
        const phones = [...new Set(text.match(phonePattern) || [])];
        
        // mailto: ve tel: linklerini de kontrol et
        document.querySelectorAll('a[href^="mailto:"]').forEach((el: Element) => {
          const email = el.getAttribute('href')?.replace('mailto:', '');
          if (email) emails.push(email);
        });
        
        document.querySelectorAll('a[href^="tel:"]').forEach((el: Element) => {
          const phone = el.getAttribute('href')?.replace('tel:', '');
          if (phone) phones.push(phone);
        });
        
        return {
          emails: [...new Set(emails)],
          phones: [...new Set(phones)]
        } as ContactInfo;
      });

      // Sosyal medya linklerini topla
      const socialLinks = await page.evaluate(() => {
        const links: string[] = [];
        document.querySelectorAll('a[href*="facebook.com"], a[href*="twitter.com"], a[href*="instagram.com"], a[href*="linkedin.com"], a[href*="youtube.com"]').forEach((el: Element) => {
          const href = el.getAttribute('href');
          if (href) links.push(href);
        });
        return [...new Set(links)];
      });

      // Adres bilgilerini topla
      const addressInfo = await page.evaluate(() => {
        const addresses: string[] = [];
        
        // İletişim sayfası özel selektörleri
        const contactSelectors = [
          '.contact-info',
          '.contact-details',
          '.address',
          '.location',
          '#contact-address',
          '[data-address]',
          '.footer-address',
          '.office-address',
          'address',
          '.contact-section address',
          '.contact-section .address',
          '.contact-box',
          '.contact-info-box'
        ];

        // Tüm selektörleri kontrol et
        contactSelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            const text = el.textContent?.trim();
            if (text && text.length > 10 && text.length < 200) {
              addresses.push(text);
            }
          });
        });
        
        // Google Maps iframe'lerini kontrol et
        document.querySelectorAll('iframe[src*="google.com/maps"], iframe[src*="maps.google.com"]').forEach((iframe: Element) => {
          const src = iframe.getAttribute('src') || '';
          console.log('Found Google Maps iframe:', src);
          
          // iframe'in üst elementlerini kontrol et
          let parent = iframe.parentElement;
          for (let i = 0; i < 5 && parent; i++) {
            const text = parent.textContent?.trim();
            if (text && text.length > 10 && text.length < 200) {
              addresses.push(text);
            }
            parent = parent.parentElement;
          }
        });

        // Adres içerebilecek tüm metinleri tara
        const addressKeywords = ['adres', 'address', 'location', 'konum', 'ofis', 'office', 'merkez', 'headquarters'];
        document.querySelectorAll('p, div, span').forEach((el: Element) => {
          const text = el.textContent?.trim() || '';
          if (
            text.length > 10 && 
            text.length < 200 && 
            addressKeywords.some(keyword => text.toLowerCase().includes(keyword))
          ) {
            addresses.push(text);
          }
        });

        // data-* özelliklerini kontrol et
        document.querySelectorAll('[data-address], [data-location], [data-venue], [data-office]').forEach((el: Element) => {
          const addr = el.getAttribute('data-address') || 
                      el.getAttribute('data-location') || 
                      el.getAttribute('data-venue') ||
                      el.getAttribute('data-office');
          if (addr) addresses.push(addr);
        });

        return [...new Set(addresses)];
      });

      // Debug için adresleri yazdır
      console.log('Found addresses:', addressInfo);
      console.log('Number of addresses found:', addressInfo.length);

      // Tarayıcıyı kapat
      await browser.close();

      // Tüm bilgileri birleştir
      return `
Page Title: ${metadata.title}
OG Title: ${metadata.ogTitle}
Meta Description: ${metadata.metaDescription}
OG Description: ${metadata.ogDescription}
Meta Keywords: ${metadata.metaKeywords}

Logo URL: ${logoUrl}

Found Emails: ${contactInfo.emails.join(', ')}
Found Phones: ${contactInfo.phones.join(', ')}

Social Media Links:
${socialLinks.join('\n')}

Found Addresses:
${addressInfo.join('\n')}

URL: ${url}
      `.trim();
    } catch (error) {
      console.error('Web scraping error:', error);
      throw new Error('Web sitesi içeriği alınamadı: ' + (error as Error).message);
    }
  }

  // Adres olma olasılığını hesapla
  private calculateAddressScore(text: string): number {
    let score = 0;
    
    // Kolektif House ve Ataşehir için özel puan
    if (/kolektif\s+house/i.test(text)) score += 5;
    if (/ataşehir/i.test(text)) score += 4;
    
    // Posta kodu içeriyor mu?
    if (/\b\d{5}\b/.test(text)) score += 3;
    
    // Mahalle/Sokak/Cadde kelimelerini içeriyor mu?
    if (/mahalle|sokak|cadde|plaza|kule/i.test(text)) score += 2;
    
    // No, Kat, Daire gibi detayları içeriyor mu?
    if (/no|kat|daire|blok/i.test(text)) score += 2;
    
    // Şehir ismi içeriyor mu?
    if (/istanbul|ankara|izmir|bursa|antalya/i.test(text)) score += 2;
    
    // Noktalama ve sayı içeriyor mu?
    if (/[,.:]/g.test(text)) score += 1;
    if (/\d+/g.test(text)) score += 1;
    
    return score;
  }

  async analyzeWebsite(url: string): Promise<FormData> {
    try {
      const websiteContent = await this.scrapeWebsite(url);
      
      // Debug için scraping sonucunu yazdır
      console.log('Scraped Content:', websiteContent);

      const prompt = `You are an AI assistant specialized in analyzing website content. Analyze the following website content and extract company information.

Instructions:
1. Carefully examine the provided website content, especially the 'Found Addresses' section
2. Look for company information in all sections
3. Extract the following details:
   - companyName: Extract from title, OG title, or about section. Remove common suffixes like "Inc.", "Ltd." unless they're integral to the name
   - email: Look for valid email addresses in contact section or footer
   - phone: Look for phone numbers, clean and format them properly (if multiple numbers found, include all with commas)
   - website: Use the provided URL (base domain without path)
   - address: IMPORTANT - Look in 'Found Addresses' section first, then contact section and footer. If multiple addresses found, use the one with highest relevance (containing keywords like Kolektif House, Ataşehir, etc.)
   - description: Create a concise description from meta description, about section, or main content. Include key features and services.
4. Return ONLY a JSON object with the exact field names specified above
5. If information is not found, use empty string ("")
6. Make sure the information is accurate and relevant to the company
7. Do not include placeholder text or example values
8. If multiple values found (like phones or emails), include all with comma separation
9. IMPORTANT: Do not ignore or skip any address information found in the content

Website Content:
${websiteContent}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = this.cleanJsonString(response.text());
      
      // Debug için AI yanıtını yazdır
      console.log('AI Response:', text);

      try {
        const parsed = JSON.parse(text);
        // URL'i ana domaine çevir
        const websiteUrl = new URL(url).origin;

        // Debug için bulunan adresi yazdır
        if (parsed.address) {
          console.log('Found address:', parsed.address);
        } else {
          console.log('No address found in AI response');
        }
        
        // Ensure correct field names and data cleaning
        return {
          companyName: parsed.companyName?.trim() || "",
          email: parsed.email?.trim() || "",
          phone: parsed.phone?.trim() || "",
          website: parsed.website || websiteUrl,
          address: parsed.address?.trim() || "",
          description: parsed.description?.trim() || ""
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
