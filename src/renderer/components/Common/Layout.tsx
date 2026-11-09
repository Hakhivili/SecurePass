import { AppstoreOutlined, SettingOutlined } from '@ant-design/icons';
import { Layout, Menu } from 'antd';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { NAV_ITEMS } from '../../utils/constants';
import { useI18n } from '../../i18n';
import VaultAccessGate from '../Auth/VaultAccessGate';
import Header from './Header';
import Workbench from '../Workbench';
import Settings from '../Settings';

const { Sider, Content } = Layout;

const ICONS: Record<string, JSX.Element> = {
  '/workbench': <AppstoreOutlined />,
  '/settings': <SettingOutlined />,
};

export default function MainLayout(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();

  return (
    <Layout className="app-shell">
      <Sider className="app-sider" width={208}>
        <div style={{ height: 56 }} />
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={NAV_ITEMS.map((item) => ({
            key: item.key,
            label: t(item.labelKey),
            icon: ICONS[item.key],
          }))}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header />
        <Content className="app-content">
          <Routes>
            <Route path="/workbench" element={<Workbench />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/workbench" replace />} />
          </Routes>
        </Content>
      </Layout>
      {/* 按需解锁对话框：生成器「保存」等操作会触发 */}
      <VaultAccessGate />
    </Layout>
  );
}
