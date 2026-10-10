import { useState } from 'react';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import { Alert, Button, Form, Input } from 'antd';
import { APP_NAME, VAULT_PASSWORD_MIN_LENGTH } from '@shared/constants';
import { useAuthStore } from '../../store/auth.store';
import { validateMasterPassword } from '../../utils/validation';

interface SetupForm {
  masterPassword: string;
  confirmPassword: string;
}

export default function SetupMaster(): JSX.Element {
  const [form] = Form.useForm<SetupForm>();
  const [localError, setLocalError] = useState<string | null>(null);
  const createVault = useAuthStore((state) => state.createVault);
  const busy = useAuthStore((state) => state.busy);
  const error = useAuthStore((state) => state.error);

  const submit = async (values: SetupForm) => {
    setLocalError(null);
    const passwordError = validateMasterPassword(values.masterPassword);
    if (passwordError) {
      setLocalError(passwordError);
      return;
    }
    if (values.masterPassword !== values.confirmPassword) {
      setLocalError('两次输入的主密码不一致');
      return;
    }
    await createVault(values.masterPassword);
  };

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-brand">
          <SafetyCertificateOutlined style={{ fontSize: 24, color: '#2563eb' }} />
          <h1>创建 {APP_NAME} 密码库</h1>
        </div>

        {(error || localError) && (
          <Alert
            type="error"
            showIcon
            message={error ?? localError}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form form={form} layout="vertical" onFinish={submit} requiredMark={false}>
          <Form.Item
            name="masterPassword"
            label="主密码"
            rules={[{ required: true, message: '请输入主密码' }]}
          >
            <Input.Password autoFocus autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label="确认主密码"
            rules={[{ required: true, message: '请再次输入主密码' }]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={busy}>
            创建密码库
          </Button>
        </Form>

        <div className="auth-help">
          主密码至少 {VAULT_PASSWORD_MIN_LENGTH} 个字符，允许空格和较长口令。
          <br />
          忘记主密码后，已有的加密备份也无法直接解密。本工具不提供主密码找回。
        </div>
      </div>
    </div>
  );
}
