import type { MessageKey } from '../i18n/messages';

export interface NavItem {
  key: string;
  labelKey: MessageKey;
}

export const NAV_ITEMS: NavItem[] = [
  { key: '/workbench', labelKey: 'nav.workbench' },
  { key: '/settings', labelKey: 'nav.settings' },
];
