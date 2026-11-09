import { LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { APP_NAME } from '@shared/constants';
import { useAuthStore } from '../../store/auth.store';
import { useI18n } from '../../i18n';

export default function Header(): JSX.Element {
  const { t } = useI18n();
  const unlocked = useAuthStore((state) => state.unlocked);
  const lock = useAuthStore((state) => state.lock);

  return (
    <div className="app-header">
      <div className="app-brand">
        <SafetyCertificateOutlined />
        <span>{APP_NAME}</span>
      </div>
      {unlocked && (
        <Button icon={<LockOutlined />} onClick={() => void lock()}>
          {t('common.lock')}
        </Button>
      )}
    </div>
  );
}
