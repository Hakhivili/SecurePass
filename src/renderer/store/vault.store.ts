import { create } from 'zustand';
import type { VaultItem, VaultItemDraft, VaultSummary } from '@shared/types';
import { getApi } from '../services/ipc';

interface VaultState {
  items: VaultSummary[];
  loading: boolean;
  /** 是否成功加载过列表（重复录入检查依赖它判断数据是否可信）。 */
  loaded: boolean;
  /** 保存原始错误对象，由界面按当前语言本地化。 */
  error: unknown;
  load: () => Promise<void>;
  createItem: (draft: VaultItemDraft) => Promise<VaultItem>;
  updateItem: (id: string, draft: VaultItemDraft) => Promise<VaultItem>;
  deleteItem: (id: string) => Promise<void>;
  clear: () => void;
}

export const useVaultStore = create<VaultState>((set, get) => ({
  items: [],
  loading: false,
  loaded: false,
  error: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      set({ items: await getApi().vault.list(), loading: false, loaded: true });
    } catch (error) {
      set({ loading: false, loaded: false, error });
    }
  },

  createItem: async (draft) => {
    const item = await getApi().vault.createItem(draft);
    await get().load();
    return item;
  },

  updateItem: async (id, draft) => {
    const item = await getApi().vault.updateItem(id, draft);
    await get().load();
    return item;
  },

  deleteItem: async (id) => {
    await getApi().vault.deleteItem(id);
    await get().load();
  },

  clear: () => set({ items: [], loaded: false, error: null }),
}));

export function filterItems(items: VaultSummary[], query: string): VaultSummary[] {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return items;
  return items.filter((item) =>
    [item.title, item.username, item.url ?? '', item.category ?? '', ...item.tags]
      .join('\n')
      .toLowerCase()
      .includes(keyword),
  );
}
