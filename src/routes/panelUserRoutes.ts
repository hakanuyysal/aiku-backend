import express from 'express';
import { getPanelUsers, createPanelUser } from '../controllers/panelUserController';

const router = express.Router();

router.get('/', getPanelUsers);
router.post('/', createPanelUser);

export default router; 