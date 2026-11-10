import { Layout } from 'antd';
import { Navigate, Route, Routes } from 'react-router-dom';
import VaultAccessGate from '../Auth/VaultAccessGate';
import TitleBar from './TitleBar';
import Workbench from '../Workbench';
import Settings from '../Settings';

const { Content } = Layout;

/**
 * 外壳：顶部是自绘标题栏（替代系统标题栏），没有侧边栏，也没有额外的导航按钮，
 * 进入设置 / 返回工作台都通过标题栏左侧的动作按钮完成。
 * 两页内容共用 `.app-container`，宽度与左右边距完全一致。
 */
export default function MainLayout(): JSX.Element {
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

      {/* 按需解锁对话框：生成器「保存」等操作会触发 */}
      <VaultAccessGate />
    </Layout>
  );
}
