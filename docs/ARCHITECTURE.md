# 架构设计

## 目标与边界

SecurePass 是单机、离线优先的桌面密码管理工具。首版不包含团队共享、远程账户、云同步、浏览器扩展
和网站自动填充。密码库需要还原原文，因此业务密码采用可解密的认证加密，而不是单向哈希。

## 进程边界

```
渲染进程 (React)
  └─ window.securepass (preload 桥)
       └─ IPC (类型化请求/响应)
            └─ 主进程
                 ├─ CryptoService    密钥派生与加解密
                 ├─ VaultService     解锁会话、CRUD、设置
                 ├─ StorageService   原子写入、版本校验、锁文件
                 ├─ BackupService    加密备份导出与恢复
                 ├─ PasswordService  安全随机生成与强度估算
                 └─ ClipboardService 复制与条件清理
```

安全密钥、数据密钥、明文密码和文件读写全部留在主进程。渲染进程只能通过 `SecurePassApi` 暴露的
固定方法访问数据，不能直接读取密码库文件或任意调用 Node/Electron API。

窗口启用 `contextIsolation`、关闭 `nodeIntegration`，开启 `sandbox`，并通过 CSP 限制脚本与网络来源。

## 模块职责

| 模块 | 职责 |
| --- | --- |
| `src/main/services/crypto.service.ts` | Argon2id 派生、AES-256-GCM 封装、vault 文件结构校验 |
| `src/main/services/storage.service.ts` | 原子写入、上一版本备份、单写者锁文件 |
| `src/main/services/vault.service.ts` | 会话状态、自动锁定、记录校验、CRUD、改主密码、恢复 |
| `src/main/services/backup.service.ts` | 保存/打开对话框、备份读写与错误处理 |
| `src/main/services/password.service.ts` | 无偏随机生成、字符规则校验、强度估算 |
| `src/main/ipc/index.ts` | IPC 路由、参数校验、错误序列化 |
| `src/preload/index.ts` | 上下文隔离桥与结果解包 |
| `src/renderer/**` | 界面、状态管理、交互流程 |
| `src/shared/**` | 类型、常量与错误码 |

## 密钥流程

```
主密码
  └─ Argon2id(参数 + 随机盐) ─→ KEK（密钥加密密钥，仅驻留内存）
        └─ 解密 wrappedDataKey ─→ 随机 DEK（数据密钥，仅驻留内存）
              ├─ 解密 payload ─→ VaultPayload（记录与设置）
              └─ 加密 payload
```

- 每个密码库独立随机盐；KDF 参数与格式版本一并保存。
- 主密码不落盘、不写入日志、不作为加密密钥直接使用。
- 改主密码时重新派生 KEK，并用新 KEK 重新封装同一个 DEK，然后原子替换文件。
- 旧备份保留旧主密码的解锁语义，修改主密码不会撤销对旧备份的访问。

## 文件格式 (v1)

密码库和备份都是 UTF-8 JSON 文件：

```json
{
  "magic": "SECUREPASS",
  "formatVersion": 1,
  "vaultId": "uuid",
  "kdf": {
    "algorithm": "argon2id",
    "salt": "base64",
    "iterations": 3,
    "memorySizeKiB": 65536,
    "parallelism": 4,
    "hashLength": 32
  },
  "wrappedDataKey": { "algorithm": "aes-256-gcm", "iv": "...", "ciphertext": "...", "authTag": "..." },
  "payload": { "algorithm": "aes-256-gcm", "iv": "...", "ciphertext": "...", "authTag": "..." },
  "createdAt": 0,
  "updatedAt": 0
}
```

AAD 固定为 `securepass:v1:data-key` 与 `securepass:v1:payload`，防止密文块被互换。

## 可靠性设计

- 写入流程：写临时文件 → `fsync` → 备份当前文件 → 原子重命名替换正式文件。
- 中断或写入失败时，正式文件保持旧版本，`.bak` 保留上一完整版本。
- 锁文件保存 PID 与时间戳；进程退出或锁过期后可回收。
- 恢复流程先验证主密码与文件完整性，再复制当前库为 `pre-restore` 加密副本，最后原子替换。
- 密码库内容在解锁后常驻内存，锁定或退出时释放引用并清零可用 Buffer。

## 渲染层数据流

- `auth.store`：初始化、创建、解锁、锁定状态。
- `vault.store`：摘要列表、加载、CRUD、派生搜索过滤（不搜索密码字段）。
- `settings.store`：自动锁定、剪贴板、主题与语言。
- 主进程锁定后通过 `event:locked` 通知所有窗口，渲染层立即丢弃列表并回到解锁页。

## 后续扩展点

- 数据导入/导出（CSV、其他密码管理器）
- 重复密码检查与密码历史
- 生物识别解锁适配层
- 多设备端到端加密同步（需要独立的密钥协商设计）
- 自动更新与跨平台签名/公证
