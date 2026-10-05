import { useEffect } from 'react';
import { Form, Input, Modal, Select, Switch } from 'antd';
import type { VaultItem, VaultItemDraft } from '@shared/types';

interface VaultEditorProps {
  open: boolean;
  item: VaultItem | null;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (draft: VaultItemDraft) => Promise<void>;
}

interface VaultForm {
  title: string;
  username?: string;
  password: string;
  url?: string;
  category?: string;
  tags?: string[];
  notes?: string;
  isFavorite?: boolean;
}

export default function VaultEditor({
  open,
  item,
  busy,
  onCancel,
  onSubmit,
}: VaultEditorProps): JSX.Element {
  const [form] = Form.useForm<VaultForm>();

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      title: item?.title ?? '',
      username: item?.username ?? '',
      password: item?.password ?? '',
      url: item?.url ?? '',
      category: item?.category ?? '',
      tags: item?.tags ?? [],
      notes: item?.notes ?? '',
      isFavorite: item?.isFavorite ?? false,
    });
  }, [open, item, form]);

  const submit = async (values: VaultForm) => {
    await onSubmit({
      title: values.title,
      username: values.username ?? '',
      password: values.password,
      url: values.url,
      category: values.category,
      tags: values.tags ?? [],
      notes: values.notes,
      isFavorite: Boolean(values.isFavorite),
    });
    form.resetFields();
  };

  return (
    <Modal
      title={item ? '编辑记录' : '新增记录'}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText="保存"
      cancelText="取消"
      confirmLoading={busy}
      destroyOnClose
      width={560}
    >
      <Form form={form} layout="vertical" onFinish={submit} preserve={false}>
        <Form.Item name="title" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
          <Input autoFocus placeholder="例如：工作邮箱" />
        </Form.Item>
        <Form.Item name="username" label="登录账号">
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
          <Input.Password autoComplete="off" />
        </Form.Item>
        <Form.Item name="url" label="网站或应用地址">
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item name="category" label="分类">
          <Input />
        </Form.Item>
        <Form.Item name="tags" label="标签">
          <Select mode="tags" tokenSeparators={[',']} placeholder="输入后回车添加" />
        </Form.Item>
        <Form.Item name="notes" label="备注">
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="isFavorite" label="收藏" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}
