import { create } from 'zustand';
import { getApi } from '../services/ipc';

interface AuthState {
  initialized: boolean;
  unlocked: boolean;
  loading: boolean;
  busy: boolean;
  /** 保存原始错误对象，由界面按当前语言本地化（主进程只提供错误码）。 */
  error: unknown;
  bootstrap: () => Promise<void>;
  createVault: (masterPassword: string) => Promise<boolean>;
  unlock: (masterPassword: string) => Promise<boolean>;
  lock: () => Promise<void>;
  handleLocked: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  initialized: false,
  unlocked: false,
  loading: true,
  busy: false,
  error: null,

  bootstrap: async () => {
    try {
      const status = await getApi().vault.status();
      set({ initialized: status.initialized, unlocked: status.unlocked, loading: false });
    } catch (error) {
      set({ loading: false, error });
    }
  },

  createVault: async (masterPassword) => {
    set({ busy: true, error: null });
    try {
      await getApi().vault.create(masterPassword);
      set({ initialized: true, unlocked: true, busy: false });
      return true;
    } catch (error) {
      set({ busy: false, error });
      return false;
    }
  },

  unlock: async (masterPassword) => {
    set({ busy: true, error: null });
    try {
      await getApi().vault.unlock(masterPassword);
      set({ unlocked: true, busy: false });
      return true;
    } catch (error) {
      set({ busy: false, error });
      return false;
    }
  },

  lock: async () => {
    try {
      await getApi().vault.lock();
    } finally {
      set({ unlocked: false });
    }
  },

  handleLocked: () => set({ unlocked: false }),
  clearError: () => set({ error: null }),
}));
