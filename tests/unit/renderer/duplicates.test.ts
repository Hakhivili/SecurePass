import { describe, expect, it } from 'vitest';
import type { VaultSummary } from '@shared/types';
import { findDuplicateItems, normalizeUrl } from '../../../src/renderer/utils/duplicates';

function summary(partial: Partial<VaultSummary> & { id: string }): VaultSummary {
  return {
    title: '',
    username: '',
    tags: [],
    createdAt: 0,
    updatedAt: 0,
    isFavorite: false,
    ...partial,
  };
}

const items: VaultSummary[] = [
  summary({
    id: '1',
    title: '工作邮箱',
    username: 'alice@example.com',
    url: 'https://mail.example.com/login?tenant=a',
  }),
  summary({
    id: '2',
    title: '论坛',
    username: 'bob',
    url: 'https://www.bbs.example.org/',
  }),
  summary({ id: '3', title: '路由器', username: 'admin' }),
];

describe('normalizeUrl', () => {
  it('忽略协议、www.、查询串与末尾斜杠', () => {
    expect(normalizeUrl('https://www.Example.com/Path/?a=1#x')).toBe('example.com/path');
    expect(normalizeUrl('  EXAMPLE.com  ')).toBe('example.com');
    expect(normalizeUrl(undefined)).toBe('');
  });
});

describe('findDuplicateItems', () => {
  it('网址与账号都相同时判定为高度重复', () => {
    const found = findDuplicateItems(items, {
      title: '另一个名字',
      username: 'ALICE@example.com ',
      url: 'http://mail.example.com/login',
    });
    expect(found).toHaveLength(1);
    expect(found[0]?.reason).toBe('same-url-and-username');
    expect(found[0]?.item.id).toBe('1');
  });

  it('只有网址相同时也会提醒', () => {
    const found = findDuplicateItems(items, { title: '新记录', url: 'bbs.example.org' });
    expect(found[0]?.reason).toBe('same-url');
    expect(found[0]?.item.id).toBe('2');
  });

  it('名称与账号都相同时提醒（无网址场景）', () => {
    const found = findDuplicateItems(items, { title: '路由器', username: 'admin' });
    expect(found[0]?.reason).toBe('same-title-and-username');
    expect(found[0]?.item.id).toBe('3');
  });

  it('只有名称相同时按较低置信度提醒', () => {
    const found = findDuplicateItems(items, { title: '工作邮箱' });
    expect(found).toHaveLength(1);
    expect(found[0]?.reason).toBe('same-title');
    expect(found[0]?.score).toBe(1);
  });

  it('编辑自身时不会把自己判为重复', () => {
    const found = findDuplicateItems(
      items,
      { title: '工作邮箱', username: 'alice@example.com', url: 'mail.example.com' },
      '1',
    );
    expect(found).toHaveLength(0);
  });

  it('没有可比较信息时不做判定', () => {
    expect(findDuplicateItems(items, {})).toEqual([]);
    expect(findDuplicateItems(items, { username: 'nobody' })).toEqual([]);
  });

  it('多个候选项按置信度排序', () => {
    const found = findDuplicateItems(
      [
        summary({ id: 'a', title: '工作邮箱' }),
        summary({ id: 'b', title: '工作', url: 'mail.example.com/login' }),
        summary({
          id: 'c',
          title: '别名',
          username: 'ALICE@example.com',
          url: 'https://www.mail.example.com/login',
        }),
      ],
      {
        title: '工作邮箱',
        username: 'alice@example.com',
        url: 'https://mail.example.com/login',
      },
    );
    expect(found.map((candidate) => candidate.item.id)).toEqual(['c', 'b', 'a']);
  });
});
