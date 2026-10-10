import { describe, expect, it } from 'vitest';
import type { VaultSummary } from '@shared/types';
import { filterItems } from '../../../src/renderer/store/vault.store';

/**
 * 验收标准第 12 项：性能 —— 1000 条记录的常规搜索目标低于 300 ms。
 * 这里测的是渲染层实际使用的搜索路径（`filterItems`）。
 */
const ITEM_COUNT = 1000;
const BUDGET_MS = 300;

function buildItems(count: number): VaultSummary[] {
  return Array.from({ length: count }, (_unused, index) => ({
    id: `id-${index}`,
    title: `站点 ${index}`,
    username: `user${index}@example.com`,
    url: `https://service-${index}.example.com/login`,
    category: index % 5 === 0 ? '工作' : '个人',
    tags: index % 3 === 0 ? ['重要', '常用'] : ['备用'],
    createdAt: index,
    updatedAt: index,
    isFavorite: index % 7 === 0,
  }));
}

function measure(callback: () => void): number {
  const started = performance.now();
  callback();
  return performance.now() - started;
}

describe('搜索性能（1000 条记录）', () => {
  it('多次关键字搜索合计低于 300 ms，并输出实测值', () => {
    const items = buildItems(ITEM_COUNT);
    const queries = ['工作', 'user500', 'service-999', '重要', '不存在的关键字'];

    // 预热，避免首次调用的 JIT 开销被计入（也顺带验证正确性）
    expect(filterItems(items, '工作').length).toBeGreaterThan(0);

    const elapsed = measure(() => {
      for (const query of queries) {
        filterItems(items, query);
      }
    });

    // eslint-disable-next-line no-console
    console.log(
      `[perf] filterItems：${ITEM_COUNT} 条记录 × ${queries.length} 次查询 = ${elapsed.toFixed(2)} ms（预算 ${BUDGET_MS} ms）`,
    );
    expect(elapsed).toBeLessThan(BUDGET_MS);
  });

  it('单次查询低于 300 ms', () => {
    const items = buildItems(ITEM_COUNT);
    filterItems(items, '工作');
    const elapsed = measure(() => {
      filterItems(items, 'user1');
    });
    // eslint-disable-next-line no-console
    console.log(`[perf] filterItems：单次查询 = ${elapsed.toFixed(2)} ms`);
    expect(elapsed).toBeLessThan(BUDGET_MS);
  });

  it('搜索结果保持正确（不因数据量增大而失真）', () => {
    const items = buildItems(ITEM_COUNT);
    expect(filterItems(items, 'service-999')).toHaveLength(1);
    // user1 / user10-19 / user100-199 的账号都以 "user1" 开头
    expect(filterItems(items, 'user1')).toHaveLength(111);
    expect(filterItems(items, 'nope')).toHaveLength(0);
  });
});
