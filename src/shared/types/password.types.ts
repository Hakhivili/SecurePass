export interface PasswordConfig {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludeAmbiguous: boolean;
}

/**
 * 生成器提示项。主进程只返回稳定的「提示码」，由渲染层按当前语言翻译，
 * 这样接口不绑定任何一种语言。
 */
export type GeneratorWarningCode = 'short-length' | 'low-entropy' | 'letters-only';

export interface GeneratedPassword {
  password: string;
  entropyBits: number;
  charsetSize: number;
  warningCodes: GeneratorWarningCode[];
}

/** 强度改进建议码，同样由渲染层负责本地化。 */
export type StrengthSuggestionCode =
  'empty' | 'too-short' | 'mix-character-classes' | 'avoid-repeats';

export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  entropyBits: number;
  suggestionCodes: StrengthSuggestionCode[];
}

export const DEFAULT_PASSWORD_CONFIG: PasswordConfig = {
  length: 16,
  includeUppercase: true,
  includeLowercase: true,
  includeNumbers: true,
  includeSymbols: true,
  excludeAmbiguous: false,
};
