import express from 'express';
import { getPanelUsers, createPanelUser, loginPanelUser } from '../controllers/panelUserController';

const router = express.Router();

router.get('/', getPanelUsers);
router.post('/', createPanelUser);
router.post('/signin', loginPanelUser);

export default router; 