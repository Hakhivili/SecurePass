import { useEffect, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { App, Button } from 'antd';
import type { VaultItem, VaultItemDraft } from '@shared/types';
import { getApi, getErrorMessage } from '../../services/ipc';
import { filterItems, useVaultStore } from '../../store/vault.store';
import { copySecret } from '../../utils/clipboard';
import { useDuplicateGuard } from '../../utils/use-duplicate-guard';
import { useI18n } from '../../i18n';
import VaultEditor from './VaultEditor';
import VaultItemDetail from './VaultItem';
import VaultList from './VaultList';
import VaultSearch from './VaultSearch';

export default function PasswordVault(): JSX.Element {
  const { message } = App.useApp();
  const { t } = useI18n();
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
    void load();
  }, [load]);

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
    <div className="page">
      <h2 className="page-title">{t('vault.title')}</h2>
      <p className="page-description">{t('vault.description')}</p>

      <div className="vault-toolbar">
        <VaultSearch value={query} onChange={setQuery} />
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          {t('vault.newItem')}
        </Button>
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
    </div>
  );
}
