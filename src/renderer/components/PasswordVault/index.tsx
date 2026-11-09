import { useEffect, useState } from 'react';
import { LockOutlined, PlusOutlined } from '@ant-design/icons';
import { App, Button } from 'antd';
import type { VaultItem, VaultItemDraft } from '@shared/types';
import { getApi, getErrorMessage } from '../../services/ipc';
import { useAuthStore } from '../../store/auth.store';
import { filterItems, useVaultStore } from '../../store/vault.store';
import { copySecret } from '../../utils/clipboard';
import { useDuplicateGuard } from '../../utils/use-duplicate-guard';
import { useI18n } from '../../i18n';
import VaultAccessPanel from '../Auth/VaultAccessPanel';
import VaultEditor from './VaultEditor';
import VaultItemDetail from './VaultItem';
import VaultList from './VaultList';
import VaultSearch from './VaultSearch';

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
  const [editing, setEditing] = useState<VaultItem | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [detail, setDetail] = useState<VaultItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (unlocked) void load();
  }, [unlocked, load]);

  if (!unlocked) {
    return (
      <div className="vault-locked">
        <VaultAccessPanel />
      </div>
    );
  }

  const openCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = async (id: string) => {
    const item = await getApi().vault.get(id);
    setEditing(item);
    setDetailOpen(false);
    setEditorOpen(true);
  };

  const openDetail = async (id: string) => {
    const item = await getApi().vault.get(id);
    setDetail(item);
    setDetailOpen(true);
  };

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

  return (
    <>
      <div className="vault-toolbar">
        <VaultSearch value={query} onChange={setQuery} />
        <div className="vault-toolbar-actions">
          <Button icon={<LockOutlined />} onClick={() => void lock()}>
            {t('vault.lock')}
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            {t('vault.newItem')}
          </Button>
        </div>
      </div>

      {error ? <div className="vault-error">{getErrorMessage(error, t)}</div> : null}

      <VaultList
        items={filterItems(items, query)}
        loading={loading}
        onView={(id) => void openDetail(id)}
        onEdit={(id) => void openEdit(id)}
        onCopyUsername={(username) => {
          void copySecret(username)
            .then(() => message.success(t('vault.usernameCopied')))
            .catch((copyError) => message.error(getErrorMessage(copyError, t)));
        }}
        onCopyPassword={(id) => void copyPassword(id)}
        onDelete={(id) => {
          void deleteItem(id)
            .then(() => message.success(t('vault.deleted')))
            .catch((deleteError) => message.error(getErrorMessage(deleteError, t)));
        }}
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
