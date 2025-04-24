import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';
import geoip from 'geoip-lite';
import * as UAParser from 'ua-parser-js';
import { Request } from 'express';

// Log dosyaları için klasör oluşturma
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Log seviye tanımları
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Mevcut ortam kontrolü (development, production, test)
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'info';
};

// Log renkleri
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Winston renk teması ayarı
winston.addColors(colors);

// İstek detaylarını hazırlayan yardımcı fonksiyon
const prepareRequestDetails = (req?: Request) => {
  if (!req) return null;

  // IP adresi tespiti
  const ip = ((req.headers['x-forwarded-for'] as string) || 
             req.socket.remoteAddress || 
             req.ip || '').split(',')[0].trim();

  // GeoIP bilgisi
  const geo = ip ? geoip.lookup(ip) : null;

  // User-Agent parser
  const parser = new UAParser.UAParser();
  const userAgent = req.headers['user-agent'] || '';
  const result = parser.setUA(userAgent).getResult();

  return {
    ip,
    geoLocation: geo ? {
      country: geo.country,
      region: geo.region,
      city: geo.city,
      ll: geo.ll,
      timezone: geo.timezone
    } : null,
    device: {
      browser: {
        name: result.browser.name,
        version: result.browser.version
      },
      os: {
        name: result.os.name,
        version: result.os.version
      },
      device: {
        type: result.device.type,
        vendor: result.device.vendor,
        model: result.device.model
      }
    },
    request: {
      method: req.method,
      url: req.url,
      path: req.path,
      protocol: req.protocol,
      host: req.get('host'),
      headers: {
        'user-agent': req.headers['user-agent'],
        'accept-language': req.headers['accept-language'],
        'content-type': req.headers['content-type'],
        'referer': req.headers['referer'],
        'origin': req.headers['origin']
      },
      query: req.query
    },
    user: req.user ? {
      id: (req.user as any).id,
      email: (req.user as any).email
    } : null
  };
};

// Hassas verileri temizleyen fonksiyon
const sanitizeData = (data: any): any => {
  if (!data) return data;
  
  if (typeof data === 'object') {
    const sanitized = Array.isArray(data) ? [...data] : { ...data };
    const sensitiveFields = [
      'password', 'token', 'apiKey', 'secret', 'creditCard',
      'cardNumber', 'cvv', 'pin', 'ssn', 'accessToken', 
      'refreshToken', 'authorization'
    ];

    for (const key in sanitized) {
      if (sensitiveFields.includes(key.toLowerCase())) {
        sanitized[key] = '********';
      } else if (typeof sanitized[key] === 'object') {
        sanitized[key] = sanitizeData(sanitized[key]);
      }
    }
    return sanitized;
  }
  return data;
};

// Log formatı
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf((info: any) => {
    // Meta bilgileri hazırla
    const meta: any = {
      timestamp: info.timestamp,
      level: info.level,
      message: info.message
    };

    // Ek bilgileri ekle
    Object.keys(info).forEach(key => {
      if (!['timestamp', 'level', 'message'].includes(key)) {
        meta[key] = info[key];
      }
    });

    // Express Request objesi varsa detayları ekle
    if (info.req) {
      meta.requestDetails = prepareRequestDetails(info.req as Request);
    }

    // Hassas verileri temizle
    const sanitizedMeta = sanitizeData(meta);

    // Stack trace varsa ekle
    if (info.stack) {
      sanitizedMeta.stack = info.stack;
    }

    // JSON formatında döndür
    return JSON.stringify(sanitizedMeta, null, 2);
  })
);

// Terminal için renkli log formatı
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf((info: any) => {
    const meta: any = {
      timestamp: info.timestamp,
      level: info.level,
      message: info.message
    };

    // Ek bilgileri ekle
    Object.keys(info).forEach(key => {
      if (!['timestamp', 'level', 'message'].includes(key)) {
        meta[key] = info[key];
      }
    });

    if (info.req) {
      meta.requestDetails = prepareRequestDetails(info.req as Request);
    }

    const sanitizedMeta = sanitizeData(meta);
    return JSON.stringify(sanitizedMeta, null, 2);
  })
);

// Döner dosya transport ayarı (error logları için)
const errorRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level: 'error',
});

// Döner dosya transport ayarı (tüm loglar için)
const combinedRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logDir, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
});

// HTTP requestleri için özel döner dosya transport
const httpRotateTransport = new winston.transports.DailyRotateFile({
  filename: path.join(logDir, 'http-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level: 'http',
});

// Transport'lar
const transports = [
  // Console transport
  new winston.transports.Console({
    format: consoleFormat,
  }),
  // Dosya transport'ları
  errorRotateTransport,
  combinedRotateTransport,
  httpRotateTransport,
];

// Logger oluşturma
const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});

// Logger'ı dışa aktar
export default logger;

// Yardımcı fonksiyonları da dışa aktar
export const formatRequestLog = (req: Request) => prepareRequestDetails(req);
export const formatResponseLog = (res: any, responseTime?: number) => ({
  statusCode: res.statusCode,
  statusMessage: res.statusMessage,
  responseTime: responseTime ? `${responseTime}ms` : undefined,
  headers: res.getHeaders()
}); 