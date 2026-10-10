import type { PasswordStrengthResult } from '@shared/types';
import { useI18n } from '../../i18n';
import type { MessageKey } from '../../i18n/messages';

interface PasswordStrengthProps {
  strength: PasswordStrengthResult | null;
}

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
      <div className="strength-bar" aria-hidden>
        {[1, 2, 3, 4].map((level) => (
          <span
            key={level}
            className={`strength-segment ${
              level <= strength.score ? `level-${strength.score}` : ''
            }`}
          />
        ))}
      </div>
      <span>{t(`strength.${strength.score}` as MessageKey)}</span>
      <span className="detail-meta">
        {t('strength.entropy', { bits: strength.entropyBits })}
      </span>
      {advice && <span className="strength-advice">{advice}</span>}
    </div>
  );
}
