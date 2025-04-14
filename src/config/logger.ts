import winston from 'winston';
import 'winston-daily-rotate-file';
import path from 'path';
import fs from 'fs';

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

// Log formatı
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Terminal için renkli log formatı
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
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

// İstek bilgilerini formatlayan yardımcı fonksiyon
export const formatRequestLog = (req: any) => {
  const { method, url, headers, body, query, params } = req;
  return {
    method,
    url,
    headers: {
      'user-agent': headers['user-agent'],
      'content-type': headers['content-type'],
      'authorization': headers['authorization'] ? 'Bearer ********' : undefined,
      origin: headers.origin,
      referer: headers.referer,
    },
    body: body && Object.keys(body).length ? sanitizeBody(body) : undefined,
    query: query && Object.keys(query).length ? query : undefined,
    params: params && Object.keys(params).length ? params : undefined,
  };
};

// Yanıt bilgilerini formatlayan yardımcı fonksiyon
export const formatResponseLog = (res: any, responseTime?: number) => {
  return {
    statusCode: res.statusCode,
    statusMessage: res.statusMessage,
    responseTime: responseTime ? `${responseTime}ms` : undefined,
  };
};

// Hassas verileri * ile değiştiren fonksiyon
const sanitizeBody = (body: any) => {
  const sanitized = { ...body };
  
  // Hassas alanları maskele
  const sensitiveFields = ['password', 'oldPassword', 'newPassword', 'token', 'accessToken', 'refreshToken', 'secret', 'credit_card', 'cardNumber', 'cvv', 'cvc', 'pin'];
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '********';
    }
  });
  
  return sanitized;
};

export default logger; 