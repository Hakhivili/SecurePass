import { describe, expect, it } from 'vitest';
import { DEFAULT_PASSWORD_CONFIG } from '@shared/types';
import { ErrorCode } from '@shared/errors';
import { PasswordService } from '@main/services/password.service';

const service = new PasswordService();

describe('PasswordService', () => {
  it('generates a password with the requested length', () => {
    for (let length = 8; length <= 20; length += 1) {
      const result = service.generatePassword({ ...DEFAULT_PASSWORD_CONFIG, length });
      expect([...result.password]).toHaveLength(length);
    }
  });

  it('includes at least one character from every selected class', () => {
    const config = { ...DEFAULT_PASSWORD_CONFIG, length: 12 };
    for (let attempt = 0; attempt < 25; attempt += 1) {
      const password = service.generatePassword(config).password;
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/[a-z]/.test(password)).toBe(true);
      expect(/[0-9]/.test(password)).toBe(true);
      expect(/[^A-Za-z0-9]/.test(password)).toBe(true);
    }
  });

  it('excludes ambiguous characters when requested', () => {
    const result = service.generatePassword({
      ...DEFAULT_PASSWORD_CONFIG,
      length: 20,
      excludeAmbiguous: true,
    });
    expect(result.password).not.toMatch(/[0O1lI|]/);
  });

  it('rejects a config without any character class', () => {
    expect(() =>
      service.generatePassword({
        ...DEFAULT_PASSWORD_CONFIG,
        includeUppercase: false,
        includeLowercase: false,
        includeNumbers: false,
        includeSymbols: false,
      }),
    ).toThrowError(expect.objectContaining({ code: ErrorCode.InvalidInput }));
  });

  it('rejects out-of-range lengths', () => {
    expect(() =>
      service.generatePassword({ ...DEFAULT_PASSWORD_CONFIG, length: 7 }),
    ).toThrowError(expect.objectContaining({ code: ErrorCode.InvalidInput }));
  });

  it('validates generated passwords against the config', () => {
    const config = { ...DEFAULT_PASSWORD_CONFIG, length: 16, includeSymbols: false };
    const password = service.generatePassword(config).password;
    expect(service.satisfiesConfig(password, config)).toBe(true);
  });

  it('reports low entropy configs with a warning instead of a security claim', () => {
    const result = service.generatePassword({
      ...DEFAULT_PASSWORD_CONFIG,
      length: 8,
      includeUppercase: false,
      includeNumbers: false,
      includeSymbols: false,
    });
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
