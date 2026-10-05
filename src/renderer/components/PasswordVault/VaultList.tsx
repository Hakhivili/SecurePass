import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  StarFilled,
} from '@ant-design/icons';
import { Button, Popconfirm, Space, Table, Tag, Tooltip } from 'antd';
import type { VaultSummary } from '@shared/types';
import { formatDateTime } from '../../utils/format';

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
  return (
    <Table<VaultSummary>
      rowKey="id"
      loading={loading}
      dataSource={items}
      pagination={{ pageSize: 12, hideOnSinglePage: true }}
      locale={{ emptyText: '暂无记录' }}
      columns={[
        {
          title: '名称',
          dataIndex: 'title',
          render: (title: string, record) => (
            <Space size={6}>
              {record.isFavorite && <StarFilled style={{ color: '#f59e0b' }} />}
              <Button type="link" style={{ padding: 0 }} onClick={() => onView(record.id)}>
                {title}
              </Button>
            </Space>
          ),
        },
        {
          title: '登录账号',
          dataIndex: 'username',
          ellipsis: true,
          render: (username: string) => username || '-',
        },
        {
          title: '分类 / 标签',
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
          title: '修改时间',
          dataIndex: 'updatedAt',
          width: 170,
          render: (value: number) => formatDateTime(value),
        },
        {
          title: '操作',
          key: 'actions',
          width: 220,
          render: (_value, record) => (
            <Space size={2}>
              <Tooltip title="查看">
                <Button type="text" icon={<EyeOutlined />} onClick={() => onView(record.id)} />
              </Tooltip>
              <Tooltip title="复制账号">
                <Button
                  type="text"
                  icon={<CopyOutlined />}
                  disabled={!record.username}
                  onClick={() => onCopyUsername(record.username)}
                />
              </Tooltip>
              <Tooltip title="复制密码">
                <Button
                  type="text"
                  icon={<CopyOutlined />}
                  onClick={() => onCopyPassword(record.id)}
                />
              </Tooltip>
              <Tooltip title="编辑">
                <Button type="text" icon={<EditOutlined />} onClick={() => onEdit(record.id)} />
              </Tooltip>
              <Popconfirm
                title="删除这条记录？"
                description="已有加密备份中的记录不会被同步删除。"
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
                onConfirm={() => onDelete(record.id)}
              >
                <Tooltip title="删除">
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
