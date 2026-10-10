import { LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { APP_NAME } from '@shared/constants';
import { useI18n } from '../../i18n';

interface HeaderProps {
  onLock: () => void;
}

export default function Header({ onLock }: HeaderProps): JSX.Element {
  const { t } = useI18n();

  return (
    <div className="app-header">
      <div className="app-brand">
        <SafetyCertificateOutlined />
        <span>{APP_NAME}</span>
      </div>
      <Button icon={<LockOutlined />} onClick={onLock}>
        {t('common.lock')}
      </Button>
    </div>
  );
}
