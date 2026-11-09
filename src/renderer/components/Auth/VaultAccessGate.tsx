import { Modal } from 'antd';
import { useVaultGateStore } from '../../store/vault-gate.store';
import { useI18n } from '../../i18n';
import VaultAccessPanel from './VaultAccessPanel';

/**
 * 按需解锁对话框：由生成器的「保存」等需要写密码库的操作触发。
 * 与密码库区块内的内嵌解锁共用同一个 VaultAccessPanel。
 */
export default function VaultAccessGate(): JSX.Element {
  const open = useVaultGateStore((state) => state.open);
  const settle = useVaultGateStore((state) => state.settle);
  const { t } = useI18n();

  return (
    <Modal
      open={open}
      title={t('vault.unlockRequired')}
      footer={null}
      onCancel={() => settle(false)}
      destroyOnClose
      width={420}
    >
      <VaultAccessPanel onDone={() => settle(true)} />
    </Modal>
  );
}
