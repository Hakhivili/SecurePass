import { CopyOutlined, EditOutlined } from '@ant-design/icons';
import { App, Button, Divider, Input, Modal, Space, Tag } from 'antd';
import type { VaultItem as VaultItemModel } from '@shared/types';
import { copySecret } from '../../utils/clipboard';
import { formatDateTime } from '../../utils/format';
import { getErrorMessage } from '../../services/ipc';

interface VaultItemProps {
  item: VaultItemModel | null;
  open: boolean;
  onClose: () => void;
  onEdit: () => void;
}

export default function VaultItem({ item, open, onClose, onEdit }: VaultItemProps): JSX.Element {
  const { message } = App.useApp();

  const copy = async (value: string, label: string) => {
    try {
      await copySecret(value);
      message.success(`${label}已复制，稍后将自动清理剪贴板`);
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  return (
    <Modal
      title={item ? item.title : '记录详情'}
      open={open}
      onCancel={onClose}
      footer={
        <Space>
          <Button icon={<EditOutlined />} onClick={onEdit}>
            编辑
          </Button>
          <Button type="primary" onClick={onClose}>
            关闭
          </Button>
        </Space>
      }
      width={560}
    >
      {item && (
        <div>
          <div className="detail-row">
            <span className="detail-label">登录账号</span>
            <span className="detail-value">
              {item.username || '-'}
              {item.username && (
                <Button
                  type="link"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => void copy(item.username, '账号')}
                />
              )}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">密码</span>
            <span className="detail-value">
              <Space.Compact style={{ width: '100%' }}>
                <Input.Password readOnly value={item.password} />
                <Button icon={<CopyOutlined />} onClick={() => void copy(item.password, '密码')} />
              </Space.Compact>
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">地址</span>
            <span className="detail-value">{item.url || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">分类</span>
            <span className="detail-value">{item.category || '-'}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">标签</span>
            <span className="detail-value">
              {item.tags.length > 0 ? item.tags.map((tag) => <Tag key={tag}>{tag}</Tag>) : '-'}
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">备注</span>
            <span className="detail-value" style={{ whiteSpace: 'pre-wrap' }}>
              {item.notes || '-'}
            </span>
          </div>
          <Divider style={{ margin: '12px 0' }} />
          <div style={{ color: '#6b7280', fontSize: 12 }}>
            创建：{formatDateTime(item.createdAt)}  修改：{formatDateTime(item.updatedAt)}
          </div>
        </div>
      )}
    </Modal>
  );
}
