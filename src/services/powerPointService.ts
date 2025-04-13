import pptxgen from 'pptxgenjs';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import { v4 as uuidv4 } from 'uuid';

// Slayt yapısı için interface
interface Slide {
  slide_number: number;
  title: string;
  content: string;
  logo?: string;
}

// Sosyal medya bilgileri için interface
interface SocialMedia {
  linkedin?: string;
  twitter?: string;
  instagram?: string;
}

// Ürün bilgileri için interface
interface ProductInfo {
  productName?: string;
  productDescription?: string;
  productCategory?: string;
  tags?: string[];
  problems?: string[];
  solutions?: string[];
  keyFeatures?: string[];
  pricingModel?: string;
}

// Şirket detayları için interface
interface CompanyDetails {
  companyName?: string;
  companyInfo?: string;
  companyType?: string;
  businessModel?: string;
  companySector?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
  companySize?: string;
  companyWebsite?: string;
  socialMedia?: SocialMedia;
  productInfo?: ProductInfo;
}

// Sunum verisi için interface
interface PresentationData {
  success: boolean;
  websiteUrl: string;
  domain: string;
  logoUrl?: string | null;
  slides: Slide[];
  companyDetails?: CompanyDetails;
}

export class PowerPointService {
  /**
   * Web sitesinden oluşturulan slayt verilerinden PowerPoint sunumu oluşturur
   * @param presentationData API'den alınan slayt verileri
   * @returns Oluşturulan PowerPoint dosyasının yolu
   */
  async createPowerPoint(presentationData: PresentationData): Promise<string> {
    try {
      // Yeni bir PowerPoint sunumu oluştur
      const pres = new pptxgen();
      
      // Temel sunum ayarları
      pres.author = 'AIKU AI Platform';
      pres.company = 'AIKU AI Platform';
      pres.revision = '1';
      pres.subject = `${presentationData.domain} Presentation`;
      pres.title = `${presentationData.companyDetails?.companyName || presentationData.domain} Presentation`;
      
      // Şık bir tema tanımla
      pres.defineSlideMaster({
        title: 'AIKU_MASTER',
        background: { color: 'FFFFFF' },
        objects: [
          // Alt bilgi çizgisi
          { 
            rect: { 
              x: 0, y: 5.1, w: '100%', h: 0.05, 
              fill: { color: '4472C4' } 
            } 
          },
          // Logo konumu için ayırıcı (sadece template olarak)
          { 
            rect: { 
              x: 7, y: 0.5, w: 2, h: 1, 
              fill: { color: 'FFFFFF' } 
            } 
          }
        ],
        slideNumber: { x: 0.5, y: 5.3, color: '666666', fontFace: 'Arial', fontSize: 10 }
      });
      
      // Temp dizinini oluştur
      const tempDir = path.join(process.cwd(), 'uploads', 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Her slayt için döngü
      for (const slide of presentationData.slides) {
        // Master template'ini kullanarak yeni slayt oluştur
        const newSlide = pres.addSlide({ masterName: 'AIKU_MASTER' });
        
        // Slayt başlığı - 2 satırlık başlık için maksimum alan
        newSlide.addText(slide.title, { 
          x: 0.5, 
          y: 0.3, 
          w: '65%', // Logo alanı için yer bırak
          h: 0.9,
          fontSize: 32, 
          bold: true,
          fontFace: 'Arial',
          color: '333333',
          valign: 'middle'
        });
        
        // Her slayta bir tasarım öğesi ekle - sol üst dekoratif çubuk
        newSlide.addShape(pres.ShapeType.rect, { 
          x: 0.5, 
          y: 1.3, 
          w: 0.1, 
          h: 0.8, 
          fill: { color: '4472C4' }
        });
        
        // Slayt içeriğini işle
        const contentLines = slide.content.split('\n');
        
        // İçeriği işleme
        if (contentLines.length > 1) {
          // İçeriği kategorilere ayır
          const bulletPoints: string[] = [];
          const normalLines: string[] = [];
          
          contentLines.forEach(line => {
            const trimmedLine = line.trim();
            // Madde işaretli satırları algıla
            if (trimmedLine.startsWith('-') || trimmedLine.startsWith('•') || trimmedLine.startsWith('*')) {
              bulletPoints.push(trimmedLine.replace(/^[-•*]\s*/, ''));
            } else if (trimmedLine.length > 0) {
              normalLines.push(trimmedLine);
            }
          });
          
          // İçerik alanını tanımla - başlangıç ve maksimum Y koordinatları
          const contentStartY = 1.5;
          const maxContentY = 5.0; // Alt bilgiye yaklaşmamak için
          let currentY = contentStartY;
          
          // Önce normal metinleri ekle - girişler için
          if (normalLines.length > 0) {
            // Tüm normal satırları tek bir metin bloğu olarak ekle
            const combinedText = normalLines.join('\n\n');
            
            // Metni uygun boyuta sığdırma
            newSlide.addText(combinedText, { 
              x: 0.7, // Dekoratif çubuktan sonra
              y: contentStartY, 
              w: '90%', 
              h: Math.min(0.4 * normalLines.length, 1.2), // Minimum bir alan belirle
              fontSize: 16, 
              fontFace: 'Arial',
              color: '555555'
            });
            
            // Y pozisyonunu güncelle (metin paragraflarının tahmini yüksekliği + boşluk)
            currentY += Math.min(0.4 * normalLines.length, 1.2) + 0.2;
          }
          
          // Madde işaretleri çok fazla olabilir, bir limit belirle
          const maxBullets = 8; // Bir slayta maksimum 8 madde
          
          // Madde işaretleri fazlaysa, en önemlileri seç veya birkaç gruba böl
          let bulletsToShow = bulletPoints;
          if (bulletPoints.length > maxBullets) {
            // Sadece ilk maxBullets maddeyi göster
            bulletsToShow = bulletPoints.slice(0, maxBullets);
            
            // Fazla maddeler olduğunu belirten bir not ekle
            newSlide.addText(`+ ${bulletPoints.length - maxBullets} more items...`, { 
              x: 0.7, 
              y: 4.7, 
              fontSize: 12, 
              italic: true,
              color: '999999' 
            });
          }
          
          // Eğer madde işaretleri varsa, bunları bir tablo olarak ekle
          if (bulletsToShow.length > 0) {
            // Tabloda satır yüksekliği
            const rowHeight = 0.4;
            // Tek bir tablo olarak madde işaretlerini ekle
            const rows = bulletsToShow.map(point => [{
              text: point,
              options: { 
                bullet: { code: '25CB' }, // Daha şık madde işareti sembolu
                fontSize: 14,
                color: '555555'
              }
            }]);
            
            // Tablo şeklinde ekle
            newSlide.addTable(rows, { 
              x: 0.7, 
              y: currentY,
              w: '90%',
              h: Math.min(rows.length * rowHeight, 3.0), // Maksimum yüksekliği sınırla
              border: { type: 'none' },
              fontSize: 14,
              fontFace: 'Arial',
              color: '555555',
              colW: [9], // Tek kolon, tüm genişlik
              rowH: rowHeight
            });
          }
        } else {
          // Tek satır varsa daha büyük bir metin olarak ekle
          newSlide.addText(slide.content, { 
            x: 0.7, 
            y: 1.5, 
            w: '90%', 
            h: 3.0,
            fontSize: 20, 
            fontFace: 'Arial',
            color: '555555'
          });
        }
        
        // Logo ekle (eğer varsa ve ilk slaytsa veya özel olarak belirtilmişse)
        const logoToUse = slide.logo || (presentationData.logoUrl || null);
        if ((slide.slide_number === 1 || slide.logo) && logoToUse) {
          try {
            console.log(`Logo indirme deneniyor: ${logoToUse}`);
            const logoPath = await this.downloadImage(logoToUse);
            
            if (logoPath && fs.existsSync(logoPath) && fs.statSync(logoPath).size > 0) {
              try {
                console.log(`Logo ekleniyor: ${logoPath}`);
                newSlide.addImage({ 
                  path: logoPath, 
                  x: 7, 
                  y: 0.3, 
                  w: 2, 
                  h: 0.9,
                  sizing: { type: 'contain', w: 2, h: 0.9 } 
                });
                
                // İndirilen dosyayı temizle
                try {
                  fs.unlinkSync(logoPath);
                  console.log(`Logo dosyası temizlendi: ${logoPath}`);
                } catch (unlinkError) {
                  console.error('Logo dosyası silinemedi:', unlinkError);
                }
              } catch (addImageError) {
                console.error('Logo ekleme hatası:', addImageError);
              }
            } else {
              console.warn(`Logo dosyası bulunamadı, geçersiz veya boş: ${logoPath}`);
            }
          } catch (logoError) {
            console.error('Logo işleme hatası:', logoError);
          }
        }
        
        // Sayfa numarası ekleme (slide master bunu otomatik yapıyor)
        
        // Alt bilgi ekle
        newSlide.addText(`${presentationData.companyDetails?.companyName || presentationData.domain}`, { 
          x: 0.5, 
          y: 5.2, 
          fontSize: 10, 
          color: '666666',
          fontFace: 'Arial' 
        });
        
        // Son slayta şirket bilgilerini ekle (iletişim slaytı için)
        if (slide.slide_number === presentationData.slides.length) {
          const companyDetails = presentationData.companyDetails;
          if (companyDetails) {
            const footerText = `${companyDetails.companyWebsite || ''} ${companyDetails.companyType ? '| ' + companyDetails.companyType : ''} ${companyDetails.companySector ? '| ' + companyDetails.companySector : ''}`;
            
            // İletişim alt bilgisi olarak farklı bir stil kullan
            newSlide.addText(footerText, { 
              x: 4.5, 
              y: 5.2, 
              fontSize: 10, 
              color: '666666',
              fontFace: 'Arial',
              align: 'right'
            });
          }
        }
      }
      
      // Ek slayt için iyileştirilmiş tasarım
      if (presentationData.companyDetails && Object.keys(presentationData.companyDetails).length > 0) {
        const detailsSlide = pres.addSlide({ masterName: 'AIKU_MASTER' });
        
        // Başlık
        detailsSlide.addText('Company Details', { 
          x: 0.5, 
          y: 0.3, 
          w: '90%', 
          fontSize: 32, 
          bold: true,
          fontFace: 'Arial',
          color: '333333'
        });
        
        // Dekoratif çizgi
        detailsSlide.addShape(pres.ShapeType.rect, { 
          x: 0.5, 
          y: 1.3, 
          w: 0.1, 
          h: 0.8, 
          fill: { color: '4472C4' }
        });
        
        const details = presentationData.companyDetails;
        
        // İki kolonlu görünüm
        // Sol taraf - Şirket detayları
        const leftCol = [
          { key: 'Company Name', value: details.companyName || '' },
          { key: 'Sector', value: details.companySector || '' },
          { key: 'Business Model', value: details.businessModel || '' },
          { key: 'Company Type', value: details.companyType || '' },
          { key: 'Company Size', value: details.companySize || '' },
          { key: 'Website', value: details.companyWebsite || '' }
        ];
        
        // Sağ taraf - İletişim ve sosyal medya
        const rightCol = [
          { key: 'Email', value: details.companyEmail || '' },
          { key: 'Phone', value: details.companyPhone || '' },
          { key: 'Address', value: details.companyAddress || '' }
        ];
        
        if (details.socialMedia) {
          if (details.socialMedia.linkedin) rightCol.push({ key: 'LinkedIn', value: details.socialMedia.linkedin });
          if (details.socialMedia.twitter) rightCol.push({ key: 'Twitter', value: details.socialMedia.twitter });
          if (details.socialMedia.instagram) rightCol.push({ key: 'Instagram', value: details.socialMedia.instagram });
        }
        
        // Sol kolon tablosu
        const leftRows = leftCol.map(item => [
          { text: item.key, options: { bold: true, color: '4472C4', fontSize: 14 } },
          { text: item.value, options: { color: '555555', fontSize: 14 } }
        ]);
        
        detailsSlide.addTable(leftRows, {
          x: 0.7,
          y: 1.5,
          w: 4.5,
          colW: [1.5, 3],
          border: { type: 'none' },
          fontFace: 'Arial',
          autoPage: false
        });
        
        // Sağ kolon tablosu
        const rightRows = rightCol.map(item => [
          { text: item.key, options: { bold: true, color: '4472C4', fontSize: 14 } },
          { text: item.value, options: { color: '555555', fontSize: 14 } }
        ]);
        
        detailsSlide.addTable(rightRows, {
          x: 5.5,
          y: 1.5,
          w: 4.5,
          colW: [1.5, 3],
          border: { type: 'none' },
          fontFace: 'Arial',
          autoPage: false
        });
        
        // Ürün bilgisi bölümü
        if (details.productInfo && details.productInfo.productName) {
          // Başlık için ayırıcı
          detailsSlide.addShape(pres.ShapeType.rect, { 
            x: 0.7, 
            y: 3.7, 
            w: 9.0, 
            h: 0.05, 
            fill: { color: '4472C4' }
          });
          
          detailsSlide.addText('Product Information', { 
            x: 0.7, 
            y: 3.8, 
            w: '90%', 
            fontSize: 20, 
            bold: true,
            fontFace: 'Arial',
            color: '333333'
          });
          
          // Ürün tablosu
          const productRows = [
            [
              { text: 'Product Name', options: { bold: true, color: '4472C4', fontSize: 14 } },
              { text: details.productInfo.productName, options: { color: '555555', fontSize: 14 } }
            ]
          ];
          
          if (details.productInfo.productCategory) {
            productRows.push([
              { text: 'Category', options: { bold: true, color: '4472C4', fontSize: 14 } },
              { text: details.productInfo.productCategory, options: { color: '555555', fontSize: 14 } }
            ]);
          }
          
          if (details.productInfo.pricingModel) {
            productRows.push([
              { text: 'Pricing Model', options: { bold: true, color: '4472C4', fontSize: 14 } },
              { text: details.productInfo.pricingModel, options: { color: '555555', fontSize: 14 } }
            ]);
          }
          
          detailsSlide.addTable(productRows, {
            x: 0.7,
            y: 4.2,
            w: 9.0,
            colW: [1.5, 7.5],
            border: { type: 'none' },
            fontFace: 'Arial',
            autoPage: false
          });
        }
        
        // Alt bilgi ekle
        detailsSlide.addText(`${presentationData.companyDetails?.companyName || presentationData.domain}`, { 
          x: 0.5, 
          y: 5.2, 
          fontSize: 10, 
          color: '666666',
          fontFace: 'Arial' 
        });
      }
      
      // uploads/presentations dizinini oluştur
      const uploadsDir = path.join(process.cwd(), 'uploads');
      const presentationsDir = path.join(uploadsDir, 'presentations');
      
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir);
      }
      
      if (!fs.existsSync(presentationsDir)) {
        fs.mkdirSync(presentationsDir);
      }
      
      // Benzersiz bir dosya adı oluştur
      const fileName = `${presentationData.domain.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pptx`;
      const filePath = path.join(presentationsDir, fileName);
      
      // PowerPoint'i kaydet
      await pres.writeFile({ fileName: filePath });
      console.log(`PowerPoint dosyası oluşturuldu: ${filePath}`);
      
      return filePath;
    } catch (error) {
      console.error('PowerPoint oluşturma hatası:', error);
      throw new Error('PowerPoint oluşturulurken bir hata oluştu: ' + (error as Error).message);
    }
  }
  
  /**
   * URL'den resmi indirir ve geçici dosya olarak kaydeder
   * @param imageUrl İndirilecek resmin URL'si
   * @returns İndirilen resmin dosya yolu veya null
   */
  private async downloadImage(imageUrl: string): Promise<string | null> {
    try {
      if (!imageUrl) return null;
      
      // URL için temel doğrulama
      if (typeof imageUrl !== 'string') {
        console.warn('Geçersiz resim URL türü:', typeof imageUrl);
        return null;
      }
      
      // Önce temp dizininin varlığını kontrol et
      const tempDir = path.join(process.cwd(), 'uploads', 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // URL kontrolü yap
      if (!imageUrl.startsWith('http') && !imageUrl.startsWith('data:')) {
        // Göreceli URL olabilir, tam URL oluştur
        if (imageUrl.startsWith('/')) {
          // Domain eklemeye çalış
          try {
            const domain = new URL(imageUrl).origin;
            imageUrl = domain + imageUrl;
          } catch (urlError) {
            console.warn('Göreceli URL tam URL\'ye çevrilemedi:', imageUrl);
            return null;
          }
        } else {
          console.warn('Desteklenmeyen resim URL formatı:', imageUrl);
          return null;
        }
      }
      
      // Base64 kontrol et
      if (imageUrl.startsWith('data:image')) {
        try {
          const matches = imageUrl.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
          if (matches && matches.length === 3) {
            const fileExt = matches[1];
            const base64Data = matches[2];
            
            const filePath = path.join(tempDir, `${uuidv4()}.${fileExt}`);
            fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
            
            // Dosya varlığını son kez kontrol et
            if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
              console.log(`Base64 resim başarıyla kaydedildi: ${filePath}`);
              return filePath;
            } else {
              console.error('Base64 resim dosyası oluşturulamadı veya boş');
              return null;
            }
          } else {
            console.error('Geçersiz base64 resim formatı');
            return null;
          }
        } catch (base64Error) {
          console.error('Base64 resim işleme hatası:', base64Error);
          return null;
        }
      }
      
      // HTTP(S) resmi indir
      const downloadPromise: Promise<string | null> = new Promise((resolve, reject) => {
        try {
          console.log(`Resim indirme başlatılıyor: ${imageUrl}`);
          
          // URL doğrulaması
          let parsedUrl: URL;
          try {
            parsedUrl = new URL(imageUrl);
          } catch (urlError) {
            console.error('Geçersiz URL formatı:', imageUrl);
            reject(new Error('Geçersiz URL formatı'));
            return;
          }
          
          // HTTP veya HTTPS protokolünü belirle
          const httpModule = parsedUrl.protocol === 'https:' ? https : http;
          
          const request = httpModule.get(imageUrl, (response) => {
            // Yönlendirme kontrolü
            if (response.statusCode === 301 || response.statusCode === 302) {
              if (response.headers.location) {
                console.log(`Yönlendirme algılandı: ${response.headers.location}`);
                // Yönlendirme URL'sinden indirme işlemini tekrarla
                this.downloadImage(response.headers.location)
                  .then(resolve)
                  .catch(reject);
                return;
              }
              reject(new Error('Yönlendirme URL\'si bulunamadı'));
              return;
            }
            
            // Başarısızlık kontrolü
            if (response.statusCode !== 200) {
              reject(new Error(`Resim indirilemedi, durum kodu: ${response.statusCode}`));
              return;
            }
            
            // Uzantıyı belirle
            let fileExt = 'png';
            const contentType = response.headers['content-type'];
            if (contentType) {
              if (contentType.includes('jpeg') || contentType.includes('jpg')) fileExt = 'jpg';
              else if (contentType.includes('png')) fileExt = 'png';
              else if (contentType.includes('gif')) fileExt = 'gif';
              else if (contentType.includes('svg')) fileExt = 'svg';
              else if (contentType.includes('webp')) fileExt = 'webp';
            }
            
            // Geçici dosya oluştur
            const uuid = uuidv4();
            const tempFilePath = path.join(tempDir, `${uuid}.${fileExt}`);
            const fileStream = fs.createWriteStream(tempFilePath);
            
            response.pipe(fileStream);
            
            fileStream.on('finish', () => {
              fileStream.close();
              
              // Dosya varlığını ve boyutunu kontrol et
              if (fs.existsSync(tempFilePath) && fs.statSync(tempFilePath).size > 0) {
                console.log(`Resim başarıyla indirildi: ${tempFilePath}`);
                resolve(tempFilePath);
              } else {
                console.error('İndirilen resim dosyası bulunamadı veya boş');
                reject(new Error('İndirilen resim dosyası oluşturulamadı'));
              }
            });
            
            fileStream.on('error', (err) => {
              console.error('Dosya yazma hatası:', err);
              
              // Başarısız dosyayı temizlemeye çalış
              try {
                if (fs.existsSync(tempFilePath)) {
                  fs.unlinkSync(tempFilePath);
                }
              } catch (unlinkErr) {
                console.error('Başarısız dosya silinemedi:', unlinkErr);
              }
              
              reject(err);
            });
          });
          
          request.on('error', (err) => {
            console.error('HTTP istek hatası:', err);
            reject(err);
          });
          
          // Zaman aşımı ekle
          request.setTimeout(15000, () => {
            request.destroy();
            reject(new Error('Resim indirme zaman aşımı'));
          });
        } catch (httpError) {
          console.error('HTTP istek oluşturma hatası:', httpError);
          reject(httpError);
        }
      });
      
      try {
        return await downloadPromise;
      } catch (error) {
        console.error('Resim indirme başarısız:', error);
        return null;
      }
    } catch (error) {
      console.error('Resim indirme genel hatası:', error);
      return null;
    }
  }
} 