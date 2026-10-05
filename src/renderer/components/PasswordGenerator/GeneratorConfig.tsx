import { Checkbox, Form, InputNumber, Slider, Switch } from 'antd';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@shared/constants';
import type { PasswordConfig } from '@shared/types';

interface GeneratorConfigProps {
  config: PasswordConfig;
  onChange: (config: PasswordConfig) => void;
}

export default function GeneratorConfig({
  config,
  onChange,
}: GeneratorConfigProps): JSX.Element {
  const patch = (partial: Partial<PasswordConfig>) => onChange({ ...config, ...partial });

  return (
    <Form layout="vertical">
      <Form.Item label={`密码长度：${config.length}`}>
        <Slider
          min={PASSWORD_MIN_LENGTH}
          max={PASSWORD_MAX_LENGTH}
          value={config.length}
          onChange={(length) => patch({ length })}
        />
      </Form.Item>
      <Form.Item label="字符类型">
        <Checkbox
          checked={config.includeUppercase}
          onChange={(event) => patch({ includeUppercase: event.target.checked })}
        >
          大写字母
        </Checkbox>
        <Checkbox
          checked={config.includeLowercase}
          onChange={(event) => patch({ includeLowercase: event.target.checked })}
        >
          小写字母
        </Checkbox>
        <Checkbox
          checked={config.includeNumbers}
          onChange={(event) => patch({ includeNumbers: event.target.checked })}
        >
          数字
        </Checkbox>
        <Checkbox
          checked={config.includeSymbols}
          onChange={(event) => patch({ includeSymbols: event.target.checked })}
        >
          特殊符号
        </Checkbox>
      </Form.Item>
      <Form.Item label="排除易混淆字符（0/O、1/l/I）">
        <Switch
          checked={config.excludeAmbiguous}
          onChange={(excludeAmbiguous) => patch({ excludeAmbiguous })}
        />
      </Form.Item>
      <Form.Item label="直接输入长度">
        <InputNumber
          min={PASSWORD_MIN_LENGTH}
          max={PASSWORD_MAX_LENGTH}
          value={config.length}
          onChange={(length) => {
            if (typeof length === 'number') patch({ length });
          }}
        />
      </Form.Item>
    </Form>
  );
}
