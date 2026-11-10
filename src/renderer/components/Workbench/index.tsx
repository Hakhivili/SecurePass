import { Card } from 'antd';
import { useI18n } from '../../i18n';
import { useSettingsStore } from '../../store/settings.store';
import PasswordGenerator from '../PasswordGenerator';
import PasswordVault from '../PasswordVault';

/**
 * 工作台：把「密码生成器」和「密码库」合并到同一页。
 *
 * 生成器位置（上 / 左 / 右）由界面偏好决定，纯 CSS Grid 切换：
 * - top：生成器在上（横向长方形），密码库占满剩余高度
 * - left / right：两栏并排，生成器是窄栏，密码库占另一侧
 * 生成/复制无需解锁，涉及密码库的功能按需解锁。
 */
export default function Workbench(): JSX.Element {
  const { t } = useI18n();
  const position = useSettingsStore((state) => state.ui.generatorPosition);

  return (
    <div className={`page workbench workbench--${position}`}>
      <Card
        size="small"
        className="workbench-block workbench-generator"
        title={t('generator.title')}
        extra={<span className="workbench-hint">{t('generator.hintShort')}</span>}
      >
        <PasswordGenerator />
      </Card>

      <Card
        size="small"
        className="workbench-block workbench-vault"
        title={t('vault.title')}
        extra={<span className="workbench-hint">{t('vault.hintShort')}</span>}
      >
        <PasswordVault />
      </Card>
    </div>
  );
}
