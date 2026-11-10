import { useEffect, useState } from 'react';
import { ExportOutlined, ImportOutlined, SaveOutlined } from '@ant-design/icons';
import { Alert, App, Button, Card, Col, Form, Input, Row, Segmented, Select } from 'antd';
import { VAULT_PASSWORD_MIN_LENGTH } from '@shared/constants';
import { DEFAULT_SETTINGS } from '@shared/types';
import type { AppSettings, AppTheme } from '@shared/types';
import { getApi, getErrorMessage } from '../../services/ipc';
import { useSettingsStore } from '../../store/settings.store';
import { useAuthStore } from '../../store/auth.store';
import { masterPasswordErrorKey } from '../../utils/validation';
import { useI18n } from '../../i18n';

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function Settings(): JSX.Element {
  const { message, modal } = App.useApp();
  const { t } = useI18n();
  const [passwordForm] = Form.useForm<PasswordForm>();
  const settings = useSettingsStore((state) => state.settings);
  const load = useSettingsStore((state) => state.load);
  const update = useSettingsStore((state) => state.update);
  const [restorePassword, setRestorePassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const lock = useAuthStore((state) => state.lock);
  const unlocked = useAuthStore((state) => state.unlocked);

  useEffect(() => {
    void load();
  }, [load]);

  const updateSetting = async (patch: Partial<AppSettings>) => {
    try {
      await update(patch);
      message.success(t('settings.saved'));
    } catch (error) {
      message.error(getErrorMessage(error, t));
    }
  };

  const changePassword = async (values: PasswordForm) => {
    const passwordErrorKey = masterPasswordErrorKey(values.newPassword);
    if (passwordErrorKey) {
      message.error(t(passwordErrorKey, { min: VAULT_PASSWORD_MIN_LENGTH }));
      return;
    }
    if (values.newPassword !== values.confirmPassword) {
      message.error(t('settings.newMasterMismatch'));
      return;
    }
    setBusy(true);
    try {
      await getApi().vault.changeMasterPassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      passwordForm.resetFields();
      message.success(t('settings.changed'));
    } catch (error) {
      message.error(getErrorMessage(error, t));
    } finally {
      setBusy(false);
    }
  };

  const exportBackup = async () => {
    setBackupBusy(true);
    try {
      const result = await getApi().vault.exportBackup();
      if (!result.canceled) {
        message.success(t('settings.exported'));
      }
    } catch (error) {
      message.error(getErrorMessage(error, t));
    } finally {
      setBackupBusy(false);
    }
  };

  const restoreBackup = async () => {
    if (!restorePassword) {
      message.error(t('settings.restorePasswordRequired'));
      return;
    }
    setBackupBusy(true);
    try {
      const result = await getApi().vault.restoreBackup({ password: restorePassword });
      if (result.canceled) return;
      setRestorePassword('');
      modal.success({
        title: t('settings.restoreDone'),
        content: result.backupOfPreviousPath
          ? t('settings.restoreDoneWithBackup', { path: result.backupOfPreviousPath })
          : t('settings.restoreDoneSimple'),
      });
      await load();
    } catch (error) {
      message.error(getErrorMessage(error, t));
    } finally {
      setBackupBusy(false);
    }
  };

  return (
    <div className="page page-scroll">
      {!unlocked && (
        <Alert
          type="info"
          showIcon
          message={t('settings.lockedNotice')}
          style={{ marginBottom: 16 }}
        />
      )}

      <Row gutter={20}>
        <Col xs={24} xl={12}>
          <Card title={t('settings.general')} size="small" className="settings-section">
            <Form layout="vertical">
              <Form.Item label={t('settings.autoLock')}>
                <Select
                  disabled={!unlocked}
                  value={settings.autoLockTimeoutMinutes}
                  options={[1, 5, 10, 15, 30, 60].map((value) => ({
                    value,
                    label: t('settings.minutes', { value }),
                  }))}
                  onChange={(value) =>
                    void updateSetting({ autoLockTimeoutMinutes: value })
                  }
                />
              </Form.Item>
              <Form.Item label={t('settings.clipboard')}>
                <Select
                  disabled={!unlocked}
                  value={settings.clearClipboardSeconds}
                  options={[5, 15, 30, 60, 120].map((value) => ({
                    value,
                    label: t('settings.seconds', { value }),
                  }))}
                  onChange={(value) =>
                    void updateSetting({ clearClipboardSeconds: value })
                  }
                />
              </Form.Item>
              <Form.Item label={t('settings.theme')}>
                <Segmented<AppTheme>
                  value={settings.theme}
                  options={[
                    { value: 'light', label: t('settings.themeLight') },
                    { value: 'dark', label: t('settings.themeDark') },
                    { value: 'auto', label: t('settings.themeAuto') },
                  ]}
                  onChange={(value) => void updateSetting({ theme: value })}
                />
              </Form.Item>
              <Form.Item label={t('settings.language')}>
                <Select
                  value={settings.language}
                  options={[
                    { value: 'zh-CN', label: t('settings.languageZhCN') },
                    { value: 'en', label: t('settings.languageEn') },
                  ]}
                  onChange={(value) => void updateSetting({ language: value })}
                />
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card
            title={t('settings.changeMaster')}
            size="small"
            className="settings-section"
          >
            <p>{t('settings.changeMasterHelp')}</p>
            <Form form={passwordForm} layout="vertical" onFinish={changePassword}>
              <Form.Item
                name="currentPassword"
                label={t('settings.currentMaster')}
                rules={[{ required: true, message: t('settings.currentMasterRequired') }]}
              >
                <Input.Password autoComplete="current-password" />
              </Form.Item>
              <Form.Item
                name="newPassword"
                label={t('settings.newMaster')}
                rules={[{ required: true, message: t('settings.newMasterRequired') }]}
              >
                <Input.Password autoComplete="new-password" />
              </Form.Item>
              <Form.Item
                name="confirmPassword"
                label={t('settings.confirmMaster')}
                rules={[{ required: true, message: t('settings.confirmMasterRequired') }]}
              >
                <Input.Password autoComplete="new-password" />
              </Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                icon={<SaveOutlined />}
                loading={busy}
                disabled={!unlocked}
              >
                {t('settings.changeMasterSubmit')}
              </Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24}>
          <Card title={t('settings.backup')} size="small" className="settings-section">
            <p>{t('settings.backupHelp')}</p>
            <Row gutter={20}>
              <Col xs={24} md={12}>
                <Button
                  icon={<ExportOutlined />}
                  loading={backupBusy}
                  disabled={!unlocked}
                  onClick={() => void exportBackup()}
                >
                  {t('settings.export')}
                </Button>
              </Col>
              <Col xs={24} md={12}>
                <Input.Password
                  value={restorePassword}
                  placeholder={t('settings.restorePasswordPlaceholder')}
                  onChange={(event) => setRestorePassword(event.target.value)}
                  style={{ marginBottom: 8 }}
                />
                <Button
                  danger
                  icon={<ImportOutlined />}
                  loading={backupBusy}
                  disabled={!unlocked}
                  onClick={() => void restoreBackup()}
                >
                  {t('settings.restore')}
                </Button>
              </Col>
            </Row>
            <div className="auth-help">{t('settings.restoreHelp')}</div>
          </Card>
        </Col>
      </Row>

      <div className="settings-footer">
        <Button onClick={() => void lock()}>{t('settings.lockNow')}</Button>
        <span className="settings-defaults">
          {t('settings.defaults', {
            minutes: DEFAULT_SETTINGS.autoLockTimeoutMinutes,
            seconds: DEFAULT_SETTINGS.clearClipboardSeconds,
          })}
        </span>
      </div>
    </div>
  );
}
