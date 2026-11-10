import { Card } from 'antd';
import { useI18n } from '../../i18n';
import PasswordGenerator from '../PasswordGenerator';
import PasswordVault from '../PasswordVault';

/**
 * 工作台：把「密码生成器」和「密码库」合并到同一页。
 * 生成器为横向长方形区块，位于密码库区块上方；两者各自独立工作，
 * 生成/复制无需解锁，涉及密码库的功能按需解锁。
 */
export default function Workbench(): JSX.Element {
  const { t } = useI18n();

  return (
    <div className="page workbench">
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
