import axios, { AxiosError } from 'axios';
import {
  User,
  Gender,
  BloodGroup,
  EmergencyContact,
} from '@/store/auth';

export interface RegisterPayload {
  name: string;
  phone: string;
  password: string;
  email?: string;
  gender?: Gender;
  bloodGroup?: BloodGroup;
  responderEnabled?: boolean;
  isPolice?: boolean;
  emergencyContacts?: EmergencyContact[];
}

export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

const api = axios.create({ baseURL: API_URL, timeout: 10_000 });

function extractMessage(err: unknown): string {
  if (err instanceof AxiosError) {
    return err.response?.data?.error ?? err.message;
  }
  return err instanceof Error ? err.message : 'Something went wrong.';
}

export async function loginUser(phone: string, password: string): Promise<User> {
  try {
    const { data } = await api.post<User>('/auth/login', { phone, password });
    return data;
  } catch (err) {
    throw new Error(extractMessage(err));
  }
}

export async function registerUser(payload: RegisterPayload): Promise<User> {
  try {
    const { data } = await api.post<User>('/auth/register', payload);
    return data;
  } catch (err) {
    throw new Error(extractMessage(err));
  }
}

export type OtpChannel = 'sms' | 'email';

export async function sendOtp(channel: OtpChannel, target: string): Promise<void> {
  try {
    await api.post('/auth/otp/send', { channel, target });
  } catch (err) {
    throw new Error(extractMessage(err));
  }
}

export async function verifyOtp(
  channel: OtpChannel,
  target: string,
  code: string
): Promise<void> {
  try {
    await api.post('/auth/otp/verify', { channel, target, code });
  } catch (err) {
    throw new Error(extractMessage(err));
  }
}

export async function setResponderMode(token: string, enabled: boolean): Promise<void> {
  try {
    await api.post(
      '/auth/responder',
      { enabled },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch (err) {
    throw new Error(extractMessage(err));
  }
}

export async function registerFCMToken(
  userId: string,
  token: string,
  fcmToken: string
): Promise<void> {
  try {
    await api.post(
      '/auth/fcm-token',
      { userId, fcmToken },
      { headers: { Authorization: `Bearer ${token}` } }
    );
  } catch {
    // Non-critical — push notifications simply won't work for this session
  }
}
