// src/models/ClaimRequest.ts

import mongoose, { Document, Model, Schema } from 'mongoose';

export type ClaimStatus = 'Pending' | 'Approved' | 'Rejected';

export interface IClaimRequest extends Document {
    company: mongoose.Schema.Types.ObjectId;
    user: mongoose.Schema.Types.ObjectId;
    status: ClaimStatus;
    createdAt: Date;
    updatedAt: Date;
}

const claimRequestSchema = new Schema<IClaimRequest>(
    {
        company: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: true,
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        status: {
            type: String,
            enum: ['Pending', 'Approved', 'Rejected'],
            default: 'Pending',
        },
    },
    {
        timestamps: true,
    }
);

export const ClaimRequest: Model<IClaimRequest> =
    mongoose.model<IClaimRequest>('ClaimRequest', claimRequestSchema);
