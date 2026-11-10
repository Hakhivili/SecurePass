import { SettingOutlined } from '@ant-design/icons';
import { Button, Layout } from 'antd';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n';
import VaultAccessGate from '../Auth/VaultAccessGate';
import Header from './Header';
import Workbench from '../Workbench';
import Settings from '../Settings';

const { Content } = Layout;

/**
 * 外壳：无侧边栏，内容占满窗口；「设置」入口固定在左下角。
 * 锁定操作在密码库区块内（只有解锁后才有意义），因此顶栏不再放锁定按钮。
 */
export default function MainLayout(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const onSettingsPage = location.pathname.startsWith('/settings');

  return (
    <Layout className="app-shell">
      <Header />
      <Content className="app-content">
        <Routes>
          <Route path="/workbench" element={<Workbench />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/workbench" replace />} />
        </Routes>
      </Content>

      {!onSettingsPage && (
        <Button
          className="settings-entry"
          icon={<SettingOutlined />}
          onClick={() => navigate('/settings')}
        >
          {t('nav.settings')}
        </Button>
      )}

      {/* 按需解锁对话框：生成器「保存」等操作会触发 */}
      <VaultAccessGate />
    </Layout>
  );
}
