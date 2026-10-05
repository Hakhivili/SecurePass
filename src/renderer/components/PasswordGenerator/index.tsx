import { useCallback, useEffect, useState } from 'react';
import { App, Card, Col, Form, Input, Modal, Row, Select, Switch } from 'antd';
import {
  DEFAULT_PASSWORD_CONFIG,
  type GeneratedPassword,
  type PasswordConfig,
  type PasswordStrengthResult,
  type VaultItemDraft,
} from '@shared/types';
import { getApi, getErrorMessage } from '../../services/ipc';
import { useVaultStore } from '../../store/vault.store';
import { copySecret } from '../../utils/clipboard';
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

export default function PasswordGenerator(): JSX.Element {
  const { message } = App.useApp();
  const [saveForm] = Form.useForm<SaveForm>();
  const [config, setConfig] = useState<PasswordConfig>({ ...DEFAULT_PASSWORD_CONFIG });
  const [result, setResult] = useState<GeneratedPassword | null>(null);
  const [strength, setStrength] = useState<PasswordStrengthResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  const createItem = useVaultStore((state) => state.createItem);

  const generate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const generated = await getApi().generator.generate(config);
      setResult(generated);
      setStrength(await getApi().password.strength(generated.password));
    } catch (generationError) {
      setError(getErrorMessage(generationError));
      setResult(null);
      setStrength(null);
    } finally {
      setBusy(false);
    }
  }, [config]);

  useEffect(() => {
    void generate();
  }, [generate]);

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
    try {
      await createItem(draft);
      setSaveOpen(false);
      saveForm.resetFields();
      message.success('已保存到密码库');
    } catch (saveError) {
      void message.error(getErrorMessage(saveError));
    }
  };

  return (
    <div className="page">
      <h2 className="page-title">密码生成器</h2>
      <p className="page-description">
        使用系统安全随机数生成 8-20 位密码，未保存的结果不会写入磁盘。
      </p>

      <Row gutter={20}>
        <Col xs={24} lg={10}>
          <Card title="生成规则" size="small">
            <GeneratorConfig config={config} onChange={setConfig} />
          </Card>
        </Col>
        <Col xs={24} lg={14}>
          <Card title="生成结果" size="small">
            <GeneratorDisplay
              result={result}
              strength={strength}
              error={error}
              busy={busy}
              onRegenerate={() => void generate()}
              onCopy={() => {
                if (!result) return;
                void copySecret(result.password)
                  .then(() => message.success('已复制，稍后将自动清理剪贴板'))
                  .catch((copyError) => message.error(getErrorMessage(copyError)));
              }}
              onSave={() => setSaveOpen(true)}
            />
          </Card>
        </Col>
      </Row>

      <Modal
        title="保存到密码库"
        open={saveOpen}
        onCancel={() => setSaveOpen(false)}
        onOk={() => saveForm.submit()}
        okText="保存"
        cancelText="取消"
        destroyOnClose
      >
        <Form form={saveForm} layout="vertical" onFinish={save} preserve={false}>
          <Form.Item name="title" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="例如：工作邮箱" autoFocus />
          </Form.Item>
          <Form.Item name="username" label="登录账号">
            <Input autoComplete="off" />
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
    </div>
  );
}
