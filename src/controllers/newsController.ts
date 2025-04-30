import { Request, Response } from 'express';
import axios from 'axios';
import { Article } from '../models/Article';
import { Setting } from '../models/Setting';

const NEWS_API_KEY = process.env.NEWS_API_KEY!;
const QUERY = process.env.QUERY!;

/**
 * NewsAPI’dan yeni haberleri çekip MongoDB’ye kaydeder.
 */
export const fetchAndStoreNews = async (): Promise<void> => {
    // 1) Son çekim zamanını oku
    let setting = await Setting.findOne({ key: 'lastFetchedAt' });
    if (!setting) {
        setting = new Setting({
            key: 'lastFetchedAt',
            value: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
        });
    }
    const from = setting.value;

    // **DEBUG LOG**: fonksiyon gerçekten çağrıldı mı, hangi tarihten çekiyor?
    console.log('>> [DEBUG] fetchAndStoreNews çalıştı, from:', from);

    // 2) NewsAPI çağrısı
    const response = await axios.get('https://newsapi.org/v2/everything', {
        params: { apiKey: NEWS_API_KEY, q: QUERY, /* from, */ pageSize: 100, sortBy: 'publishedAt' }
      });

    // **DEBUG LOG**: NewsAPI kaç makale döndürüyor?
    console.log('>> [DEBUG] NewsAPI returned articles count:', response.data.articles.length);

    // 3) Upsert döngüsü
    for (const a of response.data.articles) {
        await Article.updateOne(
            { url: a.url },
            {
                $setOnInsert: {
                    source: a.source,
                    author: a.author,
                    title: a.title,
                    description: a.description,
                    url: a.url,
                    urlToImage: a.urlToImage,
                    publishedAt: new Date(a.publishedAt),
                    content: a.content,
                }
            },
            { upsert: true }
        );
    }

    // 4) Ayarı güncelle
    setting.value = new Date().toISOString();
    await setting.save();
    console.log('>> [DEBUG] Upsert bitti.');
};


/**
 * (Opsiyonel) HTTP isteği ile haberleri güncellemek için:
 * GET /news/fetch
 */
export const manualFetchNews = async (req: Request, res: Response) => {
    try {
        await fetchAndStoreNews();
        res.json({ success: true, message: 'Haberler başarıyla güncellendi.' });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Haber çekme sırasında hata', error: err.message });
    }
};

/**
 * GET /news?limit=20&page=1
 * Veritabanındaki haberleri listeler (default: son 20)
 */
export const getNews = async (req: Request, res: Response) => {
    try {
        const limit = parseInt((req.query.limit as string) ?? '20', 10);
        const page = parseInt((req.query.page as string) ?? '1', 10);
        const skip = (page - 1) * limit;

        const articles = await Article
            .find({})
            .sort({ publishedAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Article.countDocuments();
        res.json({ success: true, page, limit, total, articles });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Haberleri listelerken hata', error: err.message });
    }
};

/**
 * GET /news/:id
 * Tek bir haberi ID ile getirir
 */
export const getNewsById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const article = await Article.findById(id);
        if (!article) {
            return res.status(404).json({ success: false, message: 'Haber bulunamadı' });
        }
        res.json({ success: true, article });
    } catch (err: any) {
        res.status(500).json({ success: false, message: 'Haber getirirken hata', error: err.message });
    }
};
