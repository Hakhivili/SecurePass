import { CopyOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import { Alert, Button, Input, Space } from 'antd';
import type { GeneratedPassword, PasswordStrengthResult } from '@shared/types';
import PasswordStrength from '../Common/PasswordStrength';
import { useI18n } from '../../i18n';
import type { MessageKey } from '../../i18n/messages';

interface GeneratorDisplayProps {
  result: GeneratedPassword | null;
  strength: PasswordStrengthResult | null;
  error: string | null;
  busy: boolean;
  onRegenerate: () => void;
  onCopy: () => void;
  onSave: () => void;
}

export default function GeneratorDisplay({
  result,
  strength,
  error,
  busy,
  onRegenerate,
  onCopy,
  onSave,
}: GeneratorDisplayProps): JSX.Element {
  const { t } = useI18n();

  return (
    <div>
      {error && (
        <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />
      )}
      <div className="generator-result">
        <Input.Password
          readOnly
          value={result?.password ?? ''}
          placeholder={t('generator.placeholder')}
        />
        <Button icon={<CopyOutlined />} onClick={onCopy} disabled={!result}>
          {t('generator.copy')}
        </Button>
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          onClick={onRegenerate}
          loading={busy}
        >
          {t('generator.regenerate')}
        </Button>
        <Button icon={<SaveOutlined />} onClick={onSave} disabled={!result}>
          {t('generator.save')}
        </Button>
      </div>
      <PasswordStrength strength={strength} />
      {result && result.warningCodes.length > 0 && (
        <Space direction="vertical" size={4} style={{ marginTop: 12 }}>
          {result.warningCodes.map((code) => (
            <Alert
              key={code}
              type="warning"
              showIcon
              message={t(`warning.${code}` as MessageKey)}
            />
          ))}
        </Space>
      )}
    </div>
  );
}
