import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { VaultItemDraft } from '@shared/types';
import { ClipboardService } from '@main/services/clipboard.service';
import { attachLockHandlers } from '@main/app-context';
import {
  createVaultFixture,
  MASTER_PASSWORD,
  type VaultFixture,
} from '../helpers/vault-fixture';

const clipboardStub = vi.hoisted(() => {
  const state = { text: '' };
  return {
    state,
    writeText: (value: string) => {
      state.text = value;
    },
    readText: () => state.text,
    clear: () => {
      state.text = '';
    },
  };
});

vi.mock('electron', () => ({ clipboard: clipboardStub }));

function draft(overrides: Partial<VaultItemDraft> = {}): VaultItemDraft {
  return {
    title: '公司邮箱',
    username: 'alice@example.com',
    password: 'S3cret-Pa55word!',
    url: 'https://mail.example.com',
    notes: '',
    category: '工作',
    tags: ['邮箱'],
    isFavorite: false,
    ...overrides,
  };
}

describe('锁库与剪贴板联动', () => {
  let fixture: VaultFixture;
  let service: ClipboardService;

  beforeEach(async () => {
    clipboardStub.state.text = '';
    fixture = await createVaultFixture('securepass-lock-clipboard-');
    service = new ClipboardService();
    attachLockHandlers(fixture.vault, service);
    await fixture.vault.create(MASTER_PASSWORD);
  });

  afterEach(async () => {
    service.dispose();
    await fixture.dispose();
  });

  it('手动锁库后清掉自己复制的密码', async () => {
    const item = await fixture.vault.createItem(draft());
    service.copySecret(item.password, 30);
    expect(clipboardStub.state.text).toBe(item.password);

    fixture.vault.lock();

    expect(clipboardStub.state.text).toBe('');
  });

  it('锁库不会抹掉用户后来自己复制的内容', async () => {
    service.copySecret('S3cret-Pa55word!', 30);
    clipboardStub.writeText('用户后来复制的普通文本');

    fixture.vault.lock();

    expect(clipboardStub.state.text).toBe('用户后来复制的普通文本');
  });

  it('自动锁定同样会清理剪贴板', async () => {
    vi.useFakeTimers();
    const autoLockFixture = await createVaultFixture('securepass-lock-clipboard-auto-');
    try {
      attachLockHandlers(autoLockFixture.vault, service);
      await autoLockFixture.vault.create(MASTER_PASSWORD);
      const item = await autoLockFixture.vault.createItem(draft());
      service.copySecret(item.password, 3_600);
      // 系统空闲远超阈值；离开时长会被拉齐到会话时长，因此要推进到 5 分钟之后
      autoLockFixture.vault.setActivitySource({
        idleSeconds: () => 3_600,
        isWindowFocused: () => true,
      });

      await vi.advanceTimersByTimeAsync(5 * 60_000 + 5_000);

      expect((await autoLockFixture.vault.status()).unlocked).toBe(false);
      expect(clipboardStub.state.text).toBe('');
    } finally {
      await autoLockFixture.dispose();
      vi.useRealTimers();
    }
  });

  it('没有解锁时锁库不会误清剪贴板', async () => {
    clipboardStub.writeText('别的应用的密码');

    fixture.vault.lock();

    expect(clipboardStub.state.text).toBe('别的应用的密码');
  });
});
