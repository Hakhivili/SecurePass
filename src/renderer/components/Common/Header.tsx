import { SafetyCertificateOutlined } from '@ant-design/icons';
import { APP_NAME } from '@shared/constants';

export default function Header(): JSX.Element {
  return (
    <div className="app-header">
      <div className="app-brand">
        <SafetyCertificateOutlined />
        <span>{APP_NAME}</span>
      </div>
    </div>
  );
}
