# SecurePass

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-182%20passing-brightgreen.svg)](docs/TEST-REPORT.zh-CN.md)
[![Coverage](https://img.shields.io/badge/coverage-84%25-brightgreen.svg)](docs/TEST-REPORT.zh-CN.md)

SecurePass 是一款离线、跨平台的桌面密码生成与管理工具，技术栈为 Electron + React +
TypeScript + Vite。

## 下载

每个 [Release](__REPO_URL__/releases) 都附带各平台安装包（`v0.1.0` 起）：

| 平台    | 产物                                            |
| ------- | ----------------------------------------------- |
| Windows | `SecurePass-<version>-win-x64.exe`（NSIS）      |
| macOS   | `SecurePass-<version>-<arch>.dmg` / `.zip`      |
| Linux   | `SecurePass-<version>-<arch>.AppImage` / `.deb` |

构建产物未做代码签名，首次运行时 Windows SmartScreen / macOS Gatekeeper 会要求确认；
每个 Release 附带 `SHA256SUMS.txt`，请对照校验下载文件。

## 已实现能力

- **按需解锁**：启动即可使用密码生成器，只有查看/保存密码库时才需要主密码
- 单页「工作台」：生成器与密码库同屏，位置可切换（上 / 左 / 右）
- 使用安全随机数生成 8-20 位密码，可配置字符类型与易混淆字符排除，并给出强度、熵值与建议
- 本地加密密码库：新增、查看、编辑、删除（8 秒内可撤销）、搜索、分类筛选、标签与收藏
- 保存前检测重复记录（同站点 + 同账号）并提醒
- Argon2id 密钥派生与 AES-256-GCM 认证加密
- 基于系统空闲与窗口焦点的自动锁定、系统锁屏/休眠锁定、剪贴板定时清理
- 加密备份导出与“替换当前库 + 自动保留加密副本”恢复（有二次确认）
- 浅色 / 深色 / 跟随系统主题，6 套强调色，中英双语界面
- 键盘快捷键（`Ctrl/Cmd + N` 新增、`+ F` 搜索、`+ L` 锁定）与读屏标签
- 不联网、不采集数据、默认不提供明文导出

## 环境要求

- Node.js >= 18.18
- npm >= 9

## 运行

**桌面模式（推荐，日常使用）**——构建后直接启动桌面程序，加载本地文件，**不依赖任何本地服务器**：

```bash
npm install
npm run start        # 等价于 npm run build && electron .
```

已构建过时可以直接 `npm run start:built`；打包后的绿色版在 `release/win-unpacked/SecurePass.exe`。

**开发模式（热更新）**：需要 Vite dev server 与 Electron 同时运行。

```bash
npm run dev
```

> dev server 固定监听 `127.0.0.1:5173`（显式 IPv4，避免 Windows 上 `localhost` 解析到 `::1` 导致
> “无法连接到 localhost”）。若仍连不上，请改用上面的桌面模式。

质量检查：

```bash
npm run typecheck
npm run lint
npm run format:check
npm test              # 35 个文件 / 182 个用例
npm run test:coverage # 阈值 78 / 85 / 78 / 78
npm run build
```

打包：

```bash
npm run package       # 当前平台的安装包
npm run package:dir   # 只产出免安装目录，最快的冒烟验证
```

构建产物未做代码签名，首次运行时 Windows SmartScreen / macOS Gatekeeper 会要求确认；
下载后可对照发布页的 `SHA256SUMS.txt` 校验文件完整性。

## 目录结构

```
src/
  main/        Electron 主进程：安全、存储、备份、IPC
  preload/     上下文隔离桥，暴露为 window.securepass
  renderer/    React 界面、Zustand 状态与渲染层辅助函数
  shared/      跨进程共享的类型、常量与错误码
tools/         应用图标与第三方许可清单的生成脚本
```

## 文档

| 文档                                                             | 内容                                     |
| ---------------------------------------------------------------- | ---------------------------------------- |
| [docs/USER-GUIDE.zh-CN.md](docs/USER-GUIDE.zh-CN.md)             | 用户手册：安装、首次使用、备份、常见问题 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                     | 进程模型、鉴权生命周期、扩展点           |
| [docs/API.md](docs/API.md)                                       | IPC 接口清单                             |
| [docs/DEPLOYMENT-NOTES.zh-CN.md](docs/DEPLOYMENT-NOTES.zh-CN.md) | 开发环境、常用命令、打包与排障           |
| [docs/RELEASING.zh-CN.md](docs/RELEASING.zh-CN.md)               | 版本号、变更日志与发布流程               |
| [docs/TEST-REPORT.zh-CN.md](docs/TEST-REPORT.zh-CN.md)           | 验收项、测试与覆盖率情况                 |
| [SECURITY.md](SECURITY.md)                                       | 威胁模型、加密参数、漏洞上报方式         |
| [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)                 | 随包发布的第三方组件许可                 |

## 密码库位置

密码库保存在 Electron 用户数据目录，不在仓库内：

- Windows：`%APPDATA%/SecurePass/vault.securepass`
- macOS：`~/Library/Application Support/SecurePass/vault.securepass`
- Linux：`~/.config/SecurePass/vault.securepass`

## 许可证

MIT

## 免责声明

本软件按“原样”提供，不提供任何明示或暗示的保证。请妥善保管主密码：本工具不提供找回；
忘记主密码后，加密备份也无法直接解密。
