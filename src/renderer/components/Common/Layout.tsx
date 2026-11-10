import { Layout } from 'antd';
import { Navigate, Route, Routes } from 'react-router-dom';
import VaultAccessGate from '../Auth/VaultAccessGate';
import Header from './Header';
import Workbench from '../Workbench';
import Settings from '../Settings';

const { Content } = Layout;

/**
 * 外壳：无侧边栏，导航改为顶栏标签页；内容与顶栏共用 `.app-container`，
 * 两个页面宽度与左右边距完全一致。
 */
export default function MainLayout(): JSX.Element {
  return (
    <Layout className="app-shell">
      <Header />
      <Content className="app-content">
        <div className="app-container">
          <Routes>
            <Route path="/workbench" element={<Workbench />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/workbench" replace />} />
          </Routes>
        </div>
      </Content>

      {/* 按需解锁对话框：生成器「保存」等操作会触发 */}
      <VaultAccessGate />
    </Layout>
  );
}
