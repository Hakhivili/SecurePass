import { Checkbox, Form, InputNumber, Slider, Switch } from 'antd';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@shared/constants';
import type { PasswordConfig } from '@shared/types';
import { useI18n } from '../../i18n';

interface GeneratorConfigProps {
  config: PasswordConfig;
  onChange: (config: PasswordConfig) => void;
}

export default function GeneratorConfig({
  config,
  onChange,
}: GeneratorConfigProps): JSX.Element {
  const { t } = useI18n();
  const patch = (partial: Partial<PasswordConfig>) => onChange({ ...config, ...partial });

  return (
    <Form layout="vertical">
      <Form.Item label={t('generator.length', { length: config.length })}>
        <Slider
          min={PASSWORD_MIN_LENGTH}
          max={PASSWORD_MAX_LENGTH}
          value={config.length}
          onChange={(length) => patch({ length })}
        />
      </Form.Item>
      <Form.Item label={t('generator.classes')}>
        <Checkbox
          checked={config.includeUppercase}
          onChange={(event) => patch({ includeUppercase: event.target.checked })}
        >
          {t('generator.uppercase')}
        </Checkbox>
        <Checkbox
          checked={config.includeLowercase}
          onChange={(event) => patch({ includeLowercase: event.target.checked })}
        >
          {t('generator.lowercase')}
        </Checkbox>
        <Checkbox
          checked={config.includeNumbers}
          onChange={(event) => patch({ includeNumbers: event.target.checked })}
        >
          {t('generator.numbers')}
        </Checkbox>
        <Checkbox
          checked={config.includeSymbols}
          onChange={(event) => patch({ includeSymbols: event.target.checked })}
        >
          {t('generator.symbols')}
        </Checkbox>
      </Form.Item>
      <Form.Item label={t('generator.excludeAmbiguous')}>
        <Switch
          checked={config.excludeAmbiguous}
          onChange={(excludeAmbiguous) => patch({ excludeAmbiguous })}
        />
      </Form.Item>
      <Form.Item label={t('generator.lengthInput')}>
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
