import { describe, expect, it, vi } from 'vitest';
import { AppError, ErrorCode } from '@shared/errors';
import type { SecurePassApi } from '@shared/types';
import { errorMessageKey, getApi, getErrorCode, getErrorMessage } from '@/services/ipc';

describe('renderer/ipc error helpers', () => {
  it('recognises known error codes and rejects unknown ones', () => {
    expect(getErrorCode(new AppError(ErrorCode.VaultLocked, 'locked'))).toBe(
      ErrorCode.VaultLocked,
    );
    expect(getErrorCode({ code: 'NOT_A_REAL_CODE' })).toBeUndefined();
    expect(getErrorCode({ code: 42 })).toBeUndefined();
    expect(getErrorCode(null)).toBeUndefined();
    expect(getErrorCode(new Error('plain'))).toBeUndefined();
  });

  it('maps codes to translation keys', () => {
    expect(errorMessageKey(ErrorCode.VaultLocked)).toBe('error.VAULT_LOCKED');
    expect(errorMessageKey(undefined)).toBe('error.UNKNOWN');
  });

  it('prefers localised text for known codes, then the message, then a fallback', () => {
    const t = vi.fn((key: string) => `t:${key}`);

    expect(getErrorMessage(new AppError(ErrorCode.InvalidInput, 'bad'), t)).toBe(
      't:error.INVALID_INPUT',
    );
    expect(getErrorMessage(new Error('boom'), t)).toBe('boom');
    expect(getErrorMessage('not an error', t)).toBe('t:error.UNKNOWN');
    expect(getErrorMessage('not an error')).toBe('操作失败，请重试');
    expect(t).toHaveBeenCalledTimes(2);
  });

  it('throws a readable error when the preload bridge is missing', () => {
    expect(() => getApi()).toThrowError('SecurePass 桌面桥接未加载');
  });

  it('returns the bridge when it is available', () => {
    const api = { clipboard: {} } as unknown as SecurePassApi;
    Object.defineProperty(window, 'securepass', { value: api, configurable: true });

    expect(getApi()).toBe(api);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).securepass;
  });
});
