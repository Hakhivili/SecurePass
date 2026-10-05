import { useEffect, useState } from 'react';
import {
  ExportOutlined,
  ImportOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { App, Button, Card, Col, Form, Input, Row, Segmented, Select } from 'antd';
import { DEFAULT_SETTINGS, type AppSettings, type AppTheme } from '@shared/types';
import { getApi, getErrorMessage } from '../../services/ipc';
import { useSettingsStore } from '../../store/settings.store';
import { useAuthStore } from '../../store/auth.store';
import { validateMasterPassword } from '../../utils/validation';

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function Settings(): JSX.Element {
  const { message, modal } = App.useApp();
  const [passwordForm] = Form.useForm<PasswordForm>();
  const settings = useSettingsStore((state) => state.settings);
  const load = useSettingsStore((state) => state.load);
  const update = useSettingsStore((state) => state.update);
  const [restorePassword, setRestorePassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const lock = useAuthStore((state) => state.lock);

  useEffect(() => {
    void load();
  }, [load]);

  const updateSetting = async (patch: Partial<AppSettings>) => {
    try {
      await update(patch);
      message.success('设置已保存');
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const changePassword = async (values: PasswordForm) => {
    const passwordError = validateMasterPassword(values.newPassword);
    if (passwordError) {
      message.error(passwordError);
      return;
    }
    if (values.newPassword !== values.confirmPassword) {
      message.error('两次输入的新主密码不一致');
      return;
    }
    setBusy(true);
    try {
      await getApi().vault.changeMasterPassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      passwordForm.resetFields();
      message.success('主密码已修改，旧备份仍需使用旧主密码解锁');
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const exportBackup = async () => {
    setBackupBusy(true);
    try {
      const result = await getApi().vault.exportBackup();
      if (!result.canceled) {
        message.success('加密备份已导出');
      }
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setBackupBusy(false);
    }
  };

  const restoreBackup = async () => {
    if (!restorePassword) {
      message.error('请输入备份的主密码');
      return;
    }
    setBackupBusy(true);
    try {
      const result = await getApi().vault.restoreBackup({ password: restorePassword });
      if (result.canceled) return;
      setRestorePassword('');
      modal.success({
        title: '恢复完成',
        content: result.backupOfPreviousPath
          ? `当前密码库已替换，替换前的加密备份保存在：${result.backupOfPreviousPath}`
          : '密码库已从备份恢复。',
      });
      await load();
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setBackupBusy(false);
    }
  };

  return (
    <div className="page">
      <h2 className="page-title">设置</h2>
      <p className="page-description">锁定策略、剪贴板清理、主密码与加密备份。</p>

      <Row gutter={20}>
        <Col xs={24} xl={12}>
          <Card title="常规" size="small" className="settings-section">
            <Form layout="vertical">
              <Form.Item label="自动锁定（无操作后）">
                <Select
                  value={settings.autoLockTimeoutMinutes}
                  options={[1, 5, 10, 15, 30, 60].map((value) => ({
                    value,
                    label: `${value} 分钟`,
                  }))}
                  onChange={(value) => void updateSetting({ autoLockTimeoutMinutes: value })}
                />
              </Form.Item>
              <Form.Item label="复制后清理剪贴板">
                <Select
                  value={settings.clearClipboardSeconds}
                  options={[5, 15, 30, 60, 120].map((value) => ({
                    value,
                    label: `${value} 秒`,
                  }))}
                  onChange={(value) => void updateSetting({ clearClipboardSeconds: value })}
                />
              </Form.Item>
              <Form.Item label="主题">
                <Segmented<AppTheme>
                  value={settings.theme}
                  options={[
                    { value: 'light', label: '浅色' },
                    { value: 'dark', label: '深色' },
                    { value: 'auto', label: '跟随系统' },
                  ]}
                  onChange={(value) => void updateSetting({ theme: value })}
                />
              </Form.Item>
              <Form.Item label="语言">
                <Select
                  value={settings.language}
                  options={[
                    { value: 'zh-CN', label: '简体中文' },
                    { value: 'en', label: 'English' },
                  ]}
                  onChange={(value) => void updateSetting({ language: value })}
                />
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card title="修改主密码" size="small" className="settings-section">
            <p style={{ color: '#6b7280', fontSize: 13 }}>
              修改后需要重新派生密钥；旧备份不会被改写，仍需旧主密码解锁。
            </p>
            <Form form={passwordForm} layout="vertical" onFinish={changePassword}>
              <Form.Item
                name="currentPassword"
                label="当前主密码"
                rules={[{ required: true, message: '请输入当前主密码' }]}
              >
                <Input.Password autoComplete="current-password" />
              </Form.Item>
              <Form.Item
                name="newPassword"
                label="新主密码"
                rules={[{ required: true, message: '请输入新主密码' }]}
              >
                <Input.Password autoComplete="new-password" />
              </Form.Item>
              <Form.Item
                name="confirmPassword"
                label="确认新主密码"
                rules={[{ required: true, message: '请再次输入新主密码' }]}
              >
                <Input.Password autoComplete="new-password" />
              </Form.Item>
              <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={busy}>
                修改主密码
              </Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24}>
          <Card title="加密备份与恢复" size="small" className="settings-section">
            <p style={{ color: '#6b7280', fontSize: 13 }}>
              备份完整密文与加密参数，不提供默认明文导出。恢复采用“替换当前库”，替换前会自动保留当前库的加密副本。
            </p>
            <Row gutter={20}>
              <Col xs={24} md={12}>
                <Button
                  icon={<ExportOutlined />}
                  loading={backupBusy}
                  onClick={() => void exportBackup()}
                >
                  导出加密备份
                </Button>
              </Col>
              <Col xs={24} md={12}>
                <Input.Password
                  value={restorePassword}
                  placeholder="输入备份文件的主密码"
                  onChange={(event) => setRestorePassword(event.target.value)}
                  style={{ marginBottom: 8 }}
                />
                <Button
                  danger
                  icon={<ImportOutlined />}
                  loading={backupBusy}
                  onClick={() => void restoreBackup()}
                >
                  选择备份并恢复
                </Button>
              </Col>
            </Row>
            <div className="auth-help">
              恢复前会验证主密码与文件完整性；密码错误、文件损坏或版本不兼容时不会覆盖当前数据。
            </div>
          </Card>
        </Col>
      </Row>

      <div style={{ marginTop: 12 }}>
        <Button onClick={() => void lock()}>立即锁定</Button>
        <span style={{ marginLeft: 12, color: '#6b7280', fontSize: 13 }}>
          默认设置：自动锁定 {DEFAULT_SETTINGS.autoLockTimeoutMinutes} 分钟，剪贴板{' '}
          {DEFAULT_SETTINGS.clearClipboardSeconds} 秒后清理
        </span>
      </div>
    </div>
  );
}
