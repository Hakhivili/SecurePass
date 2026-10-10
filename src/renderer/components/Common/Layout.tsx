import { KeyOutlined, SettingOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { Layout, Menu } from 'antd';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { NAV_ITEMS } from '../../utils/constants';
import { useAuthStore } from '../../store/auth.store';
import Header from './Header';
import PasswordGenerator from '../PasswordGenerator';
import PasswordVault from '../PasswordVault';
import Settings from '../Settings';

const { Sider, Content } = Layout;

const ICONS: Record<string, JSX.Element> = {
  '/generator': <KeyOutlined />,
  '/vault': <UnorderedListOutlined />,
  '/settings': <SettingOutlined />,
};

export default function MainLayout(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const lock = useAuthStore((state) => state.lock);

  return (
    <Layout className="app-shell">
      <Sider className="app-sider" width={208} theme="light">
        <div style={{ height: 56 }} />
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={NAV_ITEMS.map((item) => ({ ...item, icon: ICONS[item.key] }))}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header onLock={() => void lock()} />
        <Content className="app-content">
          <Routes>
            <Route path="/generator" element={<PasswordGenerator />} />
            <Route path="/vault" element={<PasswordVault />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/generator" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}
