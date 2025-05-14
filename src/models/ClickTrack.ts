// src/models/ClickTrack.ts

import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IClickTrack extends Document {
    elementId: string;
    elementType: 'button' | 'link';
    pageUrl?: string;
    clickCount: number;
    clickHistory: { timestamp: Date }[];
    createdAt: Date;
    updatedAt: Date;
}

interface IClickTrackModel extends Model<IClickTrack> { }

const clickTrackSchema = new Schema<IClickTrack>(
    {
        elementId: {
            type: String,
            required: [true, 'Element ID is required'],
            trim: true,
            index: true,
        },
        elementType: {
            type: String,
            required: [true, 'Element type is required'],
            enum: ['button', 'link'],
        },
        pageUrl: {
            type: String,
            trim: true,
        },
        clickCount: {
            type: Number,
            default: 0,
            min: [0, 'Click count cannot be negative'],
        },
        clickHistory: [
            {
                timestamp: {
                    type: Date,
                    default: Date.now,
                    required: true,
                }
            }
        ]
    },
    {
        timestamps: true, // Automatically adds createdAt & updatedAt
    }
);

// (Optional) You could add instance or static methods here, e.g. to increment clicks:
// clickTrackSchema.methods.increment = function() {
//   this.clickCount += 1;
//   return this.save();
// };

export const ClickTrack = mongoose.model<IClickTrack, IClickTrackModel>(
    'ClickTrack',
    clickTrackSchema
);
