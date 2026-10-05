import { CopyOutlined, ReloadOutlined, SaveOutlined } from '@ant-design/icons';
import { Alert, Button, Input, Space } from 'antd';
import type { GeneratedPassword, PasswordStrengthResult } from '@shared/types';
import PasswordStrength from '../Common/PasswordStrength';

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
  return (
    <div>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
      <div className="generator-result">
        <Input.Password
          readOnly
          value={result?.password ?? ''}
          placeholder="点击生成按钮创建密码"
        />
        <Button icon={<CopyOutlined />} onClick={onCopy} disabled={!result}>
          复制
        </Button>
        <Button
          type="primary"
          icon={<ReloadOutlined />}
          onClick={onRegenerate}
          loading={busy}
        >
          重新生成
        </Button>
        <Button icon={<SaveOutlined />} onClick={onSave} disabled={!result}>
          保存
        </Button>
      </div>
      <PasswordStrength strength={strength} />
      {result && result.warnings.length > 0 && (
        <Space direction="vertical" size={4} style={{ marginTop: 12 }}>
          {result.warnings.map((warning) => (
            <Alert key={warning} type="warning" showIcon message={warning} />
          ))}
        </Space>
      )}
    </div>
  );
}
