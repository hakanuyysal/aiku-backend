import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ITeamMember extends Document {
  firstName: string;
  lastName: string;
  title: string;
  profilePhoto?: string;
  company: mongoose.Schema.Types.ObjectId;
  companyName: string;
  createdAt: Date;
}

interface ITeamMemberModel extends Model<ITeamMember> {}

const teamMemberSchema = new Schema<ITeamMember>(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    profilePhoto: {
      type: String,
      trim: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Company ID is required'],
      ref: 'Company',
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// İsteğe bağlı: firstName ve lastName birleşimi ile fullName sanal alanı
teamMemberSchema.virtual('fullName').get(function (this: ITeamMember) {
  return `${this.firstName} ${this.lastName}`;
});

export const TeamMember = mongoose.model<ITeamMember, ITeamMemberModel>('TeamMember', teamMemberSchema);
