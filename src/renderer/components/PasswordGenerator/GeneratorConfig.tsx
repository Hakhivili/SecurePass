import { Checkbox, InputNumber, Slider, Switch, Tooltip } from 'antd';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@shared/constants';
import type { PasswordConfig } from '@shared/types';
import { useI18n } from '../../i18n';

interface GeneratorConfigProps {
  config: PasswordConfig;
  onChange: (config: PasswordConfig) => void;
}

/**
 * 生成规则区：横向紧凑排布（长度 / 字符类型 / 排除易混淆），
 * 配合「长方形」的生成器区块，避免占用过多纵向空间。
 */
export default function GeneratorConfig({
  config,
  onChange,
}: GeneratorConfigProps): JSX.Element {
  const { t } = useI18n();
  const patch = (partial: Partial<PasswordConfig>) => onChange({ ...config, ...partial });

  return (
    <div className="generator-controls">
      <div className="generator-control">
        <span className="generator-label">{t('generator.lengthShort')}</span>
        <Slider
          className="generator-slider"
          min={PASSWORD_MIN_LENGTH}
          max={PASSWORD_MAX_LENGTH}
          value={config.length}
          onChange={(length) => patch({ length })}
        />
        <InputNumber
          size="small"
          className="generator-length-input"
          min={PASSWORD_MIN_LENGTH}
          max={PASSWORD_MAX_LENGTH}
          value={config.length}
          onChange={(length) => {
            if (typeof length === 'number') patch({ length });
          }}
        />
      </div>

      <div className="generator-control generator-classes">
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
      </div>

      <div className="generator-control">
        <Tooltip title={t('generator.excludeAmbiguous')}>
          <span className="generator-label">{t('generator.excludeAmbiguousShort')}</span>
        </Tooltip>
        <Switch
          size="small"
          checked={config.excludeAmbiguous}
          onChange={(excludeAmbiguous) => patch({ excludeAmbiguous })}
        />
      </div>
    </div>
  );
}
