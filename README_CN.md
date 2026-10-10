# SecurePass

SecurePass 是一款离线、跨平台的桌面密码生成与管理工具，技术栈为 Electron + React +
TypeScript + Vite。

当前版本是项目基础架构：安全核心、存储格式、IPC 边界、生成器、密码库 CRUD、设置与加密备份恢复
已经实现，界面保持精简，后续可在现有结构上继续完善。

## 已实现能力

- 使用安全随机数生成 8-20 位密码
- 可配置字符类型与易混淆字符排除
- 本地加密密码库，支持新增、查看、编辑、删除、搜索、分类与标签
- Argon2id 密钥派生与 AES-256-GCM 认证加密
- 自动锁定、系统锁屏/休眠锁定、剪贴板定时清理
- 加密备份导出与“替换当前库 + 自动保留加密副本”恢复
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
npm test
npm run build
```

打包：

```bash
npm run package
```

## 目录结构

```
src/
  main/        Electron 主进程：安全、存储、备份、IPC
  preload/     上下文隔离桥，暴露为 window.securepass
  renderer/    React 界面、Zustand 状态与渲染层辅助函数
  shared/      跨进程共享的类型、常量与错误码
```

更多说明见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) 与 [docs/SECURITY.md](docs/SECURITY.md)。

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
