import { Button, Result, Typography } from 'antd';
import { useI18n } from '../../i18n';

interface ErrorFallbackProps {
  error: Error;
  onReload: () => void;
  onRetry: () => void;
}

/** 错误边界被触发时展示的兜底界面。 */
export default function ErrorFallback({
  error,
  onReload,
  onRetry,
}: ErrorFallbackProps): JSX.Element {
  const { t } = useI18n();
  return (
    <div className="app-error">
      <Result
        status="error"
        title={t('error.boundaryTitle')}
        subTitle={t('error.boundaryHelp')}
      >
        <Typography.Paragraph
          type="secondary"
          copyable={{ text: `${error.message}\n\n${error.stack ?? ''}` }}
          className="app-error-detail"
        >
          {error.message}
        </Typography.Paragraph>
        <div className="app-error-actions">
          <Button type="primary" onClick={onReload}>
            {t('error.boundaryReload')}
          </Button>
          <Button onClick={onRetry}>{t('error.boundaryRetry')}</Button>
        </div>
      </Result>
    </div>
  );
}
