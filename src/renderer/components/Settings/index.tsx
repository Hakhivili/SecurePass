import { useEffect, useState } from 'react';
import {
  ExportOutlined,
  FolderOpenOutlined,
  ImportOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { Alert, App, Button, Card, Form, Input, Segmented, Select, Tooltip } from 'antd';
import { ACCENT_PRESETS, VAULT_PASSWORD_MIN_LENGTH } from '@shared/constants';
import { DEFAULT_SETTINGS } from '@shared/types';
import type {
  AccentId,
  AppInfo,
  AppSettings,
  AppTheme,
  GeneratorPosition,
  UiPreferences,
  UpdateCheckResult,
} from '@shared/types';
import { getApi, getErrorMessage } from '../../services/ipc';
import { useSettingsStore } from '../../store/settings.store';
import { useAuthStore } from '../../store/auth.store';
import { masterPasswordErrorKey } from '../../utils/validation';
import { useI18n } from '../../i18n';
import type { MessageKey } from '../../i18n/messages';

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const ACCENT_IDS: AccentId[] = ['indigo', 'blue', 'emerald', 'violet', 'amber', 'rose'];

export default function Settings(): JSX.Element {
  const { message, modal } = App.useApp();
  const { t } = useI18n();
  const [passwordForm] = Form.useForm<PasswordForm>();
  const settings = useSettingsStore((state) => state.settings);
  const ui = useSettingsStore((state) => state.ui);
  const load = useSettingsStore((state) => state.load);
  const update = useSettingsStore((state) => state.update);
  const updateUi = useSettingsStore((state) => state.updateUi);
  const [restorePassword, setRestorePassword] = useState('');
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const lock = useAuthStore((state) => state.lock);
  const unlocked = useAuthStore((state) => state.unlocked);

  useEffect(() => {
    void load();
  }, [load]);

  // 版本号与数据目录：反馈问题、备份迁移时都需要
  useEffect(() => {
    let cancelled = false;
    void getApi()
      .app.info()
      .then((value) => {
        if (!cancelled) setInfo(value);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const openDataDir = async () => {
    try {
      await getApi().app.openDataDir();
    } catch (error) {
      message.error(getErrorMessage(error, t));
    }
  };

  /** 手动检查更新：只有点击才会发起一次 GitHub 公开接口请求。 */
  const checkUpdate = async () => {
    setChecking(true);
    try {
      const result = await getApi().app.checkUpdate();
      setUpdateInfo(result);
      if (result.hasUpdate) {
        message.success(t('settings.updateAvailable', { version: result.latestVersion }));
      } else {
        message.info(t('settings.upToDate'));
      }
    } catch (error) {
      setUpdateInfo(null);
      message.error(getErrorMessage(error, t));
    } finally {
      setChecking(false);
    }
  };

  const openRelease = async () => {
    if (!updateInfo) return;
    try {
      await getApi().app.openExternal(updateInfo.releaseUrl);
    } catch (error) {
      message.error(getErrorMessage(error, t));
    }
  };

  /** 同 key 的提示：连续调整时替换上一条，不会堆成一摞。 */
  const notifySaved = () => {
    message.open({
      key: 'settings-saved',
      type: 'success',
      content: t('settings.saved'),
      duration: 1.2,
    });
  };

  const updateSetting = async (patch: Partial<AppSettings>) => {
    try {
      await update(patch);
      notifySaved();
    } catch (error) {
      message.error(getErrorMessage(error, t));
    }
  };

  const updateUiSetting = async (patch: Partial<UiPreferences>) => {
    try {
      await updateUi(patch);
      notifySaved();
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

  /** 恢复会整库覆盖，必须显式二次确认。 */
  const confirmRestore = (): Promise<boolean> =>
    new Promise((resolve) => {
      modal.confirm({
        title: t('settings.restoreConfirmTitle'),
        content: t('settings.restoreConfirmBody'),
        okText: t('settings.restoreConfirmOk'),
        okButtonProps: { danger: true },
        cancelText: t('common.cancel'),
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });

  const restoreBackup = async () => {
    if (!restorePassword) {
      message.error(t('settings.restorePasswordRequired'));
      return;
    }
    if (!(await confirmRestore())) return;
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

      <div className="settings-grid">
        <Card title={t('settings.general')} size="small" className="settings-section">
          <Form layout="vertical">
            <Form.Item label={t('settings.autoLock')}>
              <Select
                disabled={!unlocked}
                value={unlocked ? settings.autoLockTimeoutMinutes : undefined}
                placeholder={t('settings.lockedValue')}
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
                value={unlocked ? settings.clearClipboardSeconds : undefined}
                placeholder={t('settings.lockedValue')}
                options={[5, 15, 30, 60, 120].map((value) => ({
                  value,
                  label: t('settings.seconds', { value }),
                }))}
                onChange={(value) => void updateSetting({ clearClipboardSeconds: value })}
              />
            </Form.Item>
            <Form.Item label={t('settings.theme')}>
              <Segmented<AppTheme>
                value={ui.theme}
                options={[
                  { value: 'light', label: t('settings.themeLight') },
                  { value: 'dark', label: t('settings.themeDark') },
                  { value: 'auto', label: t('settings.themeAuto') },
                ]}
                onChange={(value) => void updateUiSetting({ theme: value })}
              />
            </Form.Item>
            <Form.Item label={t('settings.accent')}>
              <div className="accent-swatches">
                {ACCENT_IDS.map((id) => {
                  const label = t(`accent.${id}` as MessageKey);
                  return (
                    <Tooltip key={id} title={label}>
                      <button
                        type="button"
                        aria-label={label}
                        title={label}
                        className={`accent-swatch${ui.accent === id ? ' is-active' : ''}`}
                        style={{ background: ACCENT_PRESETS[id].light.accent }}
                        onClick={() => void updateUiSetting({ accent: id })}
                      />
                    </Tooltip>
                  );
                })}
              </div>
            </Form.Item>
            <Form.Item label={t('settings.layout')}>
              <Segmented<GeneratorPosition>
                block
                value={ui.generatorPosition}
                options={[
                  { value: 'top', label: t('settings.positionTop') },
                  { value: 'left', label: t('settings.positionLeft') },
                  { value: 'right', label: t('settings.positionRight') },
                ]}
                onChange={(value) => void updateUiSetting({ generatorPosition: value })}
              />
            </Form.Item>
            <Form.Item label={t('settings.language')}>
              <Select
                value={ui.language}
                options={[
                  { value: 'zh-CN', label: t('settings.languageZhCN') },
                  { value: 'en', label: t('settings.languageEn') },
                ]}
                onChange={(value) => void updateUiSetting({ language: value })}
              />
            </Form.Item>
          </Form>
        </Card>

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

        <Card
          title={t('settings.backup')}
          size="small"
          className="settings-section settings-span-2"
        >
          <p>{t('settings.backupHelp')}</p>
          <div className="settings-actions">
            <Button
              icon={<ExportOutlined />}
              loading={backupBusy}
              disabled={!unlocked}
              onClick={() => void exportBackup()}
            >
              {t('settings.export')}
            </Button>
            <Input.Password
              value={restorePassword}
              placeholder={t('settings.restorePasswordPlaceholder')}
              onChange={(event) => setRestorePassword(event.target.value)}
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
          </div>
          <div className="auth-help">{t('settings.restoreHelp')}</div>
        </Card>

        <Card
          title={t('settings.about')}
          size="small"
          className="settings-section settings-span-2"
        >
          <div className="settings-about">
            <div className="settings-about-row">
              <span className="settings-about-label">{t('settings.version')}</span>
              <span className="settings-about-value">
                {info ? `${info.name} v${info.version}` : '-'}
              </span>
            </div>
            <div className="settings-about-row">
              <span className="settings-about-label">{t('settings.runtime')}</span>
              <span className="settings-about-value">
                {info
                  ? `Electron ${info.electron} · Chromium ${info.chrome} · Node ${info.node}`
                  : '-'}
              </span>
            </div>
            <div className="settings-about-row">
              <span className="settings-about-label">{t('settings.dataDir')}</span>
              <span className="settings-about-value settings-about-path">
                {info?.dataDir ?? '-'}
              </span>
              <Button
                size="small"
                icon={<FolderOpenOutlined />}
                onClick={() => void openDataDir()}
              >
                {t('settings.openDataDir')}
              </Button>
            </div>
            <div className="settings-about-row">
              <span className="settings-about-label">{t('settings.updates')}</span>
              <span className="settings-about-value settings-about-actions">
                <Button
                  size="small"
                  loading={checking}
                  onClick={() => void checkUpdate()}
                >
                  {checking ? t('settings.checkingUpdate') : t('settings.checkUpdate')}
                </Button>
                {updateInfo?.hasUpdate ? (
                  <Button
                    size="small"
                    type="link"
                    icon={<ExportOutlined />}
                    onClick={() => void openRelease()}
                  >
                    {t('settings.openRelease', { version: updateInfo.latestVersion })}
                  </Button>
                ) : null}
              </span>
            </div>
            <p className="auth-help">{t('settings.updateHint')}</p>
            <p className="auth-help">{t('settings.aboutHelp')}</p>
          </div>
        </Card>
      </div>

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
