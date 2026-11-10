import { Checkbox, InputNumber, Slider, Switch, Tooltip } from 'antd';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@shared/constants';
import type { PasswordConfig } from '@shared/types';
import { useI18n } from '../../i18n';

interface GeneratorConfigProps {
  config: PasswordConfig;
  onChange: (config: PasswordConfig) => void;
}

/**
 * 生成规则区布局：
 * - 左侧整块留给「长度」——标签 + 长滑条 + 数字输入，滑条吃掉剩余宽度；
 * - 右侧靠近卡片边缘放字符类型与「排除易混淆」开关。
 * 窄栏（生成器放左/右）时整体改为纵向排列。
 */
export default function GeneratorConfig({
  config,
  onChange,
}: GeneratorConfigProps): JSX.Element {
  const { t } = useI18n();
  const patch = (partial: Partial<PasswordConfig>) => onChange({ ...config, ...partial });

  return (
    <div className="generator-controls">
      <div className="generator-control generator-control-length">
        <span className="generator-label generator-label-lg">
          {t('generator.lengthShort')}
        </span>
        <Slider
          className="generator-slider"
          min={PASSWORD_MIN_LENGTH}
          max={PASSWORD_MAX_LENGTH}
          value={config.length}
          onChange={(length) => patch({ length })}
        />
        <InputNumber
          className="generator-length-input"
          min={PASSWORD_MIN_LENGTH}
          max={PASSWORD_MAX_LENGTH}
          value={config.length}
          onChange={(length) => {
            if (typeof length === 'number') patch({ length });
          }}
        />
      </div>

      <div className="generator-options">
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

        <div className="generator-control generator-ambiguous">
          <Tooltip title={t('generator.excludeAmbiguous')}>
            <span className="generator-label">
              {t('generator.excludeAmbiguousShort')}
            </span>
          </Tooltip>
          <Switch
            size="small"
            checked={config.excludeAmbiguous}
            onChange={(excludeAmbiguous) => patch({ excludeAmbiguous })}
          />
        </div>
      </div>
    </div>
  );
}
