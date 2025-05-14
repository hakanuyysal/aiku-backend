// src/routes/clickTrackRoutes.ts

import { Router } from 'express';
import {
    getAllClickTracks,
    getClickTrackByElementId,
    createClickTrack,
    incrementClickCount,
} from '../controllers/clickTrackController';

const router = Router();

/**
 * @route   GET /api/click
 * @desc    Retrieve all click track entries, sorted by click count
 */
router.get('/', getAllClickTracks);

/**
 * @route   GET /api/click/:elementId
 * @desc    Retrieve a single click track by its elementId
 */
router.get('/:elementId', getClickTrackByElementId);

/**
 * @route   POST /api/click
 * @desc    Create a new click track entry
 * @body    { elementId: string, elementType: 'button'|'link', pageUrl?: string }
 */
router.post('/', createClickTrack);

/**
 * @route   PATCH /api/click/:elementId/click
 * @desc    Increment the clickCount for a given elementId
 */
router.patch('/:elementId/click', incrementClickCount);

export default router;
