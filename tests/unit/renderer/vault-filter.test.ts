import { describe, expect, it } from 'vitest';
import type { VaultSummary } from '@shared/types';
import { filterItems } from '../../../src/renderer/store/vault.store';

const items: VaultSummary[] = [
  {
    id: '1',
    title: '工作邮箱',
    username: 'alice@example.com',
    url: 'https://mail.example.com',
    category: '工作',
    tags: ['重要'],
    createdAt: 1,
    updatedAt: 1,
    isFavorite: false,
  },
  {
    id: '2',
    title: '论坛',
    username: 'bob',
    tags: [],
    createdAt: 2,
    updatedAt: 2,
    isFavorite: false,
  },
];

describe('filterItems', () => {
  it('matches title, username, url, category and tags', () => {
    expect(filterItems(items, '工作')).toHaveLength(1);
    expect(filterItems(items, 'alice')).toHaveLength(1);
    expect(filterItems(items, 'mail.example')).toHaveLength(1);
    expect(filterItems(items, '重要')).toHaveLength(1);
  });

  it('returns all items for a blank query and none for an unknown query', () => {
    expect(filterItems(items, '   ')).toHaveLength(2);
    expect(filterItems(items, 'nope')).toHaveLength(0);
  });
});
