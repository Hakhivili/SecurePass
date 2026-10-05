import type { AppSettings } from './settings.types';

export interface VaultItem {
  id: string;
  title: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  category?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  lastUsed?: number;
  isFavorite: boolean;
}

export type VaultItemDraft = Omit<
  VaultItem,
  'id' | 'createdAt' | 'updatedAt' | 'lastUsed'
> & {
  lastUsed?: number;
};

export interface VaultPayload {
  schemaVersion: number;
  items: VaultItem[];
  settings: AppSettings;
}

export interface VaultSummary {
  id: string;
  title: string;
  username: string;
  url?: string;
  category?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  isFavorite: boolean;
}
