# SecurePass 开发与构建指南

> 面向贡献者的环境要求、常用命令、打包流程与常见问题。
> 架构与安全设计见 [`ARCHITECTURE.md`](ARCHITECTURE.md)，IPC 接口见 [`API.md`](API.md)，面向使用者的说明见 [`USER-GUIDE.zh-CN.md`](USER-GUIDE.zh-CN.md)。

---

## 1. 环境要求

| 项目     | 要求                                                                |
| -------- | ------------------------------------------------------------------- |
| Node.js  | ≥ 18.18（`package.json` 的 `engines`；CI 使用 20，本地 22/24 亦可） |
| npm      | ≥ 10（使用 `package-lock.json`，请勿混用 yarn/pnpm）                |
| 操作系统 | Windows 10/11、macOS 12+、Linux（AppImage / deb）                   |
| 磁盘     | 依赖 + Electron 运行时约 600 MB，打包产物另需 350 MB                |

应用本身**完全离线**运行；只有首次安装依赖与下载 Electron 二进制需要网络（可用第 5 节的镜像变量）。

---

## 2. 安装与运行

```powershell
npm install
npm run dev          # Vite 开发服务器 + Electron，带热更新
npm run start:built  # 直接启动上一次构建的产物（不重新构建）
npm start            # 先构建再启动生产产物
```

数据目录（首次创建密码库后生成）：

| 平台    | 路径                                       |
| ------- | ------------------------------------------ |
| Windows | `%APPDATA%\SecurePass`                     |
| macOS   | `~/Library/Application Support/SecurePass` |
| Linux   | `~/.config/SecurePass`                     |

其中 `vault.securepass` 为加密密码库（含 `.bak` 上一版本）、`ui-preferences.json`（主题/语言等非敏感偏好）、`window-state.json`（窗口位置与大小）、`logs\main.log`（运行日志，已脱敏、512 KB 轮转）。

---

## 3. 质量门禁

提交前请在本地跑通全部命令（CI 会按同样顺序执行）：

| 命令                    | 作用                                                                   |
| ----------------------- | ---------------------------------------------------------------------- |
| `npm run typecheck`     | `tsc --noEmit`，严格模式类型检查                                       |
| `npm run lint`          | ESLint（TypeScript + React Hooks）                                     |
| `npm run format:check`  | Prettier 校验（提交前用 `npm run format` 自动修复）                    |
| `npm test`              | Vitest 单元/组件测试（jsdom）                                          |
| `npm run test:coverage` | 覆盖率报告，阈值 statements 78 / branches 85 / functions 78 / lines 78 |
| `npm run build`         | 类型检查 + Vite 生产构建                                               |

当前基线：测试文件 35 个、用例 182 个，覆盖率约 84% / 87% / 82% / 84%。

---

## 4. 构建与打包

```powershell
npm run build        # 产物：dist/（渲染层）、dist-electron/（主进程 + preload）
npm run package:dir  # 免安装目录版：release\win-unpacked\
npm run package      # 安装包：release\SecurePass-<version>-win-x64.exe（NSIS）
```

体积基线（Windows x64、Electron 33）：

| 产物                           | 大小     | 说明                                            |
| ------------------------------ | -------- | ----------------------------------------------- |
| `resources/app.asar`           | ≈ 1.2 MB | 仅业务代码 + `hash-wasm`（其余依赖已打进 dist） |
| `release\win-unpacked\`        | ≈ 270 MB | 其中 `SecurePass.exe` 约 180 MB（含 Chromium）  |
| `SecurePass-0.1.0-win-x64.exe` | ≈ 79 MB  | LZMA 压缩后的安装包                             |

- 安装包**未做代码签名**：首次运行可能出现 SmartScreen 提示，选择「更多信息 → 仍要运行」即可；如需签名，在 `electron-builder.yml` 配置证书并去掉 CI 中的 `CSC_IDENTITY_AUTO_DISCOVERY: false`。
- 打包前请关闭正在运行的 SecurePass，否则会因文件占用报 `remove ...: Access is denied`。
- 版本号取自 `package.json`；发布工作流 `.github/workflows/release.yml` 会用 `npm pkg set version=…` 覆盖后再打包，并生成 `SHA256SUMS.txt`。

---

## 5. 镜像与缓存（网络受限时）

Electron 二进制与 electron-builder 的工具链默认从 GitHub 下载，国内网络常被阻断，可临时设置：

```powershell
$env:ELECTRON_MIRROR='https://registry.npmmirror.com/-/binary/electron/'
$env:ELECTRON_BUILDER_BINARIES_MIRROR='https://registry.npmmirror.com/-/binary/electron-builder-binaries/'
$env:ELECTRON_CACHE='<cache-dir>\electron'
$env:ELECTRON_BUILDER_CACHE='<cache-dir>\electron-builder-cache'
```

`<cache-dir>` 可指向任意可写目录（默认在 `%LOCALAPPDATA%`）。若构建过程报 esbuild 临时目录 `Access is denied`，把 `TEMP` / `TMP` 也指到可写目录即可。

---

## 6. 常见问题

### 6.1 `'vite' 不是内部或外部命令` / `'electron' 不是内部或外部命令`

`node_modules/.bin` 缺失或为空（依赖装了但软链没建）。重新安装即可：

```powershell
npm install --prefer-offline
```

### 6.2 `Electron failed to install correctly` / 找不到 `electron.exe`

二进制没下载成功。单独触发安装脚本：

```powershell
node node_modules\electron\install.js
```

配合第 5 节的 `ELECTRON_MIRROR` + `ELECTRON_CACHE` 使用。

### 6.3 开发模式下界面显示「无法连接到 localhost」

Windows 上 `localhost` 可能先解析到 `::1`，而 Chromium 走 `127.0.0.1`。仓库已在 `vite.config.ts` 固定 `server.host: '127.0.0.1'`，主进程也会对开发服务器地址做重试（`src/main/renderer-target.ts`）。若仍失败，检查 5173 端口是否被占用。

### 6.4 打包报 `Cannot create symbolic link ... darwin\10.12\lib\libcrypto.dylib`

Windows 账户缺少创建符号链接的特权，而 electron-builder 的 `winCodeSign` 工具包内含 macOS 符号链接。任选一种解决：

1. Windows 设置 → 隐私和安全性 → 开发者选项 → 打开「开发人员模式」；
2. 以管理员身份运行一次打包命令；
3. 只想验证构建时用 `npm run package:dir`（不触发签名/改元数据步骤）。

### 6.5 打包产物里 `SecurePass.exe` 的图标或版本信息仍是 Electron

说明 `rcedit` 步骤被跳过（`signAndEditExecutable: false` 或执行失败）。默认配置会写入 `build/icon.ico` 与 `package.json` 的 `productName` / `version` / `author`，可执行 `npm run package:dir` 后用资源管理器查看「属性 → 详细信息」确认。

### 6.6 应用启动后立刻退出、无窗口

- 确认没有已在运行的实例：应用是单实例的，第二个实例会直接退出并把窗口带到前台；
- 查看数据目录下的 `logs\main.log`，最近一次启动/退出都会记录在这里。

---

## 7. 相关文档

| 文档                                                               | 内容                           |
| ------------------------------------------------------------------ | ------------------------------ |
| [`ARCHITECTURE.md`](ARCHITECTURE.md)                               | 进程模型、鉴权生命周期、扩展点 |
| [`API.md`](API.md)                                                 | IPC 接口清单与错误码           |
| [`TEST-REPORT.zh-CN.md`](TEST-REPORT.zh-CN.md)                     | 验收项与测试覆盖情况           |
| [`REQUIREMENTS-BASELINE.zh-CN.md`](REQUIREMENTS-BASELINE.zh-CN.md) | 需求基准与验收标准             |
| [`USER-GUIDE.zh-CN.md`](USER-GUIDE.zh-CN.md)                       | 面向使用者的操作手册           |
| [`../CONTRIBUTING.md`](../CONTRIBUTING.md)                         | 贡献流程与代码规范             |
