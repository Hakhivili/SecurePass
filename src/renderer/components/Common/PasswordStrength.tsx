import type { PasswordStrengthResult } from '@shared/types';

interface PasswordStrengthProps {
  strength: PasswordStrengthResult | null;
}

export default function PasswordStrength({ strength }: PasswordStrengthProps): JSX.Element | null {
  if (!strength) return null;

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
      <span>{strength.label}</span>
      <span style={{ color: '#6b7280', fontSize: 12 }}>
        估算熵值 {strength.entropyBits} bit
      </span>
    </div>
  );
}
