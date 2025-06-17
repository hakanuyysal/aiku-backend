import { Router } from 'express';
import {
    createInvestmentNews,
    updateInvestmentNews,
    deleteInvestmentNews,
    getAllInvestmentNews,
    getInvestmentNewsById
} from '../controllers/investmentNewsController';

const router = Router();

// Yatırım haberi oluştur
router.post('/', createInvestmentNews);

// Tüm yatırım haberlerini getir
router.get('/', getAllInvestmentNews);

// Belirli bir haberi getir
router.get('/:id', getInvestmentNewsById);

// Belirli bir haberi güncelle
router.put('/:id', updateInvestmentNews);

// Belirli bir haberi sil
router.delete('/:id', deleteInvestmentNews);

export default router;
