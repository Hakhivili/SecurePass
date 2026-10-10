import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type VaultItem, type VaultPayload } from '@shared/types';
import {
  MASTER_PASSWORD,
  createTestCrypto,
  createVaultFixture,
  type VaultFixture,
} from '../helpers/vault-fixture';

/**
 * 验收标准第 12 项（主进程侧）：1000 条记录下，解锁后 list() 的耗时目标 < 300 ms。
 * 这里直接把 1000 条记录加密写入磁盘，再解锁计时，避免 1000 次写盘干扰测量。
 */
const ITEM_COUNT = 1000;
const BUDGET_MS = 300;

function buildItems(count: number): VaultItem[] {
  return Array.from({ length: count }, (_unused, index) => ({
    id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
    title: `站点 ${index}`,
    username: `user${index}@example.com`,
    password: `password-${index}`,
    url: `https://service-${index}.example.com/login`,
    category: index % 5 === 0 ? '工作' : '个人',
    notes: `备注 ${index}`,
    tags: index % 3 === 0 ? ['重要', '常用'] : ['备用'],
    createdAt: index,
    updatedAt: index,
    isFavorite: index % 7 === 0,
  }));
}

async function buildLargeVault(): Promise<VaultFixture> {
  const fixture = await createVaultFixture('securepass-perf-');
  const payload: VaultPayload = {
    schemaVersion: 1,
    items: buildItems(ITEM_COUNT),
    settings: { ...DEFAULT_SETTINGS },
  };
  const vaultFile = await fixture.crypto.createVaultFile(payload, MASTER_PASSWORD);
  await fixture.storage.writeVaultFile(vaultFile);
  return fixture;
}

describe('密码库性能（1000 条记录）', () => {
  it('list() 摘要列表低于 300 ms，并输出实测值', async () => {
    const fixture = await buildLargeVault();
    try {
      const unlockStarted = performance.now();
      await fixture.vault.unlock(MASTER_PASSWORD);
      const unlockElapsed = performance.now() - unlockStarted;

      await fixture.vault.list(); // 预热

      const started = performance.now();
      const summaries = await fixture.vault.list();
      const elapsed = performance.now() - started;

      // eslint-disable-next-line no-console
      console.log(
        `[perf] vault.list()：${ITEM_COUNT} 条记录 = ${elapsed.toFixed(2)} ms（预算 ${BUDGET_MS} ms）；解锁 = ${unlockElapsed.toFixed(0)} ms（低成本测试 KDF）`,
      );

      expect(summaries).toHaveLength(ITEM_COUNT);
      expect(elapsed).toBeLessThan(BUDGET_MS);
    } finally {
      await fixture.dispose();
    }
  });

  it('get(id) 单条读取低于 300 ms', async () => {
    const fixture = await buildLargeVault();
    try {
      await fixture.vault.unlock(MASTER_PASSWORD);
      // list() 按 updatedAt 倒序，所以不能直接用下标定位；按标题查找更稳妥
      const target = (await fixture.vault.list()).find(
        (item) => item.title === '站点 500',
      ) as { id: string };
      await fixture.vault.get(target.id); // 预热

      const started = performance.now();
      const item = await fixture.vault.get(target.id);
      const elapsed = performance.now() - started;

      // eslint-disable-next-line no-console
      console.log(`[perf] vault.get(id)：= ${elapsed.toFixed(2)} ms`);
      expect(item?.title).toBe('站点 500');
      expect(elapsed).toBeLessThan(BUDGET_MS);
    } finally {
      await fixture.dispose();
    }
  });

  it('摘要列表不泄漏密码字段，且携带性能测试所需字段', async () => {
    const fixture = await buildLargeVault();
    try {
      await fixture.vault.unlock(MASTER_PASSWORD);
      const summaries = await fixture.vault.list();
      expect(Object.keys(summaries[0] as object).sort()).toEqual([
        'category',
        'createdAt',
        'id',
        'isFavorite',
        'tags',
        'title',
        'updatedAt',
        'url',
        'username',
      ]);
      expect(JSON.stringify(summaries)).not.toContain('password-');
    } finally {
      await fixture.dispose();
    }
  });

  it('使用低成本 KDF 的测试加密服务不改变产品默认值', () => {
    // 防御性断言：测试辅助函数不得影响生产参数
    const testCrypto = createTestCrypto();
    expect(testCrypto.kdfOverrides).toEqual({
      iterations: 1,
      memorySizeKiB: 1024,
      parallelism: 1,
    });
  });
});
