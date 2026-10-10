# IPC API

渲染进程通过 `window.securepass` 调用以下方法。所有方法返回 Promise；失败时抛出带有 `code` 属性的
`Error`。主进程不向前端返回堆栈、密钥或明文日志。

## vault

| 方法                                                     | 说明                                               |
| -------------------------------------------------------- | -------------------------------------------------- |
| `exists()`                                               | 密码库文件是否存在                                 |
| `status()`                                               | `{ initialized, unlocked, itemCount, autoLockAt }` |
| `create(masterPassword)`                                 | 创建密码库；主密码至少 15 个字符                   |
| `unlock(masterPassword)`                                 | 解锁并加载记录                                     |
| `lock()`                                                 | 立即锁定，释放密钥与明文引用                       |
| `list()`                                                 | 返回记录摘要列表                                   |
| `get(id)`                                                | 返回单条完整记录（含密码）                         |
| `createItem(draft)`                                      | 新增记录                                           |
| `updateItem(id, draft)`                                  | 编辑记录，保留 `id` 与创建时间                     |
| `deleteItem(id)`                                         | 删除记录                                           |
| `changeMasterPassword({ currentPassword, newPassword })` | 修改主密码并重封装数据密钥                         |
| `exportBackup()`                                         | 弹出保存对话框，导出加密备份                       |
| `restoreBackup({ password })`                            | 选择备份文件、验证并替换当前库                     |

## generator

| 方法               | 说明                                                                    |
| ------------------ | ----------------------------------------------------------------------- |
| `generate(config)` | 生成密码，返回 `password`、`entropyBits`、`charsetSize`、`warningCodes` |

```ts
interface PasswordConfig {
  length: number; // 8-20，整数
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
  excludeAmbiguous: boolean;
}

// 语言无关的提示码，由渲染层翻译（见 src/renderer/i18n）
type GeneratorWarningCode = 'short-length' | 'low-entropy' | 'letters-only';
```

## password

| 方法                 | 说明                                                           |
| -------------------- | -------------------------------------------------------------- |
| `strength(password)` | 返回 `{ score, entropyBits, suggestionCodes }`（不含展示文案） |

```ts
type StrengthSuggestionCode =
  'empty' | 'too-short' | 'mix-character-classes' | 'avoid-repeats';

interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4; // 强度等级，展示文案由渲染层按语言生成
  entropyBits: number;
  suggestionCodes: StrengthSuggestionCode[];
}
```

> 主进程只返回稳定错误码与提示码，界面文案统一放在 `src/renderer/i18n/messages.ts`，
> 因此接口不绑定任何一种语言。

## settings

| 方法            | 说明                             |
| --------------- | -------------------------------- |
| `get()`         | 读取设置，锁定时返回默认值       |
| `update(patch)` | 更新自动锁定、剪贴板、主题或语言 |

## clipboard

| 方法                | 说明                           |
| ------------------- | ------------------------------ |
| `copySecret(value)` | 复制到剪贴板，并按设置定时清理 |

## events

| 方法                 | 说明                           |
| -------------------- | ------------------------------ |
| `onLocked(callback)` | 订阅锁定事件，返回取消订阅函数 |

## 错误码

| 错误码                               | 含义                     |
| ------------------------------------ | ------------------------ |
| `INVALID_INPUT`                      | 输入不符合规则           |
| `VAULT_NOT_FOUND`                    | 未找到密码库文件         |
| `VAULT_ALREADY_EXISTS`               | 密码库已存在             |
| `VAULT_LOCKED`                       | 需要先解锁               |
| `VAULT_ALREADY_UNLOCKED`             | 已处于解锁状态           |
| `INVALID_MASTER_PASSWORD`            | 主密码错误或文件损坏     |
| `WEAK_MASTER_PASSWORD`               | 主密码不满足长度要求     |
| `CORRUPTED_VAULT`                    | 文件结构或密文完整性异常 |
| `UNSUPPORTED_FORMAT`                 | 格式版本不受支持         |
| `VAULT_BUSY`                         | 密码库被另一个进程占用   |
| `ITEM_NOT_FOUND`                     | 记录不存在               |
| `BACKUP_FAILED` / `RESTORE_FAILED`   | 备份或恢复失败           |
| `CRYPTO_FAILURE` / `STORAGE_FAILURE` | 加密或存储失败           |
