import type { PasswordStrengthResult } from '@shared/types';
import { useI18n } from '../../i18n';
import type { MessageKey } from '../../i18n/messages';

interface PasswordStrengthProps {
  strength: PasswordStrengthResult | null;
}

/** 强度计：一条细进度条 + 等级文字 + 估算熵值 + 改进建议。 */
export default function PasswordStrength({
  strength,
}: PasswordStrengthProps): JSX.Element | null {
  const { t } = useI18n();
  if (!strength) return null;

  const advice = strength.suggestionCodes
    .map((code) => t(`strength.suggestion.${code}` as MessageKey))
    .join(' · ');

  return (
    <div className="strength-meter">
      <div
        className="strength-track"
        role="progressbar"
        aria-label={t('strength.label')}
        aria-valuemin={1}
        aria-valuemax={5}
        aria-valuenow={strength.score + 1}
        aria-valuetext={`${t(`strength.${strength.score}` as MessageKey)}，${t(
          'strength.entropy',
          { bits: strength.entropyBits },
        )}`}
      >
        <div
          className={`strength-fill level-${strength.score}`}
          style={{ width: `${((strength.score + 1) / 5) * 100}%` }}
        />
      </div>
      <span className="strength-label">
        {t(`strength.${strength.score}` as MessageKey)}
      </span>
      <span className="strength-entropy">
        {t('strength.entropy', { bits: strength.entropyBits })}
      </span>
      {advice && <span className="strength-advice">{advice}</span>}
    </div>
  );
}
