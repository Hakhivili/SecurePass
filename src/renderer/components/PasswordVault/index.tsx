import { useEffect, useMemo, useRef, useState } from 'react';
import { LockOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { App, Button, Select } from 'antd';
import type { InputRef } from 'antd';
import type { VaultItem, VaultItemDraft } from '@shared/types';
import { getApi, getErrorMessage } from '../../services/ipc';
import { useAuthStore } from '../../store/auth.store';
import { filterItems, useVaultStore } from '../../store/vault.store';
import { copySecret } from '../../utils/clipboard';
import { useDuplicateGuard } from '../../utils/use-duplicate-guard';
import { useHotkey } from '../../utils/hotkeys';
import { useI18n } from '../../i18n';
import VaultAccessPanel from '../Auth/VaultAccessPanel';
import VaultEditor from './VaultEditor';
import VaultItemDetail from './VaultItem';
import VaultList from './VaultList';
import VaultSearch from './VaultSearch';

const AUTO_LOCK_POLL_MS = 15_000;

/**
 * 密码库面板：未解锁时只渲染解锁/创建表单，解锁后才加载并展示记录。
 * 它与密码生成器同处一个页面，但生成器不受这里的锁定影响。
 */
export default function PasswordVault(): JSX.Element {
  const { message } = App.useApp();
  const { t } = useI18n();
  const unlocked = useAuthStore((state) => state.unlocked);
  const lock = useAuthStore((state) => state.lock);
  const items = useVaultStore((state) => state.items);
  const loading = useVaultStore((state) => state.loading);
  const error = useVaultStore((state) => state.error);
  const load = useVaultStore((state) => state.load);
  const createItem = useVaultStore((state) => state.createItem);
  const updateItem = useVaultStore((state) => state.updateItem);
  const deleteItem = useVaultStore((state) => state.deleteItem);
  const confirmIfDuplicate = useDuplicateGuard();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [editing, setEditing] = useState<VaultItem | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [detail, setDetail] = useState<VaultItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [autoLockAt, setAutoLockAt] = useState<number | null>(null);
  const searchRef = useRef<InputRef>(null);

  useEffect(() => {
    if (unlocked) void load();
  }, [unlocked, load]);

  // 锁定时必须立刻关闭编辑器与详情：否则明文密码还会留在内存和 DOM 里。
  useEffect(() => {
    if (unlocked) return;
    setEditorOpen(false);
    setDetailOpen(false);
    setEditing(null);
    setDetail(null);
  }, [unlocked]);

  // 自动锁定倒计时：锁定时间由主进程决定，这里只读取展示。
  useEffect(() => {
    if (!unlocked) {
      setAutoLockAt(null);
      return;
    }
    let cancelled = false;
    const poll = async (): Promise<void> => {
      try {
        const status = await getApi().vault.status();
        if (!cancelled) setAutoLockAt(status.autoLockAt);
      } catch {
        // 状态读取失败不影响使用；下一次轮询会重试
      }
    };
    void poll();
    const timer = window.setInterval(() => void poll(), AUTO_LOCK_POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [unlocked]);

  const categories = useMemo(() => {
    const unique = new Set<string>();
    for (const item of items) {
      if (item.category) unique.add(item.category);
    }
    return Array.from(unique).sort((left, right) => left.localeCompare(right));
  }, [items]);

  const visibleItems = useMemo(() => {
    const filtered = filterItems(items, query);
    return category ? filtered.filter((item) => item.category === category) : filtered;
  }, [items, query, category]);

  function openCreate(): void {
    setEditing(null);
    setEditorOpen(true);
  }

  async function openEdit(id: string): Promise<void> {
    try {
      const item = await getApi().vault.get(id);
      if (!item) return;
      setEditing(item);
      setDetailOpen(false);
      setEditorOpen(true);
    } catch (openError) {
      message.error(getErrorMessage(openError, t));
    }
  }

  async function openDetail(id: string): Promise<void> {
    try {
      const item = await getApi().vault.get(id);
      if (!item) return;
      setDetail(item);
      setDetailOpen(true);
    } catch (openError) {
      message.error(getErrorMessage(openError, t));
    }
  }

  useHotkey({ key: 'n' }, () => openCreate());
  useHotkey({ key: 'f' }, () => searchRef.current?.focus());
  useHotkey({ key: 'l' }, () => void lock());

  if (!unlocked) {
    return (
      <div className="vault-locked">
        <VaultAccessPanel />
      </div>
    );
  }

  const submit = async (draft: VaultItemDraft): Promise<boolean> => {
    const proceed = await confirmIfDuplicate(
      { title: draft.title, username: draft.username, url: draft.url },
      editing?.id,
    );
    if (!proceed) return false;

    setBusy(true);
    try {
      if (editing) {
        await updateItem(editing.id, draft);
      } else {
        await createItem(draft);
      }
      setEditorOpen(false);
      message.success(t('vault.saved'));
      return true;
    } catch (submitError) {
      message.error(getErrorMessage(submitError, t));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const copyPassword = async (id: string) => {
    try {
      const item = detail?.id === id ? detail : await getApi().vault.get(id);
      if (!item) return;
      await copySecret(item.password);
      message.success(t('vault.passwordCopied'));
    } catch (copyError) {
      message.error(getErrorMessage(copyError, t));
    }
  };

  /** 删除前留一份完整快照，删除后提供「撤销」入口。 */
  const removeItem = async (id: string) => {
    try {
      const snapshot = await getApi().vault.get(id);
      if (!snapshot) return;
      await deleteItem(id);
      const noticeKey = `vault-deleted-${id}`;
      message.open({
        key: noticeKey,
        type: 'success',
        duration: 8,
        content: (
          <span className="vault-undo">
            {t('vault.deleted')}
            <Button
              type="link"
              size="small"
              onClick={() => {
                message.destroy(noticeKey);
                void (async () => {
                  try {
                    await createItem({
                      title: snapshot.title,
                      username: snapshot.username,
                      password: snapshot.password,
                      url: snapshot.url,
                      category: snapshot.category,
                      notes: snapshot.notes,
                      tags: snapshot.tags,
                      isFavorite: snapshot.isFavorite,
                      lastUsed: snapshot.lastUsed,
                    });
                    message.success(t('vault.undoDone'));
                  } catch (undoError) {
                    message.error(getErrorMessage(undoError, t));
                  }
                })();
              }}
            >
              {t('vault.undo')}
            </Button>
          </span>
        ),
      });
    } catch (deleteError) {
      message.error(getErrorMessage(deleteError, t));
    }
  };

  const remainingMinutes =
    autoLockAt === null
      ? null
      : Math.max(1, Math.ceil((autoLockAt - Date.now()) / 60_000));

  return (
    <>
      <div className="vault-toolbar">
        <div className="vault-toolbar-filters">
          <VaultSearch inputRef={searchRef} value={query} onChange={setQuery} />
          {categories.length > 0 && (
            <Select
              allowClear
              className="vault-category-filter"
              placeholder={t('vault.allCategories')}
              aria-label={t('vault.allCategories')}
              value={category}
              onChange={(value?: string) => setCategory(value ?? null)}
              options={categories.map((value) => ({ value, label: value }))}
            />
          )}
        </div>
        <div className="vault-toolbar-actions">
          {remainingMinutes !== null && (
            <span className="vault-autolock" title={t('vault.autoLockHint')}>
              {t('vault.autoLockIn', { minutes: remainingMinutes })}
            </span>
          )}
          <Button icon={<LockOutlined />} onClick={() => void lock()}>
            {t('vault.lock')}
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t('vault.newItem')}
          </Button>
        </div>
      </div>

      {error ? (
        <div className="vault-error">
          <span>{getErrorMessage(error, t)}</span>
          <Button size="small" icon={<ReloadOutlined />} onClick={() => void load()}>
            {t('error.retry')}
          </Button>
        </div>
      ) : null}

      <VaultList
        items={visibleItems}
        loading={loading}
        onView={(id) => void openDetail(id)}
        onEdit={(id) => void openEdit(id)}
        onCopyUsername={(username) => {
          void copySecret(username)
            .then(() => message.success(t('vault.usernameCopied')))
            .catch((copyError) => message.error(getErrorMessage(copyError, t)));
        }}
        onCopyPassword={(id) => void copyPassword(id)}
        onDelete={(id) => void removeItem(id)}
      />

      <VaultEditor
        open={editorOpen}
        item={editing}
        busy={busy}
        onCancel={() => setEditorOpen(false)}
        onSubmit={submit}
      />
      <VaultItemDetail
        item={detail}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onEdit={() => {
          if (detail) void openEdit(detail.id);
        }}
      />
    </>
  );
}
