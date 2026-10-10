import { CopyOutlined, EditOutlined } from '@ant-design/icons';
import { App, Button, Divider, Input, Modal, Space, Tag } from 'antd';
import type { VaultItem as VaultItemModel } from '@shared/types';
import { copySecret } from '../../utils/clipboard';
import { formatDateTime } from '../../utils/format';
import { getErrorMessage } from '../../services/ipc';
import { useI18n } from '../../i18n';
import type { MessageKey } from '../../i18n/messages';

interface VaultItemProps {
  item: VaultItemModel | null;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
}

export default function VaultItem({
  item,
  open,
  onClose,
  onEdit,
}: VaultItemProps): JSX.Element {
  const { message } = App.useApp();
  const { t, language } = useI18n();

  const copy = async (value: string, successKey: MessageKey) => {
    try {
      await copySecret(value);
      message.success(t(successKey));
    } catch (error) {
      message.error(getErrorMessage(error, t));
    }
  };

  return (
    <Modal
      title={item ? item.title : t('vault.detailTitle')}
      open={open}
      onCancel={onClose}
      footer={
        <Space>
          <Button icon={<EditOutlined />} onClick={onEdit}>
            {t('vault.actionEdit')}
          </Button>
          <Button type="primary" onClick={onClose}>
            {t('common.close')}
          </Button>
        </Space>
      }
      width={560}
    >
      {item && (
        <div>
          <div className="detail-row">
            <span className="detail-label">{t('vault.labelUsername')}</span>
            <span className="detail-value">
              {item.username || '-'}
              {item.username && (
                <Button
                  type="link"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => void copy(item.username, 'vault.usernameCopied')}
                />
              )}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('vault.labelPassword')}</span>
            <span className="detail-value">
              <Space.Compact style={{ width: '100%' }}>
                <Input.Password readOnly value={item.password} />
                <Button
                  icon={<CopyOutlined />}
                  onClick={() => void copy(item.password, 'vault.passwordCopied')}
                />
              </Space.Compact>
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('vault.labelUrl')}</span>
            <span className="detail-value">{item.url || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('vault.labelCategory')}</span>
            <span className="detail-value">{item.category || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('vault.labelTags')}</span>
            <span className="detail-value">
              {item.tags.length > 0
                ? item.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)
                : '-'}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">{t('vault.labelNotes')}</span>
            <span className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>
              {item.notes || '-'}
            </span>
          </div>
          <Divider style={{ margin: '12px 0' }} />
          <div className="detail-meta">
            {t('vault.timestamps', {
              created: formatDateTime(item.createdAt, language),
              updated: formatDateTime(item.updatedAt, language),
            })}
          </div>
        </div>
      )}
    </Modal>
  );
}
