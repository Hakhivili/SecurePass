# SecurePass 部署与代码分析记录

> 本文档由部署任务生成，记录一次完整的“读源码 → 分析功能 → 工作区部署 → 验证”的结果，
> 以及后续完善需要的问题清单。修改业务代码前请先阅读第 6、7 节。

- 日期：2026-10-05
- 来源：`SecurePass-源码-20261005.zip`（162599 字节，sha256 `b0b59594…a3560bb`）
- 部署目录：`D:\ToolsDataSite\SecurePass`
- 版本：securepass@0.1.0（MIT）

---

## 1. 部署结果

| 项目         | 内容                                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| 源码解压     | 82 个条目 → 81 个源文件，与 zip 内容一致，未做任何修改                                                                          |
| 基线快照     | 已删除（原始状态保存在 git 提交 `62b5f8d`，无需再保留副本）                                                                     |
| 依赖安装     | `npm ci` + `npm install`（Electron 二进制单独下载）                                                                             |
| node_modules | 31,082 个文件，约 545 MB                                                                                                        |
| 缓存目录     | 统一收纳在工作区根目录 **单个隐藏目录** `.securepass-local\`（`npm-cache\` + `electron\`，约 248 MB；可整体删除，下次自动重下） |

### 工具链版本

- Node v24.9.0 / npm 11.12.1（项目要求 Node >= 18.18，满足）
- Electron 33.4.11、electron-builder 25.1.8
- Vite 5.4.21、vite-plugin-electron 0.28.8、TypeScript 5.9.3
- React 18.3.1、antd 5.29.3、zustand 5.0.15、react-router-dom 6.30.6
- Vitest 2.1.9、jsdom 25.0.1、ESLint 8.57.1、Prettier 3.9.9

### 两个环境注意点

1. **GitHub 不可直连**，`node_modules/electron` 的二进制默认下载会失败。
   本次改用镜像安装，后续在同一环境重装请使用：

   ```powershell
   $env:ELECTRON_MIRROR="https://registry.npmmirror.com/-/binary/electron/"
   npm install
   ```

2. **本机 Git 未能使用**：在当前执行沙箱下 `git.exe` 被拒绝运行，因此部署目录暂时不是
   Git 仓库，改用第 1 节的基线快照做版本对照。若已具备执行权限，可直接初始化：

   ```powershell
   cd D:\ToolsDataSite\SecurePass
   git init
   git add -A
   git commit -m "chore: import SecurePass 0.1.0 baseline"
   ```

---

## 2. 质量门禁验证

| 检查            | 命令                                      | 结果                                                |
| --------------- | ----------------------------------------- | --------------------------------------------------- |
| 类型检查        | `npm run typecheck`                       | ✅ 通过，0 错误（`strict` + `noUnusedLocals` 全开） |
| 代码规范        | `npm run lint`                            | ✅ 通过，exit 0，0 warning                          |
| 单元测试        | `npm test`                                | ✅ 5 个文件 / 22 个用例全部通过                     |
| 生产构建        | `npm run build`                           | ✅ 生成 `dist/` 与 `dist-electron/`                 |
| Electron 运行时 | `node_modules/electron/dist/electron.exe` | ✅ 已下载（281 MB / 73 个文件）                     |

测试明细：`password.service` 7、`vault.service` 7、`crypto.service` 4、`storage.service` 2、`renderer/vault-filter` 2。

构建产物：

| 产物                              | 大小        | gzip      |
| --------------------------------- | ----------- | --------- |
| `dist/assets/index-*.js`          | 1,107.00 kB | 349.04 kB |
| `dist/assets/index-*.css`         | 2.43 kB     | 0.87 kB   |
| `dist/index.html`                 | 0.61 kB     | 0.36 kB   |
| `dist-electron/main/index.js`     | 23.07 kB    | 8.85 kB   |
| `dist-electron/preload/index.cjs` | 1.69 kB     | 0.66 kB   |

> 沙箱限制说明：esbuild 以管道 stdio 启动子服务、以及写入 `%TEMP%`，在当前沙箱模式下会被拒绝
> （`spawn EPERM`）。本次通过“临时目录重定向到工作区 + 单次提权”完成验证。日常开发不受影响。

### 常用命令

```powershell
npm run dev          # Vite 开发模式并启动 Electron
npm run typecheck    # 类型检查
npm run lint         # ESLint
npm test             # Vitest 单测
npm run build        # 类型检查 + 生产构建
npm run package      # 构建 + electron-builder 打包
```

密码库文件不在仓库内，位于 Electron userData 目录：
Windows `%APPDATA%/SecurePass/vault.securepass`，macOS `~/Library/Application Support/SecurePass/`，
Linux `~/.config/SecurePass/`。

---

## 3. 架构总览

```
渲染进程 (React 18 + antd + zustand + HashRouter)
  └─ window.securepass            preload 上下文隔离桥（sandbox: true, nodeIntegration: false）
       └─ IPC（19 个通道，统一 { ok, data } / { ok, error } 信封）
            └─ 主进程
                 ├─ CryptoService      Argon2id 派生 + AES-256-GCM
                 ├─ StorageService     原子写入、.bak、单写者锁文件
                 ├─ VaultService       解锁会话、CRUD、设置、自动锁定、改主密码、恢复
                 ├─ BackupService      保存/打开对话框、备份读写
                 ├─ PasswordService    无偏随机生成与强度估算
                 └─ ClipboardService   复制与条件清理
```

密钥层级：主密码 →(Argon2id + 随机盐)→ KEK →(解密 wrappedDataKey)→ DEK → 加解密 payload。
KEK/DEK 只驻留主进程内存，`finally` 中 `Buffer.fill(0)`；明文密码与文件 IO 从不进入渲染进程。

文件格式 v1（`SECUREPASS` / `formatVersion: 1`）包含 `vaultId`、KDF 参数、两段 GCM 密文、
时间戳；AAD 固定为 `securepass:v1:data-key` 与 `securepass:v1:payload`，可防止密文块互换。

---

## 4. 功能清单（已实现）

### 4.1 安全核心（`src/main/services/crypto.service.ts`）

- `createKdfParams()`：Argon2id 默认 3 次迭代、64 MiB、并行度 4、输出 32 字节，盐 16 字节随机。
- `deriveKey()`：调用 `hash-wasm` 的 `argon2id`（不自行实现算法）。
- `encryptBlob()` / `decryptBlob()`：AES-256-GCM，96 位随机 IV、128 位认证标签，支持 AAD。
- `createVaultFile()` / `openVaultFile()` / `rewrapDataKey()` / `verifyMasterPassword()`。
- `parseVaultFile()`：逐字段校验 magic、版本、KDF 参数与密文块结构。
- 错误语义：解密失败统一映射 `INVALID_MASTER_PASSWORD`，不区分“密码错误”与“文件损坏”。

### 4.2 存储与可靠性（`storage.service.ts`）

- 原子写入：`.tmp`（`wx` + `0o600`）→ `fsync` → `rename` 替换。
- 写前保留上一版本为 `vault.securepass.bak`。
- 锁文件 `vault.lock` 记录 PID 与时间戳，30 秒过期或进程不存在时回收；`process.kill(pid, 0)` 探活。
- `copyCurrentTo()` 用于恢复前的 `pre-restore-<时间>.bak`。

### 4.3 密码库业务（`vault.service.ts`）

- 会话：`create` / `unlock` / `lock` / `shutdown`，`onLocked` 事件广播到所有窗口。
- 自动锁定：默认 5 分钟（1–120 可配），每次受保护调用通过 `touch()` 顺延；系统锁屏/休眠立即锁定。
- CRUD：`list()` 返回脱敏摘要（不含密码，按 `updatedAt` 倒序）、`get()` 返回 `structuredClone` 副本。
- 字段校验上限：名称 200、账号 500、地址 2048、分类 100、备注 5000、标签 20×50、密码 1024；
  主密码 15–1024；密码按 Unicode 码点计数，**保存时不做 trim/截断**（保留原始空格与 emoji）。
- `changeMasterPassword()`：校验当前密码 → 重新派生 KEK → 重封装同一 DEK → 原子替换；
  旧备份仍用旧主密码解锁。
- `replaceFromBackupFile()`：先验证备份密码与结构，再留 `pre-restore` 副本，最后重加密替换。

### 4.4 生成器与强度（`password.service.ts`）

- `crypto.randomInt` 无偏取样 + Fisher–Yates 洗牌，保证每类字符至少出现一次。
- 字符集：大写 / 小写 / 数字 / `!@#$%^&*()-_=+[]{};:,.?`，长度 8–20。
- 易混淆字符集 `0O1lI|` 可排除；排除后字符集为空则报 `INVALID_INPUT`。
- 强度估算：按字符类估算池大小 × 长度得熵，再对重复率低、纯重复、常见序列、常见弱口令做衰减，
  输出 score 0–4 与改进建议（属于启发式提示，不是安全保证）。

### 4.5 备份、剪贴板、IPC

- 备份经 `dialog.showSaveDialog` 导出快照，文件名 `SecurePass-backup-<时间>.securepass`；
  恢复用 `showOpenDialog`，支持 `.securepass` / `.bak`。
- 剪贴板：复制后按设置（5–300 秒，默认 30 秒）清理，且**仅当内容仍是本次复制的内容**时才清空。
- IPC：主进程统一 try/catch，`AppError.code` 序列化给渲染层；渲染层 `invoke()` 解包并抛带 `code` 的 Error。
- 窗口安全：`contextIsolation: true`、`nodeIntegration: false`、`sandbox: true`、禁用权限请求、
  拦截 `will-navigate` / `will-attach-webview` / `window.open`，CSP 限制脚本与网络来源。

### 4.6 界面（`src/renderer/**`）

- 三个路由页：密码生成器、密码库、设置；未初始化显示创建主密码，未解锁显示解锁页。
- 状态：`auth.store`（引导/创建/解锁/锁定）、`vault.store`（列表/CRUD/本地过滤）、`settings.store`。
- 密码库支持表格、搜索（名称/账号/地址/分类/标签，**不含密码与备注**）、查看/复制/编辑/删除、
  收藏标记；生成器支持一键保存到密码库。
- 设置页支持自动锁定、剪贴板时长、主题、语言、改主密码、导出备份、选择备份并恢复。

---

## 5. 数据流与错误码

- 渲染层只通过 `SecurePassApi` 的固定方法访问数据，无法读写密码库文件或调用任意 Node API。
- 统一错误码：`INVALID_INPUT`、`VAULT_NOT_FOUND`、`VAULT_ALREADY_EXISTS`、`VAULT_LOCKED`、
  `VAULT_ALREADY_UNLOCKED`、`INVALID_MASTER_PASSWORD`、`WEAK_MASTER_PASSWORD`、`CORRUPTED_VAULT`、
  `UNSUPPORTED_FORMAT`、`VAULT_BUSY`、`ITEM_NOT_FOUND`、`BACKUP_FAILED`、`RESTORE_FAILED`、
  `CRYPTO_FAILURE`、`STORAGE_FAILURE`、`INTERNAL_ERROR`。
- 锁定后主进程广播 `event:locked`，渲染层立即清空列表并回到解锁页。

---

## 6. 代码评审发现（建议在后续完善中处理）

### 6.1 缺陷 / 数据一致性（建议优先）

1. **编辑记录会丢失 `lastUsed`**
   `VaultService.updateItem()` 用 `{ ...normalizeDraft(draft), id, createdAt, updatedAt }` 整体替换记录，
   而 UI 的 `VaultItemDraft` 不携带 `lastUsed`，`normalizeDraft` 会把它置为 `undefined`，
   于是“最近使用时间”在每次编辑后被清空。修复方向：`updateItem` 中保留 `existing.lastUsed`
   （或让渲染层回传）。
2. **保存失败时编辑器表单被清空**
   `VaultEditor.submit()` 在 `await onSubmit(...)` 之后无条件 `form.resetFields()`，
   而 `PasswordVault.submit()` 内部吞掉异常（只弹 message），因此保存失败时弹窗仍在但输入内容被清空。
   修复方向：`onSubmit` 失败时向上抛出，或在成功分支才 reset。
3. **`npm run test:coverage` 不可用**
   `vitest.config.ts` 配置了 `coverage.provider: 'v8'`，但 `package.json` 未声明 `@vitest/coverage-v8`。

### 6.2 设置项未落地（明显功能缺口）

4. **主题设置无效**：`AppSettings.theme` 已持久化（light/dark/auto），但 `main.tsx` 的
   `ConfigProvider` 只有固定 token，没有 `theme.darkAlgorithm`，也没有 `prefers-color-scheme` 监听；
   `index.css` 全部为浅色硬编码。
5. **语言设置无效**：`AppSettings.language` 已持久化，但 `ConfigProvider locale` 硬编码为 `zhCN`，
   界面文案全部为中文硬编码，没有 i18n 层。
6. 对比之下 `autoLockTimeoutMinutes` 与 `clearClipboardSeconds` 是真正生效的。

### 6.3 死代码 / 未使用导出

7. `MAX_SEARCH_RESULTS`（`src/shared/constants.ts`）——全项目未使用（列表无上限；
   应在数据量增大时补上分页或截断）。
8. `constantTimeEqual()`（`crypto.service.ts`）——已导出但无调用方。
9. `VAULT_BACKUP_SUFFIX`（`constants.ts`）——备份路径实际是手写 `` `${fileName}.bak` ``。
10. `truncate()`（`renderer/utils/format.ts`）——无调用方。
11. `SecurePassApi.vault.exists()` 暴露但渲染层未使用（只用 `status()`）。

### 6.4 安全加固项

12. **IPC 未校验来源**：`ipcMain.handle` 未检查 `event.senderFrame` / 窗口标识。
    当前只有本地打包页面，风险有限；若将来引入多窗口或远程内容，应先加 sender 白名单。
13. **CSP 可再收紧**：`index.html` 缺少 `object-src 'none'`、`base-uri 'none'`、`frame-ancestors 'none'`。
14. **锁定时不清空剪贴板**：`ClipboardService` 只在定时器到期或退出时清理，
    锁定/休眠路径没有立即清理已复制的密码。
15. **`lock()` 不释放锁文件**：`StorageService` 的写锁从解锁一直持有到进程退出，
    多进程/多实例场景下其他实例无法接管（单实例锁 `requestSingleInstanceLock` 已缓解）。
16. **内存零化不彻底**：已明确记录的限制——JS 字符串无法可靠清零。

### 6.5 性能与工程化

17. **渲染包未做代码分割**：单 chunk 1,107 kB（gzip 349 kB），antd 被整体打入；
    可用 `build.rollupOptions.output.manualChunks` 或按需引入优化 Vite 的 500 kB 警告。
18. **`create()` 多派生一次密钥**：创建后立刻 `openVaultFile()` 再跑一次 Argon2id，属于可省的开销。
19. **缺少图标资源**：`build/` 目录只有 `README.md`，`electron-builder.yml` 指向 `build` 作为
    buildResources，但无 `icon.ico/icns/png`，打包会使用默认图标。
20. **测试覆盖盲区**：无 IPC 层、`backup.service`、`clipboard.service` 以及 React 组件的测试；
    `vitest.config.ts` 已配置 jsdom，具备补测试的基础。
21. **搜索范围**：`filterItems` 不包含 `notes`（与“不搜索密码字段”一致，但是否要搜备注需产品决策）。

---

## 7. 后续完善建议路线

**阶段一 · 工程基线**

1. 初始化 Git 仓库并提交当前基线（第 1 节命令）。
2. 补 `@vitest/coverage-v8`，让 `npm run test:coverage` 可用，设定覆盖率门槛。
3. 补 IPC / backup / clipboard / 组件层测试。
4. 修复 6.1 的两个缺陷并补回归测试。

**阶段二 · 功能补全** 5. 落地主题与语言设置（antd `darkAlgorithm` + `prefers-color-scheme`；提取 i18n 文案表）。6. 应用图标与安装包资源（`build/icon.*`）。7. 数据导入导出（CSV / 通用密码管理器格式），注意默认不提供明文导出。8. 密码历史、重复密码检测、TOTP、收藏与分类视图增强、列表分页（配合 `MAX_SEARCH_RESULTS`）。

**阶段三 · 安全加固** 9. IPC sender 白名单校验；CSP 补充 `object-src` / `base-uri` / `frame-ancestors`。10. 锁定与休眠时立即清理剪贴板；可选的“空闲检测”由渲染层上报。11. 生物识别/系统钥匙串解锁适配层；密钥内存生命周期复核。

**阶段四 · 交付** 12. 打包体积优化与代码分割；启动性能测量。13. 跨平台签名/公证与自动更新（需要独立的密钥与分发设计）。14. 依赖清单、许可证与漏洞扫描纳入 CI。

---

## 8. 变更溯源

部署过程只做了以下动作，未修改任何业务代码：

| 动作                 | 位置                                                                               |
| -------------------- | ---------------------------------------------------------------------------------- |
| 解压源码             | `D:\ToolsDataSite\SecurePass\**`（81 个文件，与 zip 一致）                         |
| 基线快照             | `D:\ToolsDataSite\.baseline\SecurePass-0.1.0-source\**`                            |
| 安装依赖             | `SecurePass\node_modules\`                                                         |
| 构建产物             | `SecurePass\dist\`、`SecurePass\dist-electron\`（已被 `.gitignore` 忽略）          |
| 安装 Electron 二进制 | `SecurePass\node_modules\electron\dist\`                                           |
| 本文件               | `SecurePass\docs\DEPLOYMENT-NOTES.zh-CN.md`                                        |
| 需求基线             | `SecurePass\docs\REQUIREMENTS-BASELINE.zh-CN.md`（由两份启动指导文档整理）         |
| IDE 配置             | `SecurePass\.vscode\settings.json`、`tasks.json`、`launch.json`、`extensions.json` |

---

## 9. 用哪个 IDE 打开本项目

**结论：用 VS Code。** 本项目是 TypeScript + Node.js + Electron + Vite + Vitest + ESLint/Prettier，
VS Code 对这些是一等公民（内置 TS 语言服务、Node 调试器、任务与终端），且不需要任何 JDK。

| 本机工具               | 是否适合      | 路径                                                                                                                                          |
| ---------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **VS Code**            | ✅ 首选       | `C:\Users\ROG\AppData\Local\Programs\Microsoft VS Code\new_Code.exe`                                                                          |
| IntelliJ IDEA 2024.3.5 | ⚠️ 可用但更重 | `C:\D\IntelliJ IDEA\IntelliJ IDEA 2024.3.5\bin\idea64.exe`（Ultimate 带 Node 插件，可直接打开 package.json 工程）                             |
| PyCharm 2026.2.1       | ❌ 不适用     | `C:\D\Pyharm\PyCharm 2026.2.1\bin\pycharm64.exe`（Python 专用，适合打开 `D:\ToolsDataSite\Pyharm\password_manager` 那套 Python/Tkinter 版本） |
| CLion                  | ❌ 不适用     | C/C++ 项目                                                                                                                                    |

- **JDK 与本项目无关**：仓库中没有 Java/Kotlin 代码，不需要配置 JDK。本项目需要的是 Node.js ≥ 18.18（本机 v24.9.0）。
- 命令行打开：

  ```powershell
  & "C:\Users\ROG\AppData\Local\Programs\Microsoft VS Code\new_Code.exe" "D:\ToolsDataSite\SecurePass"
  ```

- 仓库已附 `.vscode/` 配置：推荐扩展、保存即格式化 + ESLint 自动修复、常用任务（dev/typecheck/lint/test/build/package），
  以及“构建后调试 Electron 主进程 / 调试当前 Vitest 文件”两个调试配置。

---

## 10. 本机常见问题（部署环境相关）

### 10.1 `'vite' 不是内部或外部命令，也不是可运行的程序或批处理文件`

**原因**：`node_modules/.bin` 里的命令软链没有生成（安装被中断时会发生）。
所有依赖包都已装好，只是缺少 `vite.cmd` 等入口，所以 `npm run dev` 找不到 `vite`。

**先确认**：

```powershell
(Get-ChildItem node_modules\.bin | Measure-Object).Count   # 正常应有 100+ 个；0 表示软链缺失
```

**修复**（本地缓存足够，通常不需要联网）：

```powershell
cd D:\ToolsDataSite\SecurePass
$env:ELECTRON_SKIP_BINARY_DOWNLOAD="1"
npm install --ignore-scripts --prefer-offline --no-audit --no-fund
```

> `--ignore-scripts` 跳过生命周期脚本，避免在受限环境下因 spawn 被拒绝而中断；
> 它只做文件布局与软链，`vite` / `tsc` / `vitest` / `eslint` / `prettier` 都会恢复。

### 10.2 重装依赖后启动报 “Electron failed to install correctly” / 找不到 `electron.exe`

**原因**：`npm install --ignore-scripts` 或中断的安装会替换 `node_modules/electron` 目录，
但没有执行提取脚本，导致 `node_modules/electron/dist` 为空、`path.txt` 缺失。

**修复**（`D:\ToolsDataSite\.securepass-local\electron` 里已有安装包，不用重新下载）：

```powershell
cd D:\ToolsDataSite\SecurePass
$env:ELECTRON_MIRROR="https://registry.npmmirror.com/-/binary/electron/"
$env:ELECTRON_CACHE="D:\ToolsDataSite\.securepass-local\electron"
$env:electron_config_cache="D:\ToolsDataSite\.securepass-local\electron"
node node_modules/electron/install.js
```

**校验**：

```powershell
node -e "console.log(require('electron'))"
# 期望输出：...\node_modules\electron\dist\electron.exe
```

### 10.3 其它环境提示

| 现象                                                                        | 说明 / 处理                                                                                                  |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `npm warn Unknown env config "side-effects-cache"`                          | 来自本机环境变量 `npm_config_side_effects_cache=false`，无害；删除该变量即可消除                             |
| GitHub 不可直连，`electron` 下载失败                                        | 用 10.2 的镜像变量；或 `$env:ELECTRON_MIRROR="https://registry.npmmirror.com/-/binary/electron/"` 后重装     |
| `npm run dev` 报端口被占用                                                  | `vite.config.ts` 设了 `strictPort: true` 且端口固定 5173，先释放该端口                                       |
| `npm run build` 报 `remove C:\Users\...\Temp\esbuild-...: Access is denied` | 构建临时目录不可写；把 `TEMP`/`TMP` 指到可写目录后重试：`$env:TEMP="D:\ToolsDataSite\.securepass-local\tmp"` |

### 10.4 `npm run dev` 后界面显示「无法连接到 localhost」

**原因**：Windows + Node 17+ 下 `localhost` 会**优先解析为 IPv6 `::1`**。实测本机：

```
dns.lookup('localhost') => [{::1, family 6}, {127.0.0.1, family 4}]
Vite httpServer.address() => {address: "::1", port: 5173}   # 只监听了 IPv6
```

而 Electron/Chromium 访问 `127.0.0.1:5173` → 连接被拒 → 显示“无法连接到 localhost”。

**已修复（代码内置）**：

- `vite.config.ts` 显式 `server.host: '127.0.0.1'`（只监听 IPv4，地址确定）；
- `src/main/renderer-target.ts` 把 dev server 地址统一规范成 `127.0.0.1`，避免插件回传 `localhost`；
- 主进程在加载失败时最多重试 20 次（每次 500 ms），避免 Electron 比 Vite 先就绪；
- 有回归测试：`tests/unit/renderer-target.test.ts`。

若仍连不上，直接用 10.5 的桌面模式。

### 10.5 桌面模式（不依赖任何本地服务器）——推荐日常使用

本项目是**桌面端应用**，只有开发时才需要 dev server。生产/日常使用请用下面任一方式：

```powershell
cd D:\ToolsDataSite\SecurePass
npm run start        # 先构建再启动（npm run build && electron .）
npm run start:built  # 已构建过，仅启动
```

或直接运行打包后的绿色版（不需要 Node、不需要服务器、不需要网络）：

```
D:\ToolsDataSite\SecurePass\release\win-unpacked\SecurePass.exe
```

两者都通过 `loadFile` 读取本地 `dist/index.html`，`VITE_DEV_SERVER_URL` 未设置时不会访问任何端口。
`npm run dev` 仅用于开发热更新。

### 10.6 打包安装包失败：`Cannot create symbolic link ... darwin\10.12\lib\libcrypto.dylib`

**原因**：electron-builder 会解压 `winCodeSign-2.6.0.7z`（内含 macOS 的符号链接），
而 Windows 默认账户没有「创建符号链接」特权，7-Zip 报 `客户端没有所需的特权`，electron-builder 重试 4 次后中止。

**处理**：

1. **开启开发者模式**（推荐，一次性）：设置 → 系统 → 开发者选项 → 打开「开发人员模式」，然后重新 `npm run package`；
2. 用**管理员身份**打开终端，再执行 `npm run package`；
3. 只产出免安装目录（不做 NSIS 安装包）：`npm run package:dir`，产物在 `release\win-unpacked\`。

> 截至 2026-11-11 实测：在完全权限下 `npm run package:dir` 能正常下载 `winCodeSign-2.6.0.7z` 并
> 由 rcedit 写入图标与版本信息（`ProductName=SecurePass`、`FileVersion=0.1.0`、
> `CompanyName=SecurePass Contributors`），不再需要关闭 `win.signAndEditExecutable`。
> 若再次遇到符号链接报错，按上面 1/2 处理即可（早期为规避该报错而加的
> `electron-builder.portable.yml` 已删除）。

> ⚠️ **打包前必须先关闭正在运行的 `SecurePass.exe`**：正在运行的实例会锁住
> `release\win-unpacked\*.dll`，导致 electron-builder 清空输出目录时报
> `remove ...d3dcompiler_47.dll: Access is denied`。

打包（GitHub 不可直连时需要镜像）：

```powershell
$env:ELECTRON_MIRROR="https://registry.npmmirror.com/-/binary/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR="https://registry.npmmirror.com/-/binary/electron-builder-binaries/"
$env:ELECTRON_BUILDER_CACHE="D:\ToolsDataSite\.securepass-local\electron-builder-cache"  # 默认缓存在工作区外，受限环境需重定向
New-Item -ItemType Directory -Force -Path D:\ToolsDataSite\.securepass-local\tmp | Out-Null
$env:TEMP="D:\ToolsDataSite\.securepass-local\tmp"
npm run package
```

### 10.7 工作区被打了**低完整性标签（Low IL）**，导致 exe 双击无反应、无法新建文件

这是 **DSH 沙箱的设计行为**，不是本项目的问题。官方 FAQ 说明：授权采用「复用缓存、永不撤销」策略，
**ACL 与低完整性标签会永久保留在项目（工作区）根目录**。

**症状**：

| 症状                                                                        | 说明                                                                                                                                                                         |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 双击工作区内的 `SecurePass.exe` 毫无反应、窗口不出现                        | exe 继承了 Low 标签 → `CreateProcess` 取 `min(令牌 IL, 映像 IL)` → **进程以 Low IL 运行** → 写 `%APPDATA%`（Medium）被 no-write-up 拒绝 → Chromium 建不了 profile → 静默退出 |
| 资源管理器 / VS Code / 普通终端里「无法新建」、保存失败、`npm install` 失败 | 这些是 Medium IL 进程，写入 Low 对象即 write-up，一律 `ACCESS_DENIED`                                                                                                        |
| 应用 profile 目录从未生成                                                   | 判据：`%APPDATA%\SecurePass` 不存在，说明应用一次都没初始化成功                                                                                                              |

**自检**：

```powershell
icacls "D:\ToolsDataSite"
# 若出现 Mandatory Label\Low Mandatory Level:(OI)(CI)(NW) 即命中此问题
icacls "D:\ToolsDataSite\SecurePass\release\win-unpacked\SecurePass.exe"
```

**应对（推荐顺序）**：

1. **把要运行的东西复制出工作区，再运行**（最可靠）：
   用**资源管理器**把 `release\win-unpacked` 整个复制到桌面或其他盘（如 `C:\Users\<你>\Desktop\SecurePass`），
   再双击其中的 `SecurePass.exe`。新文件从目标目录继承 **Medium** 标签，进程即为正常 Medium IL。
   ⚠️ 必须用资源管理器（Medium IL）复制；用沙箱命令复制出来的副本仍然是 Low。
2. **热更新开发同理**：把整份项目复制到工作区外，再在那边 `npm install && npm run dev`。
3. 手工修正标签（可能因缺少 `SeSecurityPrivilege` 被拒，且下次会话会重新打标，不推荐长期依赖）：

   ```powershell
   icacls "D:\ToolsDataSite" /setintegritylevel Medium /T /C
   ```

**结论**：工作区只用于**编辑源码与跑测试构建**（本助手的命令以 Low IL 运行，写 Low 对象没问题）；
**运行真实窗口与打包产物必须在工作区外执行**。
