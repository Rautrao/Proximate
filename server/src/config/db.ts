import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGO_URI ?? 'mongodb://localhost:27017/proximate';
  await mongoose.connect(uri);
  console.log(`MongoDB connected → ${uri}`);
}
