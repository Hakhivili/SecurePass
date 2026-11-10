import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  StarFilled,
} from '@ant-design/icons';
import { Button, Empty, Popconfirm, Space, Table, Tag, Tooltip } from 'antd';
import type { VaultSummary } from '@shared/types';
import { formatDateTime } from '../../utils/format';
import { useI18n } from '../../i18n';

interface VaultListProps {
  items: VaultSummary[];
  loading: boolean;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onCopyUsername: (username: string) => void;
  onCopyPassword: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function VaultList({
  items,
  loading,
  onView,
  onEdit,
  onCopyUsername,
  onCopyPassword,
  onDelete,
}: VaultListProps): JSX.Element {
  const { t, language } = useI18n();

  return (
    <Table<VaultSummary>
      rowKey="id"
      loading={loading}
      dataSource={items}
      pagination={{ pageSize: 12, hideOnSinglePage: true }}
      locale={{
        emptyText: (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('vault.empty')}
            style={{ padding: '24px 0' }}
          />
        ),
      }}
      columns={[
        {
          title: t('vault.columnTitle'),
          dataIndex: 'title',
          render: (title: string, record) => (
            <Space size={6}>
              {record.isFavorite && <StarFilled style={{ color: '#f59e0b' }} />}
              <Button
                type="link"
                style={{ padding: 0 }}
                onClick={() => onView(record.id)}
              >
                {title}
              </Button>
            </Space>
          ),
        },
        {
          title: t('vault.columnUsername'),
          dataIndex: 'username',
          ellipsis: true,
          render: (username: string) => username || '-',
        },
        {
          title: t('vault.columnCategoryTags'),
          dataIndex: 'category',
          render: (_value: string | undefined, record) => (
            <Space size={4} wrap>
              {record.category && <Tag color="blue">{record.category}</Tag>}
              {record.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </Space>
          ),
        },
        {
          title: t('vault.columnUpdatedAt'),
          dataIndex: 'updatedAt',
          width: 170,
          render: (value: number) => formatDateTime(value, language),
        },
        {
          title: t('vault.columnActions'),
          key: 'actions',
          width: 220,
          render: (_value, record) => (
            <Space size={2}>
              <Tooltip title={t('vault.actionView')}>
                <Button
                  type="text"
                  icon={<EyeOutlined />}
                  onClick={() => onView(record.id)}
                />
              </Tooltip>
              <Tooltip title={t('vault.actionCopyUsername')}>
                <Button
                  type="text"
                  icon={<CopyOutlined />}
                  disabled={!record.username}
                  onClick={() => onCopyUsername(record.username)}
                />
              </Tooltip>
              <Tooltip title={t('vault.actionCopyPassword')}>
                <Button
                  type="text"
                  icon={<CopyOutlined />}
                  onClick={() => onCopyPassword(record.id)}
                />
              </Tooltip>
              <Tooltip title={t('vault.actionEdit')}>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => onEdit(record.id)}
                />
              </Tooltip>
              <Popconfirm
                title={t('vault.deleteConfirmTitle')}
                description={t('vault.deleteConfirmDescription')}
                okText={t('vault.actionDelete')}
                cancelText={t('common.cancel')}
                okButtonProps={{ danger: true }}
                onConfirm={() => onDelete(record.id)}
              >
                <Tooltip title={t('vault.actionDelete')}>
                  <Button type="text" danger icon={<DeleteOutlined />} />
                </Tooltip>
              </Popconfirm>
            </Space>
          ),
        },
      ]}
    />
  );
}
