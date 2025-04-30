// routes/newsRoutes.ts
import { Router } from 'express';
import {
    manualFetchNews,
    getNews,
    getNewsById,
    fetchFullContentAll,
    fetchFullContentById,
    fetchMissingFullContent
} from '../controllers/newsController';

const router = Router();

// Opsiyonel: elle çekmek istersen
router.get('/fetch', manualFetchNews);

// Haber listeleme ve detay
router.get('/', getNews);
router.get('/:id', getNewsById);

router.get('/:id/full', fetchFullContentById);   // tek id için
router.post('/full/all', fetchFullContentAll); // tümü için
router.post('/full/missing', fetchMissingFullContent);

export default router;
