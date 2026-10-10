import { SearchOutlined } from '@ant-design/icons';
import { Input } from 'antd';
import { useI18n } from '../../i18n';

interface VaultSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export default function VaultSearch({ value, onChange }: VaultSearchProps): JSX.Element {
  const { t } = useI18n();

  return (
    <Input
      allowClear
      prefix={<SearchOutlined />}
      placeholder={t('vault.searchPlaceholder')}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
