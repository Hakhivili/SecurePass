import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '@shared/types';
import type { VaultPayload } from '@shared/types';
import { validatePayload } from '@main/services/vault.service';
import { createVaultFixture, MASTER_PASSWORD } from '../helpers/vault-fixture';

const DRAFT = { title: '站点', username: 'user', password: 'secret', tags: [] };

function makePayload(items: unknown[]): VaultPayload {
  return {
    schemaVersion: 1,
    items,
    settings: { ...DEFAULT_SETTINGS },
  } as unknown as VaultPayload;
}

describe('负载结构校验与修补', () => {
  it('补齐缺失的 id 与时间戳，并报告「已修补」', () => {
    const payload = makePayload([{ ...DRAFT }]);

    expect(validatePayload(payload)).toBe(true);

    const [item] = payload.items;
    expect(item?.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(Number.isFinite(item?.createdAt)).toBe(true);
    expect(item?.updatedAt).toBe(item?.createdAt);
  });

  it('合法负载不需要修补', () => {
    const payload = makePayload([{ ...DRAFT, id: 'item-a', createdAt: 1, updatedAt: 2 }]);

    expect(validatePayload(payload)).toBe(false);
    expect(payload.items[0]?.id).toBe('item-a');
    expect(payload.items[0]?.updatedAt).toBe(2);
  });

  it('重复 id 会被重新分配，保证记录能被精确定位', () => {
    const payload = makePayload([
      { ...DRAFT, id: 'same', createdAt: 1, updatedAt: 1 },
      { ...DRAFT, id: 'same', createdAt: 1, updatedAt: 1 },
    ]);

    expect(validatePayload(payload)).toBe(true);
    expect(payload.items[0]?.id).toBe('same');
    expect(payload.items[1]?.id).not.toBe('same');
  });

  it('解锁时修补缺失 id 的旧库，并把结果写回磁盘', async () => {
    const fixture = await createVaultFixture();
    try {
      // 直接用不带 id / 时间戳的负载生成密文文件，模拟早期版本写出的库
      const file = await fixture.crypto.createVaultFile(
        makePayload([{ ...DRAFT }]),
        MASTER_PASSWORD,
      );
      await fixture.storage.writeVaultFile(file);

      await fixture.vault.unlock(MASTER_PASSWORD);
      const summaries = await fixture.vault.list();
      expect(summaries).toHaveLength(1);
      const repairedId = summaries[0]?.id;
      expect(repairedId).toBeTruthy();
      expect(Number.isFinite(summaries[0]?.updatedAt)).toBe(true);

      // 修补结果已落盘：重新解密后 id 不变
      const written = await fixture.storage.readVaultFile();
      const reopened = await fixture.crypto.openVaultFile(written, MASTER_PASSWORD);
      expect(reopened.payload.items[0]?.id).toBe(repairedId);
    } finally {
      await fixture.dispose();
    }
  });

  it('丢弃旧版本写在加密负载里的 theme/language 遗留字段', async () => {
    const fixture = await createVaultFixture();
    try {
      const legacyPayload = {
        schemaVersion: 1,
        items: [],
        settings: { ...DEFAULT_SETTINGS, theme: 'dark', language: 'en' },
      } as unknown as VaultPayload;

      expect(validatePayload(legacyPayload)).toBe(true);
      expect(Object.keys(legacyPayload.settings).sort()).toEqual([
        'autoLockTimeoutMinutes',
        'clearClipboardSeconds',
      ]);

      const file = await fixture.crypto.createVaultFile(legacyPayload, MASTER_PASSWORD);
      await fixture.storage.writeVaultFile(file);
      await fixture.vault.unlock(MASTER_PASSWORD);

      expect(await fixture.vault.getSettings()).toEqual({ ...DEFAULT_SETTINGS });

      const written = await fixture.storage.readVaultFile();
      const reopened = await fixture.crypto.openVaultFile(written, MASTER_PASSWORD);
      expect(Object.keys(reopened.payload.settings).sort()).toEqual([
        'autoLockTimeoutMinutes',
        'clearClipboardSeconds',
      ]);
    } finally {
      await fixture.dispose();
    }
  });
});
