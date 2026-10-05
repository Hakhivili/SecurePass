import { SearchOutlined } from '@ant-design/icons';
import { Input } from 'antd';

interface VaultSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export default function VaultSearch({ value, onChange }: VaultSearchProps): JSX.Element {
  return (
    <Input
      allowClear
      prefix={<SearchOutlined />}
      placeholder="搜索名称、账号、网站或标签"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}
