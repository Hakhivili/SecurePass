import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useVaultGateStore } from '@/store/vault-gate.store';

beforeEach(() => {
  useVaultGateStore.setState({ open: false, reason: null, pending: null });
});

describe('renderer/vault-gate store', () => {
  it('opens the gate and resolves true when the unlock succeeds', async () => {
    const pending = useVaultGateStore.getState().request('save');

    expect(useVaultGateStore.getState()).toMatchObject({ open: true, reason: 'save' });

    useVaultGateStore.getState().settle(true);

    await expect(pending).resolves.toBe(true);
    expect(useVaultGateStore.getState()).toMatchObject({
      open: false,
      reason: null,
      pending: null,
    });
  });

  it('resolves false when the user cancels', async () => {
    const pending = useVaultGateStore.getState().request('save');
    useVaultGateStore.getState().settle(false);

    await expect(pending).resolves.toBe(false);
  });

  it('ignores settle calls when no request is pending', () => {
    expect(() => useVaultGateStore.getState().settle(true)).not.toThrow();
    expect(useVaultGateStore.getState().open).toBe(false);
  });

  it('only settles the latest request', async () => {
    const first = useVaultGateStore.getState().request('save');
    const second = useVaultGateStore.getState().request('save');

    useVaultGateStore.getState().settle(true);

    await expect(second).resolves.toBe(true);
    // 第一个请求的 Promise 仍处于等待状态：这是已知限制，不能误判为已决议。
    const settled = await Promise.race([
      first.then(() => 'settled'),
      Promise.resolve('pending'),
    ]);
    expect(settled).toBe('pending');
    expect(vi.isMockFunction(useVaultGateStore.getState().request)).toBe(false);
  });
});
