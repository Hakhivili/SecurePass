import { useCallback, useEffect, useRef, useState } from 'react';
import { App, Form, Input, Modal, Select, Switch } from 'antd';
import {
  DEFAULT_PASSWORD_CONFIG,
  type GeneratedPassword,
  type PasswordConfig,
  type PasswordStrengthResult,
  type VaultItemDraft,
} from '@shared/types';
import { getApi, getErrorMessage } from '../../services/ipc';
import { useAuthStore } from '../../store/auth.store';
import { useVaultGateStore } from '../../store/vault-gate.store';
import { useVaultStore } from '../../store/vault.store';
import { copySecret } from '../../utils/clipboard';
import { useDuplicateGuard } from '../../utils/use-duplicate-guard';
import { useI18n } from '../../i18n';
import GeneratorConfig from './GeneratorConfig';
import GeneratorDisplay from './GeneratorDisplay';

interface SaveForm {
  title: string;
  username?: string;
  url?: string;
  category?: string;
  tags?: string[];
  notes?: string;
  isFavorite?: boolean;
}

/**
 * 密码生成器面板：生成/复制不需要解锁；只有「保存到密码库」需要主密码。
 * 布局为横向长方形（规则行 + 结果行 + 强度提示），放在密码库区块上方。
 */
export default function PasswordGenerator(): JSX.Element {
  const { message } = App.useApp();
  const { t } = useI18n();
  const [saveForm] = Form.useForm<SaveForm>();
  const [config, setConfig] = useState<PasswordConfig>({ ...DEFAULT_PASSWORD_CONFIG });
  const [result, setResult] = useState<GeneratedPassword | null>(null);
  const [strength, setStrength] = useState<PasswordStrengthResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const createItem = useVaultStore((state) => state.createItem);
  const confirmIfDuplicate = useDuplicateGuard();
  /** 生成是异步的：只接受最后一次请求的结果，避免慢响应覆盖新密码。 */
  const latestRequest = useRef(0);

  const generate = useCallback(async () => {
    const requestId = latestRequest.current + 1;
    latestRequest.current = requestId;
    setBusy(true);
    setError(null);
    try {
      const generated = await getApi().generator.generate(config);
      if (requestId !== latestRequest.current) return;
      setResult(generated);
      const nextStrength = await getApi().password.strength(generated.password);
      if (requestId !== latestRequest.current) return;
      setStrength(nextStrength);
    } catch (generationError) {
      if (requestId !== latestRequest.current) return;
      setError(getErrorMessage(generationError, t));
      setResult(null);
      setStrength(null);
    } finally {
      if (requestId === latestRequest.current) setBusy(false);
    }
  }, [config, t]);

  // 配置变化后防抖重新生成：拖动滑条时不会每一格都发一轮 IPC。
  useEffect(() => {
    const timer = window.setTimeout(() => void generate(), 220);
    return () => window.clearTimeout(timer);
  }, [generate]);

  /** 保存前先确保密码库已解锁（未解锁时弹出主密码对话框）。 */
  const openSaveDialog = async () => {
    if (!useAuthStore.getState().unlocked) {
      const unlocked = await useVaultGateStore.getState().request('save');
      if (!unlocked) return;
    }
    setSaveOpen(true);
  };

  const save = async (values: SaveForm) => {
    if (!result) return;
    const draft: VaultItemDraft = {
      title: values.title,
      username: values.username ?? '',
      password: result.password,
      url: values.url,
      category: values.category,
      notes: values.notes,
      tags: values.tags ?? [],
      isFavorite: Boolean(values.isFavorite),
    };

    const proceed = await confirmIfDuplicate({
      title: draft.title,
      username: draft.username,
      url: draft.url,
    });
    // 用户选择「返回修改」时保留弹窗中的输入内容
    if (!proceed) return;

    try {
      await createItem(draft);
      setSaveOpen(false);
      saveForm.resetFields();
      message.success(t('generator.saved'));
    } catch (saveError) {
      void message.error(getErrorMessage(saveError, t));
    }
  };

  return (
    <>
      <GeneratorConfig config={config} onChange={setConfig} />
      <GeneratorDisplay
        result={result}
        strength={strength}
        error={error}
        busy={busy}
        onRegenerate={() => void generate()}
        onCopy={() => {
          if (!result) return;
          void copySecret(result.password)
            .then(() => message.success(t('generator.copied')))
            .catch((copyError) => message.error(getErrorMessage(copyError, t)));
        }}
        onSave={() => void openSaveDialog()}
      />

      <Modal
        title={t('generator.saveTitle')}
        open={saveOpen}
        onCancel={() => setSaveOpen(false)}
        onOk={() => saveForm.submit()}
        okText={t('common.save')}
        cancelText={t('common.cancel')}
        destroyOnClose
      >
        <Form form={saveForm} layout="vertical" onFinish={save} preserve={false}>
          <Form.Item
            name="title"
            label={t('form.title')}
            rules={[{ required: true, message: t('form.titleRequired') }]}
          >
            <Input placeholder={t('form.titlePlaceholder')} autoFocus />
          </Form.Item>
          <Form.Item name="username" label={t('form.username')}>
            <Input autoComplete="off" />
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
    </>
  );
}
