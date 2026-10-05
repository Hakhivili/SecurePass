import type { SecurePassApi } from '@shared/types';

export function getApi(): SecurePassApi {
  if (typeof window === 'undefined' || !window.securepass) {
    throw new Error('SecurePass 桌面桥接未加载');
  }
  return window.securepass;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return '操作失败，请重试';
}
