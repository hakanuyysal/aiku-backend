import { promises as fs } from 'fs';
import path from 'path';

// Cache veri tipi
interface CacheData<T> {
  data: T;
  timestamp: number;
  nextUpdate: number;
}

// Cache yönetim sınıfı
export class ExchangeRateCache {
  private static instance: ExchangeRateCache;
  private cacheMap: Map<string, CacheData<any>> = new Map();
  private cacheDir: string;
  private cacheFile: string;

  private constructor() {
    // Cache dosyasının yolu
    this.cacheDir = path.join(process.cwd(), 'cache');
    this.cacheFile = path.join(this.cacheDir, 'exchange_rates.json');
    
    // Cache klasörünü oluştur (eğer yoksa)
    this.ensureCacheDirectory();
    
    // Başlangıçta cache dosyasını yükle
    this.loadCacheFromDisk();
  }

  // Singleton pattern ile tek instance oluştur
  public static getInstance(): ExchangeRateCache {
    if (!ExchangeRateCache.instance) {
      ExchangeRateCache.instance = new ExchangeRateCache();
    }
    return ExchangeRateCache.instance;
  }

  // Cache klasörünün varlığını kontrol et ve yoksa oluştur
  private async ensureCacheDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
    } catch (error) {
      console.error('Cache dizini oluşturulurken hata:', error);
    }
  }

  // Cache verisini diskten yükle
  private async loadCacheFromDisk(): Promise<void> {
    try {
      const data = await fs.readFile(this.cacheFile, 'utf-8');
      const parsedData = JSON.parse(data);
      
      // JSON'dan Map'e dönüştür
      Object.keys(parsedData).forEach(key => {
        this.cacheMap.set(key, parsedData[key]);
      });
      
      console.log('💾 Döviz kuru cache dosyası başarıyla yüklendi');
    } catch (error) {
      // Dosya yoksa veya okuma hatası olursa boş cache ile devam et
      console.log('💾 Döviz kuru cache dosyası bulunamadı, yeni oluşturulacak');
    }
  }

  // Cache verisini diske kaydet
  private async saveCacheToDisk(): Promise<void> {
    try {
      // Map'i JSON'a dönüştür
      const cacheObject: Record<string, CacheData<any>> = {};
      this.cacheMap.forEach((value, key) => {
        cacheObject[key] = value;
      });
      
      await fs.writeFile(this.cacheFile, JSON.stringify(cacheObject, null, 2), 'utf-8');
      console.log('💾 Döviz kuru cache dosyası güncellendi');
    } catch (error) {
      console.error('Cache dosyası kaydedilirken hata:', error);
    }
  }

  // Veriyi cache'e ekle veya güncelle
  public async set<T>(key: string, data: T, expirationMs: number = 12 * 60 * 60 * 1000): Promise<void> {
    const now = Date.now();
    const cacheItem: CacheData<T> = {
      data,
      timestamp: now,
      nextUpdate: now + expirationMs
    };
    
    this.cacheMap.set(key, cacheItem);
    await this.saveCacheToDisk();
  }

  // Cache'den veri al
  public get<T>(key: string): { data: T | null, expired: boolean } {
    const cacheItem = this.cacheMap.get(key) as CacheData<T> | undefined;
    
    if (!cacheItem) {
      return { data: null, expired: true };
    }
    
    const now = Date.now();
    const expired = now >= cacheItem.nextUpdate;
    
    return {
      data: cacheItem.data,
      expired
    };
  }

  // Belirli bir anahtara ait cache'i temizle
  public async remove(key: string): Promise<void> {
    this.cacheMap.delete(key);
    await this.saveCacheToDisk();
  }

  // Tüm cache'i temizle
  public async clear(): Promise<void> {
    this.cacheMap.clear();
    await this.saveCacheToDisk();
  }
} 