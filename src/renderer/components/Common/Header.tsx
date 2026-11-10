import { SafetyCertificateOutlined } from '@ant-design/icons';
import { NavLink } from 'react-router-dom';
import { APP_NAME } from '@shared/constants';
import { useI18n } from '../../i18n';
import type { MessageKey } from '../../i18n/messages';

interface Tab {
  to: string;
  labelKey: MessageKey;
}

const TABS: Tab[] = [
  { to: '/workbench', labelKey: 'nav.workbench' },
  { to: '/settings', labelKey: 'nav.settings' },
];

/**
 * 顶栏：品牌 + 标签页导航（替代原侧边栏与页面级标题头）。
 * 内层用 `.app-container` 与页面内容对齐，保证两者宽度一致。
 */
export default function Header(): JSX.Element {
  const { t } = useI18n();

  return (
    <div className="app-header">
      <div className="app-container app-header-inner">
        <div className="app-brand">
          <SafetyCertificateOutlined />
          <span>{APP_NAME}</span>
        </div>
        <nav className="app-tabs">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) => `app-tab${isActive ? ' is-active' : ''}`}
            >
              {t(tab.labelKey)}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  );
}
