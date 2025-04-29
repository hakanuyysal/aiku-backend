// src/controllers/clickTrackController.ts

import { Request, Response, NextFunction } from 'express';
import { ClickTrack, IClickTrack } from '../models/ClickTrack';

/**
 * Get all click tracks, sorted by clickCount descending.
 */
export const getAllClickTracks = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const tracks: IClickTrack[] = await ClickTrack
            .find()
            .select('elementId elementType pageUrl clickCount createdAt updatedAt -_id')
            .sort({ clickCount: -1 });
        res.status(200).json(tracks);
    } catch (error) {
        next(error);
    }
};

/**
 * Get a single click track by elementId.
 */
export const getClickTrackByElementId = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { elementId } = req.params;
        const track = await ClickTrack.findOne({ elementId })
            .select('elementId elementType pageUrl clickCount createdAt updatedAt -_id');
        if (!track) {
            res.status(404).json({ message: `No ClickTrack found for elementId "${elementId}"` });
            return;
        }
        res.status(200).json(track);
    } catch (error) {
        next(error);
    }
};

/**
 * Create a new click track entry.
 */
export const createClickTrack = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { elementId, elementType, pageUrl } = req.body;
        const exists = await ClickTrack.findOne({ elementId });
        if (exists) {
            res.status(400).json({ message: `ClickTrack for elementId "${elementId}" already exists` });
            return;
        }
        const track = await ClickTrack.create({ elementId, elementType, pageUrl });
        res.status(201).json(track);
    } catch (error) {
        next(error);
    }
};

/**
 * Increment clickCount for a given elementId by 1.
 */
export const incrementClickCount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { elementId } = req.params;
        const track = await ClickTrack.findOneAndUpdate(
            { elementId },
            { $inc: { clickCount: 1 } },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        ).select('elementId clickCount -_id');
        res.status(200).json(track);
    } catch (error) {
        next(error);
    }
};
