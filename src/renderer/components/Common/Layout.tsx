import { SettingOutlined } from '@ant-design/icons';
import { Button, Layout } from 'antd';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n';
import VaultAccessGate from '../Auth/VaultAccessGate';
import TitleBar from './TitleBar';
import Workbench from '../Workbench';
import Settings from '../Settings';

const { Content } = Layout;

/**
 * 外壳：顶部是自绘标题栏（替代系统标题栏），没有侧边栏。
 * 「设置」入口固定在左下角；设置页通过顶栏左侧的「返回工作台」返回。
 * 两页内容共用 `.app-container`，宽度与左右边距完全一致。
 */
export default function MainLayout(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const onSettingsPage = location.pathname.startsWith('/settings');

  return (
    <Layout className="app-shell">
      <TitleBar />
      <Content className="app-content">
        <div className="app-container">
          <Routes>
            <Route path="/workbench" element={<Workbench />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/workbench" replace />} />
          </Routes>
        </div>
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
