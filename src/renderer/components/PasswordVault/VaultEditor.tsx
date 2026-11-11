import { useEffect, useState } from 'react';
import { App, Form, Input, Modal, Select, Switch } from 'antd';
import type { VaultItem, VaultItemDraft } from '@shared/types';
import { useI18n } from '../../i18n';

interface VaultEditorProps {
  open: boolean;
  item: VaultItem | null;
  busy: boolean;
  onCancel: () => void;
  /** 返回 true 表示已保存（关闭并清空表单）；false 表示取消或失败（保留输入）。 */
  onSubmit: (draft: VaultItemDraft) => Promise<boolean>;
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
  const { modal } = App.useApp();
  const { t } = useI18n();
  /** 是否有用户改动：预填值不算改动（antd 的 isFieldsTouched 会把 setFieldsValue 也算作 touched）。 */
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDirty(false);
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
    const saved = await onSubmit({
      title: values.title,
      username: values.username ?? '',
      password: values.password,
      url: values.url,
      category: values.category,
      tags: values.tags ?? [],
      notes: values.notes,
      isFavorite: Boolean(values.isFavorite),
    });
    // 保存失败或用户在重复提醒中选择「返回修改」时，保留已填写的内容
    if (saved) {
      form.resetFields();
      setDirty(false);
    }
  };

  /** 关闭前确认：已修改但未保存的内容不应该被静默丢掉。 */
  const requestClose = (): void => {
    if (!dirty) {
      onCancel();
      return;
    }
    modal.confirm({
      title: t('editor.discardTitle'),
      content: t('editor.discardBody'),
      okText: t('editor.discardOk'),
      okButtonProps: { danger: true },
      cancelText: t('editor.discardKeep'),
      onOk: onCancel,
    });
  };

  return (
    <Modal
      title={item ? t('vault.editorEdit') : t('vault.editorCreate')}
      open={open}
      onCancel={requestClose}
      onOk={() => form.submit()}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      confirmLoading={busy}
      destroyOnClose
      width={560}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={submit}
        onValuesChange={() => setDirty(true)}
        preserve={false}
      >
        <Form.Item
          name="title"
          label={t('form.title')}
          rules={[{ required: true, message: t('form.titleRequired') }]}
        >
          <Input autoFocus placeholder={t('form.titlePlaceholder')} />
        </Form.Item>
        <Form.Item name="username" label={t('form.username')}>
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item
          name="password"
          label={t('vault.labelPassword')}
          rules={[{ required: true, message: t('vault.passwordRequired') }]}
        >
          <Input.Password autoComplete="off" />
        </Form.Item>
        <Form.Item name="url" label={t('form.url')}>
          <Input autoComplete="off" />
        </Form.Item>
        <Form.Item name="category" label={t('form.category')}>
          <Input />
        </Form.Item>
        <Form.Item name="tags" label={t('form.tags')}>
          <Select
            mode="tags"
            tokenSeparators={[',']}
            placeholder={t('form.tagsPlaceholder')}
          />
        </Form.Item>
        <Form.Item name="notes" label={t('form.notes')}>
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="isFavorite" label={t('form.favorite')} valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}
