import { create } from 'zustand';

export type VaultGateReason = 'save';

interface VaultGateState {
  open: boolean;
  reason: VaultGateReason | null;
  pending: ((confirmed: boolean) => void) | null;
  /** 请求解锁：弹出对话框并等待结果；解锁成功返回 true，取消返回 false。 */
  request: (reason: VaultGateReason) => Promise<boolean>;
  settle: (confirmed: boolean) => void;
}

/**
 * 「按需解锁」门控：密码生成器可直接使用，只有在需要写入/读取密码库时
 * 才弹出主密码对话框（布局合并后由 `VaultAccessGate` 渲染这个对话框）。
 */
export const useVaultGateStore = create<VaultGateState>((set, get) => ({
  open: false,
  reason: null,
  pending: null,

  request: (reason) =>
    new Promise<boolean>((resolve) => {
      set({ open: true, reason, pending: resolve });
    }),

  settle: (confirmed) => {
    const pending = get().pending;
    set({ open: false, reason: null, pending: null });
    pending?.(confirmed);
  },
}));
