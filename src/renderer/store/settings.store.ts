import { create } from 'zustand';
import { DEFAULT_SETTINGS, type AppSettings } from '@shared/types';
import { getApi } from '../services/ipc';
import { readUiPreferences, writeUiPreferences } from '../utils/ui-preferences';

interface SettingsState {
  settings: AppSettings;
  loading: boolean;
  /** 保存原始错误对象，由界面按当前语言本地化。 */
  error: unknown;
  load: () => Promise<void>;
  update: (patch: Partial<AppSettings>) => Promise<void>;
}

// 未解锁时读不到加密设置，用上次缓存的界面偏好作为初始值，避免主题/语言跳变。
const cached = readUiPreferences();

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: { ...DEFAULT_SETTINGS, theme: cached.theme, language: cached.language },
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const settings = await getApi().settings.get();
      writeUiPreferences({ theme: settings.theme, language: settings.language });
      set({ settings, loading: false });
    } catch (error) {
      set({ loading: false, error });
    }
  },

  update: async (patch) => {
    try {
      const settings = await getApi().settings.update(patch);
      writeUiPreferences({ theme: settings.theme, language: settings.language });
      set({ settings, error: null });
    } catch (error) {
      set({ error });
      throw error;
    }
  },
}));
