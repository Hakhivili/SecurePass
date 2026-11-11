import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VaultActivitySource } from '@main/services/vault.service';
import { ErrorCode } from '@shared/errors';
import { createVaultFixture, MASTER_PASSWORD } from '../helpers/vault-fixture';

/** 默认自动锁定是 5 分钟（`DEFAULT_SETTINGS.autoLockTimeoutMinutes`）。 */
const FIVE_MINUTES = 5 * 60_000;
const POLL_INTERVAL = 5_000;

function activitySource(
  idleSeconds: () => number,
  focused: () => boolean,
): VaultActivitySource {
  return { idleSeconds, isWindowFocused: focused };
}

describe('自动锁定', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('用户一直在操作时不会因为「没有密码库 IPC」被误锁', async () => {
    vi.useFakeTimers();
    const fixture = await createVaultFixture();
    try {
      await fixture.vault.create(MASTER_PASSWORD);
      // 鼠标键盘一直在动、窗口在前台，但没有任何密码库 IPC
      fixture.vault.setActivitySource(
        activitySource(
          () => 0,
          () => true,
        ),
      );

      await vi.advanceTimersByTimeAsync(FIVE_MINUTES * 2);

      await expect(fixture.vault.status()).resolves.toMatchObject({ unlocked: true });
    } finally {
      await fixture.dispose();
    }
  });

  it('系统空闲到点后由轮询锁定（不依赖下一次 IPC 调用）', async () => {
    vi.useFakeTimers();
    const fixture = await createVaultFixture();
    try {
      await fixture.vault.create(MASTER_PASSWORD);
      // 用户离开电脑：系统空闲时间随会话一起增长到阈值以上
      fixture.vault.setActivitySource(
        activitySource(
          () => FIVE_MINUTES / 1000,
          () => true,
        ),
      );

      await vi.advanceTimersByTimeAsync(FIVE_MINUTES + POLL_INTERVAL);

      await expect(fixture.vault.status()).resolves.toMatchObject({ unlocked: false });
    } finally {
      await fixture.dispose();
    }
  });

  it('解锁前的系统空闲时间不会让人刚解锁就被锁回去', async () => {
    vi.useFakeTimers();
    const fixture = await createVaultFixture();
    try {
      await fixture.vault.create(MASTER_PASSWORD);
      // 系统空闲已经远超阈值（解锁前用户就离开过电脑），但会话刚刚开始
      fixture.vault.setActivitySource(
        activitySource(
          () => (FIVE_MINUTES * 2) / 1000,
          () => true,
        ),
      );

      await vi.advanceTimersByTimeAsync(POLL_INTERVAL * 3);

      await expect(fixture.vault.status()).resolves.toMatchObject({ unlocked: true });
    } finally {
      await fixture.dispose();
    }
  });

  it('窗口失焦时长同样计入离开时间', async () => {
    vi.useFakeTimers();
    const fixture = await createVaultFixture();
    try {
      await fixture.vault.create(MASTER_PASSWORD);
      // 系统空闲为 0（用户在别的应用里打字），但本窗口没有焦点
      fixture.vault.setActivitySource(
        activitySource(
          () => 0,
          () => false,
        ),
      );

      await vi.advanceTimersByTimeAsync(FIVE_MINUTES + POLL_INTERVAL);

      await expect(fixture.vault.status()).resolves.toMatchObject({ unlocked: false });
    } finally {
      await fixture.dispose();
    }
  });

  it('没有活动来源时退化为「从最后一次密码库操作开始计时」', async () => {
    vi.useFakeTimers();
    const fixture = await createVaultFixture();
    try {
      await fixture.vault.create(MASTER_PASSWORD);

      await vi.advanceTimersByTimeAsync(FIVE_MINUTES + POLL_INTERVAL);

      await expect(fixture.vault.status()).resolves.toMatchObject({ unlocked: false });
      await expect(fixture.vault.list()).rejects.toMatchObject({
        code: ErrorCode.VaultLocked,
      });
    } finally {
      await fixture.dispose();
    }
  });
});
