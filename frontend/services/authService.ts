import { apiFetch } from './apiClient';
import { User } from '../types';

export function getCurrentUser(): Promise<User> {
  return apiFetch<User>('/auth/current');
}

export function wechatLogin(code: string): Promise<User> {
  const encoded = encodeURIComponent(code);
  return apiFetch<User>(`/auth/wechat/login?code=${encoded}`);
}

export function logout(): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/auth/logout', { method: 'POST' });
}

