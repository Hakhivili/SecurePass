import { describe, expect, it } from 'vitest';
import { VAULT_PASSWORD_MIN_LENGTH } from '@shared/constants';
import { formatDateTime } from '@/utils/format';
import { masterPasswordErrorKey } from '@/utils/validation';

describe('renderer/format', () => {
  it('formats timestamps for both supported languages', () => {
    const timestamp = Date.UTC(2026, 10, 11, 3, 5);

    const zh = formatDateTime(timestamp);
    expect(zh).toContain('2026');
    expect(zh).not.toContain('NaN');

    const en = formatDateTime(timestamp, 'en');
    expect(en).toContain('2026');
    expect(en).not.toBe(zh);
  });
});

describe('renderer/validation', () => {
  it('requires the documented minimum length', () => {
    expect(masterPasswordErrorKey('')).toBe('validation.masterTooShort');
    expect(masterPasswordErrorKey('a'.repeat(VAULT_PASSWORD_MIN_LENGTH - 1))).toBe(
      'validation.masterTooShort',
    );
    expect(masterPasswordErrorKey('a'.repeat(VAULT_PASSWORD_MIN_LENGTH))).toBeNull();
  });

  it('counts code points instead of UTF-16 units', () => {
    const emoji = '😀'.repeat(VAULT_PASSWORD_MIN_LENGTH);

    expect(emoji.length).toBe(VAULT_PASSWORD_MIN_LENGTH * 2);
    expect(masterPasswordErrorKey(emoji)).toBeNull();
  });
});
