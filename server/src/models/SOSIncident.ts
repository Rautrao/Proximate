import { Schema, model, Document, Types } from 'mongoose';

interface EscalationLogEntry {
  tier: number;
  radius: number;
  notifiedCount: number;
  at: Date;
}

interface ResponderEntry {
  userId: Types.ObjectId;
  name: string;
  distance: number;
  acknowledgedAt: Date;
}

export interface ISOSIncident extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  status: 'active' | 'cancelled' | 'resolved';
  currentTier: number;
  location: {
    type: 'Point';
    coordinates: [number, number];
  };
  responders: ResponderEntry[];
  escalationLog: EscalationLogEntry[];
  startedAt: Date;
  endedAt?: Date;
}

const SOSIncidentSchema = new Schema<ISOSIncident>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'resolved'],
    default: 'active',
    index: true,
  },
  currentTier: { type: Number, default: 1 },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  responders: [
    {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      name: String,
      distance: { type: Number, default: 0 },
      acknowledgedAt: { type: Date, default: Date.now },
    },
  ],
  // Forensic audit trail — every escalation is logged permanently
  escalationLog: [
    {
      tier: Number,
      radius: Number,
      notifiedCount: Number,
      at: { type: Date, default: Date.now },
    },
  ],
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
});

SOSIncidentSchema.index({ location: '2dsphere' });

export const SOSIncident = model<ISOSIncident>('SOSIncident', SOSIncidentSchema);
