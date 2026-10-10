import { ErrorCode, type ErrorCodeValue } from '@shared/errors';
import type { SecurePassApi } from '@shared/types';
import type { Translate } from '../i18n';
import type { MessageKey } from '../i18n/messages';

export function getApi(): SecurePassApi {
  if (typeof window === 'undefined' || !window.securepass) {
    throw new Error('SecurePass 桌面桥接未加载');
  }
  return window.securepass;
}

/** preload 抛出的错误带有 `code`（来自主进程的 AppError）。 */
export function getErrorCode(error: unknown): ErrorCodeValue | undefined {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (
      typeof code === 'string' &&
      Object.values(ErrorCode).includes(code as ErrorCodeValue)
    ) {
      return code as ErrorCodeValue;
    }
  }
  return undefined;
}

export function errorMessageKey(code: ErrorCodeValue | undefined): MessageKey {
  return (code ? `error.${code}` : 'error.UNKNOWN') as MessageKey;
}

/**
 * 优先按错误码本地化（主进程只给出稳定错误码），
 * 未知错误再回退到错误消息本身或通用文案。
 */
export function getErrorMessage(error: unknown, t?: Translate): string {
  const code = getErrorCode(error);
  if (code && t) return t(errorMessageKey(code));
  if (error instanceof Error && error.message) return error.message;
  return t ? t('error.UNKNOWN') : '操作失败，请重试';
}
