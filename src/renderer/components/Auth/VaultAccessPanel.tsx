import { useState } from 'react';
import { LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { Alert, Button, Form, Input } from 'antd';
import { APP_NAME, VAULT_PASSWORD_MIN_LENGTH } from '@shared/constants';
import { useAuthStore } from '../../store/auth.store';
import { masterPasswordErrorKey } from '../../utils/validation';
import { useI18n } from '../../i18n';
import { getErrorMessage } from '../../services/ipc';

interface VaultAccessPanelProps {
  /** 创建成功或解锁成功后的回调（用于关闭外层对话框）。 */
  onDone?: () => void;
}

interface AccessForm {
  masterPassword: string;
  confirmPassword?: string;
}

/**
 * 密码库的「创建 / 解锁」面板。
 * 同一个组件同时用于密码库区块内的内嵌状态，以及按需解锁的对话框中。
 */
export default function VaultAccessPanel({ onDone }: VaultAccessPanelProps): JSX.Element {
  const [form] = Form.useForm<AccessForm>();
  const [localError, setLocalError] = useState<string | null>(null);
  const initialized = useAuthStore((state) => state.initialized);
  const busy = useAuthStore((state) => state.busy);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);
  const unlock = useAuthStore((state) => state.unlock);
  const createVault = useAuthStore((state) => state.createVault);
  const { t } = useI18n();

  const submit = async (values: AccessForm) => {
    setLocalError(null);

    if (!initialized) {
      const passwordErrorKey = masterPasswordErrorKey(values.masterPassword);
      if (passwordErrorKey) {
        setLocalError(t(passwordErrorKey, { min: VAULT_PASSWORD_MIN_LENGTH }));
        return;
      }
      if (values.masterPassword !== values.confirmPassword) {
        setLocalError(t('setup.mismatch'));
        return;
      }
      if (await createVault(values.masterPassword)) onDone?.();
      return;
    }

    if (await unlock(values.masterPassword)) onDone?.();
  };

  const alertMessage = error ? getErrorMessage(error, t) : localError ? localError : null;

  return (
    <div className="vault-access">
      <div className="auth-brand vault-access-brand">
        {initialized ? (
          <LockOutlined style={{ fontSize: 20, color: '#2563eb' }} />
        ) : (
          <SafetyCertificateOutlined style={{ fontSize: 20, color: '#2563eb' }} />
        )}
        <h3>
          {initialized
            ? t('unlock.title', { app: APP_NAME })
            : t('setup.title', { app: APP_NAME })}
        </h3>
      </div>

      <p className="vault-access-hint">
        {initialized ? t('vault.lockedHint') : t('vault.createHint')}
      </p>

      {alertMessage && (
        <Alert
          type="error"
          showIcon
          message={alertMessage}
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={submit}
        requiredMark={false}
        preserve={false}
      >
        <Form.Item
          name="masterPassword"
          label={t('unlock.master')}
          rules={[{ required: true, message: t('unlock.masterRequired') }]}
        >
          <Input.Password
            autoFocus
            autoComplete={initialized ? 'current-password' : 'new-password'}
            onChange={clearError}
          />
        </Form.Item>

        {!initialized && (
          <Form.Item
            name="confirmPassword"
            label={t('setup.confirm')}
            rules={[{ required: true, message: t('setup.confirmRequired') }]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        )}

        <Button type="primary" htmlType="submit" block loading={busy}>
          {initialized ? t('unlock.submit') : t('setup.submit')}
        </Button>
      </Form>

      {!initialized && (
        <div className="auth-help">
          {t('setup.help', { min: VAULT_PASSWORD_MIN_LENGTH })}
        </div>
      )}
    </div>
  );
}
