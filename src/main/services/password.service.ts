import { randomInt } from 'node:crypto';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@shared/constants';
import { AppError, ErrorCode } from '@shared/errors';
import type {
  GeneratedPassword,
  GeneratorWarningCode,
  PasswordConfig,
  PasswordStrengthResult,
  StrengthSuggestionCode,
} from '@shared/types';

export const CHARSETS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?',
} as const;

const AMBIGUOUS_CHARACTERS = new Set('0O1lI|'.split(''));
const COMMON_PASSWORDS = new Set([
  'password',
  '123456',
  '12345678',
  'qwerty',
  'letmein',
  'admin',
  'welcome',
  'iloveyou',
  'monkey',
  'dragon',
]);

export class PasswordService {
  generatePassword(config: PasswordConfig): GeneratedPassword {
    const { charset, requiredSets } = buildCharset(config);
    const characters: string[] = [];

    for (const set of requiredSets) {
      characters.push(pickRandom(set));
    }
    while (characters.length < config.length) {
      characters.push(pickRandom(charset));
    }

    shuffle(characters);
    const password = characters.join('');
    const entropyBits = config.length * Math.log2(charset.length);
    return {
      password,
      entropyBits: round(entropyBits, 2),
      charsetSize: charset.length,
      warningCodes: buildWarningCodes(config, entropyBits),
    };
  }

  satisfiesConfig(password: string, config: PasswordConfig): boolean {
    if ([...password].length !== config.length) return false;
    const { requiredSets } = buildCharset(config);
    return requiredSets.every((set) =>
      [...set].some((character) => password.includes(character)),
    );
  }

  calculateStrength(password: string): PasswordStrengthResult {
    const characters = [...password];
    if (characters.length === 0) {
      return { score: 0, entropyBits: 0, suggestionCodes: ['empty'] };
    }

    const poolSize = estimatePoolSize(password);
    let entropyBits = characters.length * Math.log2(poolSize);
    const uniqueRatio = new Set(characters).size / characters.length;
    if (uniqueRatio < 0.5) entropyBits *= 0.6;
    if (/^(.)\1+$/.test(password)) entropyBits = Math.min(entropyBits, 8);
    if (/^(?:0123|1234|abcd|qwerty|asdf)/i.test(password)) entropyBits *= 0.7;
    if (COMMON_PASSWORDS.has(password.toLowerCase()))
      entropyBits = Math.min(entropyBits, 10);

    const score = scoreEntropy(entropyBits);
    const suggestionCodes: StrengthSuggestionCode[] = [];
    if (characters.length < 12) suggestionCodes.push('too-short');
    if (countCharacterClasses(password) < 3)
      suggestionCodes.push('mix-character-classes');
    if (uniqueRatio < 0.6) suggestionCodes.push('avoid-repeats');

    return {
      score,
      entropyBits: round(entropyBits, 1),
      suggestionCodes,
    };
  }
}

export function buildCharset(config: PasswordConfig): {
  charset: string;
  requiredSets: string[];
} {
  validateConfig(config);
  const requiredSets: string[] = [];
  if (config.includeUppercase)
    requiredSets.push(filterAmbiguous(CHARSETS.uppercase, config));
  if (config.includeLowercase)
    requiredSets.push(filterAmbiguous(CHARSETS.lowercase, config));
  if (config.includeNumbers) requiredSets.push(filterAmbiguous(CHARSETS.numbers, config));
  if (config.includeSymbols) requiredSets.push(filterAmbiguous(CHARSETS.symbols, config));

  if (requiredSets.some((set) => set.length === 0)) {
    throw new AppError(
      ErrorCode.InvalidInput,
      '排除规则导致某个字符集为空，无法生成密码',
    );
  }

  return { charset: requiredSets.join(''), requiredSets };
}

export function validateConfig(config: PasswordConfig): void {
  if (!Number.isInteger(config.length)) {
    throw new AppError(ErrorCode.InvalidInput, '密码长度必须是整数');
  }
  if (config.length < PASSWORD_MIN_LENGTH || config.length > PASSWORD_MAX_LENGTH) {
    throw new AppError(
      ErrorCode.InvalidInput,
      `密码长度必须在 ${PASSWORD_MIN_LENGTH} 到 ${PASSWORD_MAX_LENGTH} 之间`,
    );
  }
  if (
    !config.includeUppercase &&
    !config.includeLowercase &&
    !config.includeNumbers &&
    !config.includeSymbols
  ) {
    throw new AppError(ErrorCode.InvalidInput, '至少选择一种字符类型');
  }
}

function filterAmbiguous(charset: string, config: PasswordConfig): string {
  if (!config.excludeAmbiguous) return charset;
  return [...charset]
    .filter((character) => !AMBIGUOUS_CHARACTERS.has(character))
    .join('');
}

function pickRandom(charset: string): string {
  const index = randomInt(0, charset.length);
  return charset[index] as string;
}

function shuffle(values: string[]): void {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const target = randomInt(0, index + 1);
    const current = values[index] as string;
    values[index] = values[target] as string;
    values[target] = current;
  }
}

function buildWarningCodes(
  config: PasswordConfig,
  entropyBits: number,
): GeneratorWarningCode[] {
  const warnings: GeneratorWarningCode[] = [];
  if (config.length < 12) warnings.push('short-length');
  if (entropyBits < 60) warnings.push('low-entropy');
  if (!config.includeSymbols && !config.includeNumbers) warnings.push('letters-only');
  return warnings;
}

function estimatePoolSize(password: string): number {
  let size = 0;
  if (/[a-z]/.test(password)) size += 26;
  if (/[A-Z]/.test(password)) size += 26;
  if (/[0-9]/.test(password)) size += 10;
  if (/[^A-Za-z0-9]/.test(password)) size += 33;
  return Math.max(size, 1);
}

function countCharacterClasses(password: string): number {
  return [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;
}

function scoreEntropy(entropyBits: number): 0 | 1 | 2 | 3 | 4 {
  if (entropyBits < 28) return 0;
  if (entropyBits < 45) return 1;
  if (entropyBits < 70) return 2;
  if (entropyBits < 100) return 3;
  return 4;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
