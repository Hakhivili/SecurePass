import { ArrowLeftOutlined, SettingOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n';

/**
 * 应用顶栏 = 自绘标题栏（系统标题栏已在主进程隐藏）。
 *
 * 左侧是一个「图标 + 悬停展开文字」的动作按钮：
 * - 工作台：齿轮 → 进入设置
 * - 设置页：返回箭头 → 回到工作台（文字为「返回」）
 * 整条是窗口拖拽区，按钮本身 `no-drag`，双击空白处可最大化。
 */
export default function TitleBar(): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const onSettingsPage = location.pathname.startsWith('/settings');

  return (
    <div className="app-titlebar">
      <button
        type="button"
        className="titlebar-action"
        title={onSettingsPage ? t('nav.backToWorkbench') : t('nav.settings')}
        onClick={() => navigate(onSettingsPage ? '/workbench' : '/settings')}
      >
        {onSettingsPage ? (
          <ArrowLeftOutlined className="titlebar-action-icon" />
        ) : (
          <SettingOutlined className="titlebar-action-icon" />
        )}
        <span className="titlebar-action-label">
          {onSettingsPage ? t('nav.back') : t('nav.settings')}
        </span>
      </button>
    </div>
  );
}
