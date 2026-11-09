import { useState } from 'react';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import { Alert, Button, Form, Input } from 'antd';
import { APP_NAME, VAULT_PASSWORD_MIN_LENGTH } from '@shared/constants';
import { useAuthStore } from '../../store/auth.store';
import { masterPasswordErrorKey } from '../../utils/validation';
import { useI18n } from '../../i18n';
import type { MessageKey } from '../../i18n/messages';
import { getErrorMessage } from '../../services/ipc';

interface SetupForm {
  masterPassword: string;
  confirmPassword: string;
}

interface LocalError {
  key: MessageKey;
  params?: Record<string, string | number>;
}

export default function SetupMaster(): JSX.Element {
  const [form] = Form.useForm<SetupForm>();
  const [localError, setLocalError] = useState<LocalError | null>(null);
  const createVault = useAuthStore((state) => state.createVault);
  const busy = useAuthStore((state) => state.busy);
  const error = useAuthStore((state) => state.error);
  const { t } = useI18n();

  const submit = async (values: SetupForm) => {
    setLocalError(null);
    const passwordErrorKey = masterPasswordErrorKey(values.masterPassword);
    if (passwordErrorKey) {
      // 这里必须带上 min 参数，否则会把 "{min}" 原样显示给用户
      setLocalError({
        key: passwordErrorKey,
        params: { min: VAULT_PASSWORD_MIN_LENGTH },
      });
      return;
    }
    if (values.masterPassword !== values.confirmPassword) {
      setLocalError({ key: 'setup.mismatch' });
      return;
    }
    await createVault(values.masterPassword);
  };

  const alertMessage = error
    ? getErrorMessage(error, t)
    : localError
      ? t(localError.key, localError.params)
      : null;

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-brand">
          <SafetyCertificateOutlined style={{ fontSize: 24, color: '#2563eb' }} />
          <h1>{t('setup.title', { app: APP_NAME })}</h1>
        </div>

        {alertMessage && (
          <Alert
            type="error"
            showIcon
            message={alertMessage}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form form={form} layout="vertical" onFinish={submit} requiredMark={false}>
          <Form.Item
            name="masterPassword"
            label={t('setup.master')}
            rules={[{ required: true, message: t('setup.masterRequired') }]}
          >
            <Input.Password autoFocus autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="confirmPassword"
            label={t('setup.confirm')}
            rules={[{ required: true, message: t('setup.confirmRequired') }]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={busy}>
            {t('setup.submit')}
          </Button>
        </Form>

        <div className="auth-help">
          {t('setup.help', { min: VAULT_PASSWORD_MIN_LENGTH })}
        </div>
      </div>
    </div>
  );
}
