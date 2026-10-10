import type { MessageKey } from '../i18n/messages';

export interface NavItem {
  key: string;
  labelKey: MessageKey;
}

export const NAV_ITEMS: NavItem[] = [
  { key: '/generator', labelKey: 'nav.generator' },
  { key: '/vault', labelKey: 'nav.vault' },
  { key: '/settings', labelKey: 'nav.settings' },
];
