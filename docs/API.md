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
| `get()`         | 读取保险库设置，锁定时返回默认值 |
| `update(patch)` | 更新自动锁定、剪贴板（需已解锁） |

```ts
interface AppSettings {
  autoLockTimeoutMinutes: number; // 1-60
  clearClipboardSeconds: number; // 5-300
}
```

> 早期版本把 `theme` / `language` 存在加密负载里，现已由 `uiPreferences` 接管；
> 读取旧库时这两个遗留字段会被丢弃，并在下一次写入时从文件中消失。

## uiPreferences

主题、语言、强调色与生成器位置不是机密数据，且必须在**未解锁**（甚至尚未创建密码库）时也能读写，
因此在主进程以明文 `ui-preferences.json` 单独保存，不进入加密负载。

| 方法            | 说明                               |
| --------------- | ---------------------------------- |
| `get()`         | 读取完整界面偏好（无需解锁）       |
| `update(patch)` | 更新任意子集，返回更新后的完整偏好 |

```ts
interface UiPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: 'en' | 'zh-CN';
  accent: 'indigo' | 'blue' | 'emerald' | 'violet' | 'amber' | 'rose';
  generatorPosition: 'top' | 'left' | 'right';
}
```

## app

| 方法              | 说明                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| `info()`          | 返回 `{ name, version, electron, chrome, node, dataDir, platform }`（关于面板）                   |
| `openDataDir()`   | 在系统文件管理器中打开数据目录                                                                    |
| `checkUpdate()`   | 手动检查更新：`GET https://api.github.com/repos/<slug>/releases/latest`，返回 `UpdateCheckResult` |
| `openExternal(u)` | 用系统浏览器打开链接；**只接受 `https://github.com/...`**，其它协议或主机返回 `INVALID_INPUT`     |

`UpdateCheckResult`：

```ts
interface UpdateCheckResult {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean; // 语义化版本比较：latest > current
  releaseUrl: string; // GitHub Release 页面
  publishedAt: string | null;
  notes: string | null; // 发布说明，最多 4000 字符
}
```

约束：

- 只有用户点击「检查更新」时才会发起请求，应用启动、锁定、解锁过程中都不联网；
- 请求为匿名 GET（无凭据、无请求体），超时 8 秒，失败不重试；
- 仓库地址来自 `src/shared/constants.ts` 的 `REPOSITORY_SLUG`，由 `node tools/set-repo.mjs <owner>/<repo>` 写入；仍是占位符时直接返回 `UPDATE_CHECK_FAILED`，不会向未知地址发请求。

## clipboard

| 方法                | 说明                           |
| ------------------- | ------------------------------ |
| `copySecret(value)` | 复制到剪贴板，并按设置定时清理 |

## events

| 方法                 | 说明                           |
| -------------------- | ------------------------------ |
| `onLocked(callback)` | 订阅锁定事件，返回取消订阅函数 |

## 错误码

| 错误码                               | 含义                      |
| ------------------------------------ | ------------------------- |
| `INVALID_INPUT`                      | 输入不符合规则            |
| `VAULT_NOT_FOUND`                    | 未找到密码库文件          |
| `VAULT_ALREADY_EXISTS`               | 密码库已存在              |
| `VAULT_LOCKED`                       | 需要先解锁                |
| `VAULT_ALREADY_UNLOCKED`             | 已处于解锁状态            |
| `INVALID_MASTER_PASSWORD`            | 主密码错误或文件损坏      |
| `WEAK_MASTER_PASSWORD`               | 主密码不满足长度要求      |
| `CORRUPTED_VAULT`                    | 文件结构或密文完整性异常  |
| `UNSUPPORTED_FORMAT`                 | 格式版本不受支持          |
| `VAULT_BUSY`                         | 密码库被另一个进程占用    |
| `ITEM_NOT_FOUND`                     | 记录不存在                |
| `BACKUP_FAILED` / `RESTORE_FAILED`   | 备份或恢复失败            |
| `CRYPTO_FAILURE` / `STORAGE_FAILURE` | 加密或存储失败            |
| `UNTRUSTED_SENDER`                   | 调用不来自应用主窗口      |
| `UPDATE_CHECK_FAILED`                | 检查更新失败（网络/格式） |
| `INTERNAL_ERROR`                     | 未预期的内部错误          |

## 调用来源校验

所有 `ipcMain.handle` 通道（包括 `windowSyncTitleBar`）在处理请求前都会比对
`event.sender` 与主窗口的 `webContents`；不一致时直接返回
`{ ok: false, error: { code: 'UNTRUSTED_SENDER' } }` 并写入日志，业务处理器不会被执行。
