export interface PasswordConfig {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludeAmbiguous: boolean;
}

export interface GeneratedPassword {
  password: string;
  entropyBits: number;
  charsetSize: number;
  warnings: string[];
}

export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  entropyBits: number;
  suggestions: string[];
}

export const DEFAULT_PASSWORD_CONFIG: PasswordConfig = {
  length: 16,
  includeUppercase: true,
  includeLowercase: true,
  includeNumbers: true,
  includeSymbols: true,
  excludeAmbiguous: false,
};
