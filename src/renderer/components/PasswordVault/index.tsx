import { useEffect, useState } from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { App, Button } from 'antd';
import type { VaultItem, VaultItemDraft } from '@shared/types';
import { getApi, getErrorMessage } from '../../services/ipc';
import { filterItems, useVaultStore } from '../../store/vault.store';
import { copySecret } from '../../utils/clipboard';
import VaultEditor from './VaultEditor';
import VaultItemDetail from './VaultItem';
import VaultList from './VaultList';
import VaultSearch from './VaultSearch';

export default function PasswordVault(): JSX.Element {
  const { message } = App.useApp();
  const items = useVaultStore((state) => state.items);
  const loading = useVaultStore((state) => state.loading);
  const error = useVaultStore((state) => state.error);
  const load = useVaultStore((state) => state.load);
  const createItem = useVaultStore((state) => state.createItem);
  const updateItem = useVaultStore((state) => state.updateItem);
  const deleteItem = useVaultStore((state) => state.deleteItem);

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

  const submit = async (draft: VaultItemDraft) => {
    setBusy(true);
    try {
      if (editing) {
        await updateItem(editing.id, draft);
      } else {
        await createItem(draft);
      }
      setEditorOpen(false);
      message.success('记录已保存');
    } catch (submitError) {
      message.error(getErrorMessage(submitError));
    } finally {
      setBusy(false);
    }
  };

  const copyPassword = async (id: string) => {
    try {
      const item = detail?.id === id ? detail : await getApi().vault.get(id);
      if (!item) return;
      await copySecret(item.password);
      message.success('密码已复制，稍后将自动清理剪贴板');
    } catch (copyError) {
      message.error(getErrorMessage(copyError));
    }
  };

  return (
    <div className="page">
      <h2 className="page-title">密码库</h2>
      <p className="page-description">
        记录、搜索和编辑本地账户资料；密码内容不参与搜索。
      </p>

      <div className="vault-toolbar">
        <VaultSearch value={query} onChange={setQuery} />
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          新增记录
        </Button>
      </div>

      {error && <div style={{ color: '#cf1322', marginBottom: 12 }}>{error}</div>}

      <VaultList
        items={filterItems(items, query)}
        loading={loading}
        onView={(id) => void openDetail(id)}
        onEdit={(id) => void openEdit(id)}
        onCopyUsername={(username) => {
          void copySecret(username)
            .then(() => message.success('账号已复制'))
            .catch((copyError) => message.error(getErrorMessage(copyError)));
        }}
        onCopyPassword={(id) => void copyPassword(id)}
        onDelete={(id) => {
          void deleteItem(id)
            .then(() => message.success('记录已删除'))
            .catch((deleteError) => message.error(getErrorMessage(deleteError)));
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
