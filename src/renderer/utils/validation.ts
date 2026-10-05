import { VAULT_PASSWORD_MIN_LENGTH } from '@shared/constants';

export function validateMasterPassword(value: string): string | null {
  if ([...value].length < VAULT_PASSWORD_MIN_LENGTH) {
    return `主密码至少需要 ${VAULT_PASSWORD_MIN_LENGTH} 个字符`;
  }
  return null;
}
