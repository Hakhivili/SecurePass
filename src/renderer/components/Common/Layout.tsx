import { ArrowLeftOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Layout } from 'antd';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n';
import VaultAccessGate from '../Auth/VaultAccessGate';
import Workbench from '../Workbench';
import Settings from '../Settings';

const { Content } = Layout;

/**
 * 外壳：没有应用内标题栏（品牌名只在系统窗口标题里），也没有侧边栏。
 *
 * 导航是右上/左上两个固定按钮，不随内容滚动：
 * - 工作台：右上角「设置」
 * - 设置页：左上角「返回工作台」
 * 两页内容共用 `.app-container`，宽度与左右边距完全一致。
 */
export default function MainLayout(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const onSettingsPage = location.pathname.startsWith('/settings');

  return (
    <Layout className="app-shell">
      <Content className="app-content">
        <div className="app-container">
          <Routes>
            <Route path="/workbench" element={<Workbench />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/workbench" replace />} />
          </Routes>
        </div>
      </Content>

      {onSettingsPage ? (
        <Button
          className="top-action top-action-left"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/workbench')}
        >
          {t('nav.backToWorkbench')}
        </Button>
      ) : (
        <Button
          className="top-action top-action-right"
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
