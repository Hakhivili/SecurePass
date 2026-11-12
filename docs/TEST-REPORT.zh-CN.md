# SecurePass 测试报告（v0.1.0 阶段一）

> 交付物对应任务书 §9「功能、异常和安全测试报告」。本报告覆盖任务书 §8 的 12 项验收标准，
> 并给出可复现命令与实测数值。
>
> - 测试日期：2026-10-05（初版）／2026-11-11（第 4 批质量加固 + 组件渲染测试后更新）
> - 被测版本：securepass@0.1.0（分支 `master`）
> - 环境：Windows 10/11 x64、Node.js v24.9.0、npm 11.12.1、Vitest 2.1.9、jsdom 25.0.1
> - 复现命令：`npm test`（单测）、`npm run test:coverage`（覆盖率，含阈值校验）

---

## 1. 结果汇总

| 检查项                 | 命令                    | 结果                                                               |
| ---------------------- | ----------------------- | ------------------------------------------------------------------ |
| 单元 / 集成 / 组件测试 | `npm test`              | ✅ **38 个文件、203 个用例全部通过**（约 36 s，含 jsdom 组件渲染） |
| 覆盖率                 | `npm run test:coverage` | ✅ 语句 85.65%、分支 87.24%、函数 83.05%（阈值 78/85/78/78）       |
| 类型检查               | `npm run typecheck`     | ✅ 0 错误（`strict` + `noUnusedLocals`）                           |
| 代码规范               | `npm run lint`          | ✅ 0 错误、0 警告                                                  |
| 格式检查               | `npm run format:check`  | ✅ 全仓库符合 Prettier 配置                                        |
| 生产构建               | `npm run build`         | ✅ `dist/` + `dist-electron/` 产出成功                             |
| 密文落盘扫描           | 见 §3.7                 | ✅ 正式文件、`.bak`、锁文件中均无业务明文                          |
| 性能基准（1000 条）    | 见 §4                   | ✅ 搜索 0.45–2.05 ms、摘要列表 0.27 ms（预算 300 ms）              |

测试文件与用例数：

| 测试文件                                                     | 用例数 | 覆盖内容                                                                                        |
| ------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------- |
| `tests/unit/crypto.service.test.ts`                          | 12     | KDF、加解密往返、错误密码、篡改检测、IV/标签长度校验、KDF 参数范围与快速失败                    |
| `tests/unit/vault.service.test.ts`                           | 8      | 建库/锁定/解锁、原样保存、CRUD、改主密码、恢复、设置                                            |
| `tests/unit/storage.service.test.ts`                         | 5      | 原子写入、单写者锁、心跳与陈旧锁回收                                                            |
| `tests/unit/password.service.test.ts`                        | 10     | 生成规则、无偏抽样、排除规则、强度与提示码                                                      |
| `tests/unit/plaintext-on-disk.test.ts`                       | 2      | 落盘明文扫描（验收 7）                                                                          |
| `tests/unit/restore-fresh-environment.test.ts`               | 3      | 全新环境恢复、错误备份不覆盖（验收 9）                                                          |
| `tests/unit/storage-interruption.test.ts`                    | 3      | 写入中断、备份失败、`.bak` 语义（验收 10）                                                      |
| `tests/unit/clipboard.service.test.ts`                       | 6      | 剪贴板定时清理与误清保护（验收 11）                                                             |
| `tests/unit/vault-performance.test.ts`                       | 4      | 1000 条记录的性能基准（验收 12）                                                                |
| `tests/unit/renderer/search-performance.test.ts`             | 3      | 渲染层搜索性能基准（验收 12）                                                                   |
| `tests/unit/renderer/duplicates.test.ts`                     | 8      | 重复录入判定与排序                                                                              |
| `tests/unit/renderer/vault-filter.test.ts`                   | 2      | 搜索过滤语义                                                                                    |
| `tests/unit/auto-lock.test.ts`                               | 5      | 系统空闲/窗口失焦驱动的自动锁定、解锁前空闲不影响新会话                                         |
| `tests/unit/payload-integrity.test.ts`                       | 5      | 负载结构修补、遗留 settings 字段迁移                                                            |
| `tests/unit/preferences.service.test.ts`                     | —      | 界面偏好规范化与写入                                                                            |
| `tests/unit/window-state.service.test.ts`                    | —      | 窗口大小/位置记忆                                                                               |
| `tests/unit/i18n-placeholders.test.ts`                       | 4      | 翻译占位符与双语键集合一致性                                                                    |
| `tests/unit/renderer-target.test.ts`                         | —      | dev server 地址规范化与重试                                                                     |
| `tests/unit/security.test.ts`                                | 6      | CSP、权限拒绝、导航白名单                                                                       |
| `tests/unit/backup.service.test.ts`                          | 4      | 备份文件大小限制（空文件/超 32 MB/目录/不可读）、正常导出与恢复                                 |
| `tests/unit/lock-clipboard.test.ts`                          | 4      | 手动锁库清理剪贴板、用户后复制不误清、自动锁定同样清理、未解锁不清                              |
| `tests/unit/restore-interruption.test.ts`                    | 2      | 恢复写入失败时旧库逐字节不变且无 `.tmp` 残留、恢复成功保留旧库副本                              |
| `tests/unit/ipc-handlers.test.ts`                            | 8      | IPC 来源校验（含子框架）、错误码透传、标题栏通道守卫                                            |
| `tests/unit/log.service.test.ts`                             | 6      | 日志格式、脱敏（含异常堆栈）、轮转                                                              |
| `tests/unit/renderer/ipc-errors.test.ts`                     | 5      | 错误码识别、本地化回退、桥接缺失                                                                |
| `tests/unit/renderer/ui-preferences.test.ts`                 | 6      | 偏好规范化、localStorage 缓存容错                                                               |
| `tests/unit/renderer/hotkeys.test.tsx`                       | 5      | 快捷键触发、输入框让位、卸载解绑                                                                |
| `tests/unit/renderer/theme.test.ts`                          | 2      | 主题解析与 `<html>` 属性写入                                                                    |
| `tests/unit/renderer/vault-gate.store.test.ts`               | 4      | 按需解锁门控的 Promise 决议                                                                     |
| `tests/unit/renderer/format-validation.test.ts`              | 3      | 时间格式化、主密码长度校验（按码点计数）                                                        |
| `tests/unit/renderer/components/password-generator.test.tsx` | 7      | 自动生成、强度条语义、复制、字符类型重算、生成失败、保存经门控/写库                             |
| `tests/unit/renderer/components/vault-panel.test.tsx`        | 8      | 锁定态解锁、列表与倒计时、搜索、分类筛选、删除确认+撤销、错误重试、Ctrl+N、手动锁定             |
| `tests/unit/renderer/components/vault-editor.test.tsx`       | 5      | 字段预填、提交成功清空、失败保留、未修改不打扰、修改后关闭需确认                                |
| `tests/unit/renderer/components/vault-item.test.tsx`         | 5      | 详情字段/标签/时间戳、密码遮罩、复制账号与密码、复制失败提示、空字段占位                        |
| `tests/unit/renderer/components/vault-access-panel.test.tsx` | 5      | 创建长度/一致性校验、创建前确认、取消不创建、解锁错误码文案、成功回调                           |
| `tests/unit/renderer/components/settings.test.tsx`           | 7      | 锁定禁用与提示、关于区块/打开目录、主题与强调色、自动锁定修改、改主密码校验、导出、恢复二次确认 |
| `tests/unit/renderer/components/common.test.tsx`             | 7      | 强度计语义、错误边界与兜底按钮、标题栏导航、工作台布局、按需解锁对话框                          |
| `tests/unit/renderer/components/duplicate-guard.test.tsx`    | 6      | 无重复放行、确认保留/返回修改、未加载先拉取、excludeId、剪贴板工具                              |

---

## 2. 验收标准逐项对照（任务书 §8）

| #   | 验收项         | 验证方式                                                                                               | 结论 |
| --- | -------------- | ------------------------------------------------------------------------------------------------------ | ---- |
| 1   | 长度与字符规则 | 8–20 全长度生成；每类字符至少一个；排除易混淆字符；非法配置抛 `INVALID_INPUT`                          | ✅   |
| 2   | 随机实现       | 代码使用 `crypto.randomInt`（CSPRNG），Fisher–Yates 洗牌；无 `Math.random`/时间戳                      | ✅   |
| 3   | 外部密码保存   | 含空格、中文、emoji、1024 个 Unicode 码点的密码保存后逐字符一致，无 trim/截断                          | ✅   |
| 4   | 记录操作       | 新增/编辑/取消/搜索/删除；编辑失败保留输入；解锁后可重新读取                                           | ✅   |
| 5   | 主密码         | 正确密码可解锁；错误密码返回统一错误码且不返回任何记录                                                 | ✅   |
| 6   | 锁定           | 手动 `lock()`、超时定时器、`powerMonitor` 锁屏/休眠三条路径；锁定后访问抛 `VAULT_LOCKED`               | ✅   |
| 7   | 加密落盘       | 哨兵数据扫描全目录：`vault.securepass`、`.bak`、`vault.lock` 均不含明文；正式文件仅含 magic/密文结构   | ✅   |
| 8   | 篡改检测       | 修改密文后解密失败（GCM 认证标签），不输出未认证内容                                                   | ✅   |
| 9   | 备份恢复       | 全新目录恢复全部记录且重新生成 `vaultId`/盐；错误密码、篡改密文、版本不兼容均被拒绝且不修改现有文件    | ✅   |
| 10  | 中断处理       | 注入 `rename` 失败：正式文件逐字节不变、无 `.tmp` 残留、旧版本仍可解锁；注入 `copyFile` 失败：拒绝写入 | ✅   |
| 11  | 剪贴板         | 到点清理本次内容；用户后来复制的内容不被误清；新复制重置计时；`dispose` 立即清理且不误清               | ✅   |
| 12  | 性能           | 1000 条记录检索远低于 300 ms 预算（见 §4）                                                             | ✅   |

---

## 3. 安全与异常用例说明

### 3.1 密钥与加密（`crypto.service.test.ts`）

- Argon2id → KEK → 解密 DEK → 解密 payload 的完整往返；
- 错误主密码、密文篡改均返回 `INVALID_MASTER_PASSWORD`（不区分「密码错误」与「文件损坏」）；
- `verifyMasterPassword` 只验证封装密钥，不暴露 DEK。

### 3.2 主密码修改（`vault.service.test.ts`）

- 改主密码后：旧主密码无法解锁、新主密码可解锁；
- **旧备份仍可用旧主密码打开**（任务书 §3.3 语义），确认“改主密码 ≠ 撤销旧备份访问”。

### 3.3 恢复与回滚（`restore-fresh-environment.test.ts`、`vault.service.test.ts`）

- 全新环境恢复：`previousBackupPath` 为空（无旧库可备份）；
- 已有库恢复：替换前生成 `pre-restore-<时间>.bak` 加密副本；
- 错误密码 / 密文篡改 / 版本不兼容：恢复被拒绝，正式文件逐字节未变。

### 3.4 中断处理（`storage-interruption.test.ts`）

原子写入链路为「写 `.tmp` → `fsync` → 保留 `.bak` → 原子 `rename`」，测试分别在第 3、第 4 步注入失败：

- `rename` 失败 → 正式文件保持旧版本、临时文件被清理、锁文件不受影响、旧版本仍可解锁；
- `copyFile` 失败 → 直接返回 `STORAGE_FAILURE`，不触碰正式文件；
- `.bak` 语义：第二次写入后 `.bak` 是「上一完整版本」，且可用同一主密码打开。

### 3.5 剪贴板（`clipboard.service.test.ts`）

- 仅在剪贴板内容仍为本次复制内容时清空；
- 用户中途复制其他内容则跳过清理；
- 复制时长下限 1 秒；`dispose()` 立即清理。

### 3.6 重复录入提醒（`duplicates.test.ts`）

- 判定维度：网址（去协议/`www.`/查询串/末尾斜杠）+ 账号 + 名称；
- 置信度分级：网址+账号(3) > 网址(2) = 名称+账号(2) > 名称(1)；
- 编辑自身时排除自身；无可比较信息时不提示。

### 3.7 落盘明文扫描（`plaintext-on-disk.test.ts`）

用可识别哨兵数据（标题、账号、密码、网址、备注、分类、标签、主密码）写入后，
递归读取密码库目录下**所有文件**的文本，断言：

- 任一文件都不包含哨兵明文（同时检查 base64 编码形态）；
- 正式文件仍为自我描述的加密容器（`"magic": "SECUREPASS"` + `aes-256-gcm`）；
- 改主密码后（新旧文件并存）与多次写入后（`.bak` 存在）同样成立。

---

## 4. 性能实测（验收标准第 12 项）

预算：1000 条记录常规搜索 < 300 ms。

| 场景                                      | 实测        | 预算     |
| ----------------------------------------- | ----------- | -------- |
| `VaultService.list()`（1000 条摘要+排序） | **0.29 ms** | 300 ms   |
| `VaultService.get(id)`（1000 条中定位）   | **0.12 ms** | 300 ms   |
| `filterItems`（1000 条 × 5 种关键字）     | **1.93 ms** | 300 ms   |
| `filterItems`（1000 条单次查询）          | **0.43 ms** | 300 ms   |
| 解锁（测试用低成本 KDF 1 轮 / 1 MiB）     | 11–20 ms    | 单独评估 |

> 说明：解锁耗时不作为验收项（任务书要求“单独评估”）。生产参数为 Argon2id 3 轮 / 64 MiB / 并行 4，
> 单测使用注入的低成本参数（`CryptoService` 构造参数）以避免每个用例都承担完整派生成本，
> 加解密逻辑与生产完全一致。

---

## 5. 端到端冒烟（真实打包产物）

`tools/e2e-smoke.mjs` 通过 Chromium DevTools 协议操作**已打包的** `SecurePass.exe`，覆盖 jsdom 无法触及的部分
（真实 IPC、真实加密成本、antd 弹窗层叠）：

```powershell
# 1) 用临时 user-data-dir 启动打包产物并打开调试端口
release\win-unpacked\SecurePass.exe --user-data-dir=%TEMP%\sp-e2e --remote-debugging-port=9223
# 2) 另开终端执行
node tools/e2e-smoke.mjs --port 9223 --password "correct horse battery staple"
```

2026-11-11 在 Windows 11 + `SecurePass-0.1.0-win-x64` 上实测 12/12 通过：

| 流程       | 断言                                                              |
| ---------- | ----------------------------------------------------------------- |
| 创建密码库 | 创建前弹出「确认创建密码库？」二次确认，确认后进入已解锁状态      |
| 新增记录   | 填写名称/账号/密码并保存后，列表增加一条记录                      |
| 重复提醒   | 相同名称+账号再次保存时弹出「发现可能重复的记录」，选返回修改不变 |
| 编辑器关闭 | 未保存时关闭需确认，关闭后无残留弹窗                              |
| 删除与撤销 | 删除有 Popconfirm，删除后列表减少，点「撤销」后记录恢复           |
| 锁定与解锁 | 锁定后回到解锁表单；错误主密码提示「密码错误」；正确密码可解锁    |

同时人工核对落盘文件（`vault.securepass`，1090 B）：JSON 只含 `magic` / `formatVersion` / `vaultId` /
`kdf` / `wrappedDataKey` / `payload` / `createdAt` / `updatedAt`，标题、账号、密码与主密码的明文与
base64 形态均**不存在**；`logs/main.log` 只记录 `[ipc] vault:unlock failed: INVALID_MASTER_PASSWORD`，不含任何秘密。

---

## 6. 未覆盖范围（已知盲区）

| 盲区                         | 原因 / 后续计划                                                       |
| ---------------------------- | --------------------------------------------------------------------- |
| CI 内的 Electron 端到端      | 已有手动 E2E 冒烟脚本；自动化到 CI 需 xvfb / Playwright Electron 支持 |
| `BackupService` 的真机对话框 | 单元测试已 mock `dialog`；真实系统对话框仍需人工点一次                |
| 组件渲染的动画/布局效果      | jsdom 不做真实布局与绘制，视觉回归需靠人工或截图对比                  |
| macOS / Linux 真机验证       | 当前仅在 Windows 上执行；CI 已配置三平台构建                          |

> 已补齐（2026-11-11）：`src/main/ipc/index.ts` 的参数校验与错误序列化（`tests/unit/ipc-handlers.test.ts`）、
> 安全审查第一批（KDF 参数范围、备份大小限制、日志堆栈脱敏、锁库清理剪贴板、IPC 主框架校验，
> 见 `crypto.service.test.ts` / `backup.service.test.ts` / `log.service.test.ts` / `lock-clipboard.test.ts` /
> `restore-interruption.test.ts` / `ipc-handlers.test.ts`）、
> React 组件渲染与交互（`tests/unit/renderer/components/*`，8 个文件 50 个用例）、覆盖率门槛
> （`@vitest/coverage-v8` + 阈值 78/85/78/78，CI 使用 `npm run test:coverage`）、真实产物 E2E 冒烟
> （`tools/e2e-smoke.mjs`）。

---

## 6. 本阶段修复的缺陷与新增能力

| 类型 | 内容                                                                  | 位置                                                      |
| ---- | --------------------------------------------------------------------- | --------------------------------------------------------- |
| 缺陷 | 编辑记录会清空 `lastUsed`（最近使用时间）                             | `src/main/services/vault.service.ts` + 单测               |
| 缺陷 | 保存失败或取消后编辑表单被清空                                        | `VaultEditor.tsx` / `PasswordVault/index.tsx`             |
| 缺陷 | `theme` / `language` 设置已持久化但界面未生效                         | 新增 `i18n/`、`utils/theme.ts`、CSS 变量与 antd 算法切换  |
| 功能 | 重复录入提醒（任务书 §3.2）                                           | `utils/duplicates.ts`、`utils/use-duplicate-guard.tsx`    |
| 改进 | 主进程只返回错误码/提示码，界面文案集中到 `i18n/messages.ts`（中/英） | `src/shared/types/password.types.ts`、`docs/API.md`       |
| 改进 | 强度建议与生成器提示改为展示在界面上（原先计算但未显示）              | `PasswordStrength.tsx`、`GeneratorDisplay.tsx`            |
| 清理 | 移除死代码 `truncate()` 与重复的错误码映射函数                        | `src/renderer/utils/format.ts`、`utils/ui-preferences.ts` |

---

## 7. 结论

- 任务书 §8 的 12 项验收标准**全部有可执行证据支撑**；
- 首版唯一的功能缺项（重复录入提醒）已补齐；
- 安全相关的核心不变量（无明文落盘、篡改检测、中断不损坏数据、备份失败不覆盖）已由自动化测试锁定；
- 剩余工作见 `docs/REQUIREMENTS-BASELINE.zh-CN.md` §7 与 `docs/OPEN-SOURCE-CHECKLIST.zh-CN.md`。
