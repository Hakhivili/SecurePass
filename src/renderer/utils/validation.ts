import { VAULT_PASSWORD_MIN_LENGTH } from '@shared/constants';
import type { MessageKey } from '../i18n/messages';

/**
 * 返回错误消息的字典键（由调用方按当前语言翻译），
 * 通过校验时返回 null。
 */
export function masterPasswordErrorKey(value: string): MessageKey | null {
  if ([...value].length < VAULT_PASSWORD_MIN_LENGTH) return 'validation.masterTooShort';
  return null;
}
