import axios, { AxiosError } from 'axios';
import { User } from '@/store/auth';

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

export async function registerUser(
  name: string,
  phone: string,
  password: string
): Promise<User> {
  try {
    const { data } = await api.post<User>('/auth/register', { name, phone, password });
    return data;
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
