import { create } from 'zustand';
import { DEFAULT_SETTINGS, type AppSettings } from '@shared/types';
import { getApi } from '../services/ipc';
import { useAuthStore } from './auth.store';
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

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS, theme: cached.theme, language: cached.language },
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      // 主题 / 语言来自明文偏好文件，任何状态下都可读
      const ui = await getApi().uiPreferences.get();
      writeUiPreferences(ui);

      let settings: AppSettings = {
        ...DEFAULT_SETTINGS,
        theme: ui.theme,
        language: ui.language,
      };
      // 自动锁定 / 剪贴板属于加密负载，仅解锁后可读
      if (useAuthStore.getState().unlocked) {
        const vaultSettings = await getApi().settings.get();
        settings = { ...vaultSettings, theme: ui.theme, language: ui.language };
      }

      set({ settings, loading: false });
    } catch (error) {
      set({ loading: false, error });
    }
  },

  update: async (patch) => {
    try {
      const { theme, language, ...vaultPatch } = patch;
      let ui = { theme: get().settings.theme, language: get().settings.language };

      if (theme !== undefined || language !== undefined) {
        ui = await getApi().uiPreferences.update({ theme, language });
        writeUiPreferences(ui);
      }

      let vaultSettings = get().settings;
      if (Object.keys(vaultPatch).length > 0) {
        vaultSettings = await getApi().settings.update(vaultPatch);
      }

      set({
        settings: { ...vaultSettings, theme: ui.theme, language: ui.language },
        error: null,
      });
    } catch (error) {
      set({ error });
      throw error;
    }
  },
}));
