import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISetting extends Document {
    key: string;
    value: string;
}

interface ISettingModel extends Model<ISetting> { }

const SettingSchema = new Schema<ISetting>(
    {
        key: { type: String, required: true, unique: true },
        value: { type: String, required: true }
    },
    {
        timestamps: false
    }
);

export const Setting: ISettingModel = mongoose.model<ISetting, ISettingModel>(
    'Setting',
    SettingSchema
);
