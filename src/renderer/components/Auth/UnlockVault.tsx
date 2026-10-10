import { UnlockOutlined } from '@ant-design/icons';
import { Alert, Button, Form, Input } from 'antd';
import { APP_NAME } from '@shared/constants';
import { useAuthStore } from '../../store/auth.store';
import { useI18n } from '../../i18n';
import { getErrorMessage } from '../../services/ipc';

interface UnlockForm {
  masterPassword: string;
}

export default function UnlockVault(): JSX.Element {
  const unlock = useAuthStore((state) => state.unlock);
  const busy = useAuthStore((state) => state.busy);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);
  const { t } = useI18n();

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-brand">
          <UnlockOutlined style={{ fontSize: 24, color: '#2563eb' }} />
          <h1>{t('unlock.title', { app: APP_NAME })}</h1>
        </div>

        {error ? (
          <Alert
            type="error"
            showIcon
            message={getErrorMessage(error, t)}
            style={{ marginBottom: 16 }}
          />
        ) : null}

        <Form
          layout="vertical"
          requiredMark={false}
          onFinish={async ({ masterPassword }: UnlockForm) => {
            await unlock(masterPassword);
          }}
        >
          <Form.Item
            name="masterPassword"
            label={t('unlock.master')}
            rules={[{ required: true, message: t('unlock.masterRequired') }]}
          >
            <Input.Password
              autoFocus
              autoComplete="current-password"
              onChange={clearError}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={busy}>
            {t('unlock.submit')}
          </Button>
        </Form>
      </div>
    </div>
  );
}
