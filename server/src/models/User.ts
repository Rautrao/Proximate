import { Schema, model, Document, Types } from 'mongoose';

export interface EmergencyContact {
  name: string;
  phone: string;
  relation: string;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  phone: string;
  passwordHash: string;
  fcmToken?: string;
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  isActive: boolean;
  lastSeen: Date;
  emergencyContacts: EmergencyContact[];
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    fcmToken: { type: String },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
    },
    isActive: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    emergencyContacts: [
      {
        name: { type: String, required: true },
        phone: { type: String, required: true },
        relation: { type: String, default: 'Contact' },
      },
    ],
  },
  { timestamps: true }
);

// Required for $nearSphere / $geoWithin queries
UserSchema.index({ location: '2dsphere' });

export const User = model<IUser>('User', UserSchema);
