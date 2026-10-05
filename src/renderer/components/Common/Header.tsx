import { LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { APP_NAME } from '@shared/constants';

interface HeaderProps {
  onLock: () => void;
}

export default function Header({ onLock }: HeaderProps): JSX.Element {
  return (
    <div className="app-header">
      <div className="app-brand">
        <SafetyCertificateOutlined />
        <span>{APP_NAME}</span>
      </div>
      <Button icon={<LockOutlined />} onClick={onLock}>
        锁定
      </Button>
    </div>
  );
}
