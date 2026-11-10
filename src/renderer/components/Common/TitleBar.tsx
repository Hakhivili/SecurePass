import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n';

/**
 * 应用顶栏 = 自绘标题栏（系统标题栏已在主进程隐藏）。
 *
 * - 整条是窗口拖拽区（`-webkit-app-region: drag`），双击可最大化；
 * - 右侧留白给系统的最小化/最大化/关闭按钮（Electron `titleBarOverlay`），
 *   底色与符号颜色随主题由 `titleBar.sync` 实时同步，因此与页面风格一致；
 * - 左侧在设置页显示「返回工作台」，无需滚动回顶即可返回。
 */
export default function TitleBar(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const onSettingsPage = location.pathname.startsWith('/settings');

  return (
    <div className="app-titlebar">
      {onSettingsPage && (
        <Button
          className="app-titlebar-action"
          type="text"
          size="small"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/workbench')}
        >
          {t('nav.backToWorkbench')}
        </Button>
      )}
    </div>
  );
}
