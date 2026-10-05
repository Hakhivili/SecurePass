import { create } from 'zustand';
import { DEFAULT_SETTINGS, type AppSettings } from '@shared/types';
import { getApi, getErrorMessage } from '../services/ipc';

interface SettingsState {
  settings: AppSettings;
  loading: boolean;
  error: string | null;
  load: () => Promise<void>;
  update: (patch: Partial<AppSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: { ...DEFAULT_SETTINGS },
  loading: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      set({ settings: await getApi().settings.get(), loading: false });
    } catch (error) {
      set({ loading: false, error: getErrorMessage(error) });
    }
  },

  update: async (patch) => {
    try {
      set({ settings: await getApi().settings.update(patch), error: null });
    } catch (error) {
      set({ error: getErrorMessage(error) });
      throw error;
    }
  },
}));
