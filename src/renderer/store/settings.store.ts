import { create } from 'zustand';
import { DEFAULT_SETTINGS, type AppSettings, type UiPreferences } from '@shared/types';
import { getApi } from '../services/ipc';
import { useAuthStore } from './auth.store';
import { readUiPreferences, writeUiPreferences } from '../utils/ui-preferences';

interface SettingsState {
  /** 保险库设置（自动锁定、剪贴板）：需要解锁才能读写。 */
  settings: AppSettings;
  /** 界面偏好（主题、语言、强调色、生成器位置）：任何状态下都可读写。 */
  ui: UiPreferences;
  loading: boolean;
  /** 保存原始错误对象，由界面按当前语言本地化。 */
  error: unknown;
  load: () => Promise<void>;
  update: (patch: Partial<AppSettings>) => Promise<void>;
  updateUi: (patch: Partial<UiPreferences>) => Promise<void>;
}

// 首帧先用本地缓存，避免启动瞬间主题/布局跳变
const cached = readUiPreferences();

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS, theme: cached.theme, language: cached.language },
  ui: { ...cached },
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      // 界面偏好来自明文偏好文件，任何状态下都可读
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

      set({ settings, ui, loading: false });
    } catch (error) {
      set({ loading: false, error });
    }
  },

  update: async (patch) => {
    try {
      const { theme, language, ...vaultPatch } = patch;
      let ui = get().ui;

      // 主题/语言属于界面偏好，走明文偏好通道（无需解锁）
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
        ui,
        error: null,
      });
    } catch (error) {
      set({ error });
      throw error;
    }
  },

  updateUi: async (patch) => {
    try {
      const ui = await getApi().uiPreferences.update(patch);
      writeUiPreferences(ui);
      set({
        ui,
        settings: { ...get().settings, theme: ui.theme, language: ui.language },
        error: null,
      });
    } catch (error) {
      set({ error });
      throw error;
    }
  },
}));
