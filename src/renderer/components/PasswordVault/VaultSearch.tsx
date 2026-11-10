import { SearchOutlined } from '@ant-design/icons';
import { Input } from 'antd';
import type { InputRef } from 'antd';
import type { RefObject } from 'react';
import { useI18n } from '../../i18n';

interface VaultSearchProps {
  value: string;
  onChange: (value: string) => void;
  inputRef?: RefObject<InputRef>;
}

export default function VaultSearch({
  value,
  onChange,
  inputRef,
}: VaultSearchProps): JSX.Element {
  const { t } = useI18n();

  return (
    <Input
      ref={inputRef}
      allowClear
      prefix={<SearchOutlined />}
      placeholder={t('vault.searchPlaceholder')}
      aria-label={t('vault.searchPlaceholder')}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
