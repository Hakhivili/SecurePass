import { UnlockOutlined } from '@ant-design/icons';
import { Alert, Button, Form, Input } from 'antd';
import { APP_NAME } from '@shared/constants';
import { useAuthStore } from '../../store/auth.store';

interface UnlockForm {
  masterPassword: string;
}

export default function UnlockVault(): JSX.Element {
  const unlock = useAuthStore((state) => state.unlock);
  const busy = useAuthStore((state) => state.busy);
  const error = useAuthStore((state) => state.error);
  const clearError = useAuthStore((state) => state.clearError);

  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-brand">
          <UnlockOutlined style={{ fontSize: 24, color: '#2563eb' }} />
          <h1>解锁 {APP_NAME}</h1>
        </div>

        {error && (
          <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />
        )}

        <Form
          layout="vertical"
          requiredMark={false}
          onFinish={async ({ masterPassword }: UnlockForm) => {
            await unlock(masterPassword);
          }}
        >
          <Form.Item
            name="masterPassword"
            label="主密码"
            rules={[{ required: true, message: '请输入主密码' }]}
          >
            <Input.Password
              autoFocus
              autoComplete="current-password"
              onChange={clearError}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={busy}>
            解锁
          </Button>
        </Form>
      </div>
    </div>
  );
}
