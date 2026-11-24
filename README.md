# SecurePass

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-219%20passing-brightgreen.svg)](docs/TEST-REPORT.zh-CN.md)
[![Coverage](https://img.shields.io/badge/coverage-86%25-brightgreen.svg)](docs/TEST-REPORT.zh-CN.md)

SecurePass is an offline, cross-platform desktop password generator and encrypted local vault.
It is built with Electron, React, TypeScript and Vite.

## Download

Prebuilt installers are attached to every [release](__REPO_URL__/releases) (`v0.1.0` and later):

| Platform | Artifact                                        |
| -------- | ----------------------------------------------- |
| Windows  | `SecurePass-<version>-win-x64.exe` (NSIS)       |
| macOS    | `SecurePass-<version>-<arch>.dmg` / `.zip`      |
| Linux    | `SecurePass-<version>-<arch>.AppImage` / `.deb` |

Builds are unsigned, so Windows SmartScreen / macOS Gatekeeper will ask for confirmation on first
launch. Each release ships a `SHA256SUMS.txt`; please verify your download against it.

## Features

- **Unlock on demand**: the generator works right after launch; the master password is only
  required for vault actions (view / save / edit)
- Single workbench page: generator and vault side by side (layout is configurable)
- Cryptographically secure random password generation (8-20 characters) with configurable
  character classes, ambiguous-character exclusion, strength meter and entropy estimate
- Local encrypted vault with CRUD, search, category filter, tags, favorites and undoable delete
- Duplicate-entry warning before saving the same site/account twice
- Argon2id key derivation and AES-256-GCM authenticated encryption
- Idle-aware auto locking (system idle time + window focus), system lock/suspend locking and
  clipboard auto-clear
- Encrypted backup export and replace-with-rollback restore
- Dark / light / follow-system theme, six accent presets and Chinese/English UI
- Keyboard shortcuts (`Ctrl/Cmd + N` new record, `+ F` search, `+ L` lock) and screen-reader labels
- No network calls, no telemetry and no plaintext export by default

## Requirements

- Node.js >= 18.18
- npm >= 9

## Running

**Desktop mode (recommended for daily use)** — builds and starts the desktop app from local files,
with **no local server involved**:

```bash
npm install
npm run start        # same as: npm run build && electron .
```

Use `npm run start:built` if you already built, or run the packaged app at
`release/win-unpacked/SecurePass.exe`.

**Development mode (hot reload)** — runs the Vite dev server together with Electron:

```bash
npm run dev
```

> The dev server is bound explicitly to `127.0.0.1:5173` (IPv4) because on Windows `localhost` may
> resolve to `::1`, which shows up as "cannot connect to localhost". If it still fails, use the
> desktop mode above.

Quality checks:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test              # 35 files / 182 tests
npm run test:coverage # thresholds: 78 / 85 / 78 / 78
npm run build
```

Packaging:

```bash
npm run package       # installer for the current platform
npm run package:dir   # unpacked directory only, fastest smoke test
```

Builds are not code-signed; Windows SmartScreen and macOS Gatekeeper will ask for confirmation the
first time the app runs. Compare the download against the `SHA256SUMS.txt` published with each
release.

## Project Layout

```
src/
  main/        Electron main process: security, storage, backup, IPC
  preload/     Context-isolated bridge exposed as window.securepass
  renderer/    React UI, Zustand stores and renderer helpers
  shared/      Types, constants and error codes shared by all processes
tools/         Icon and third-party notice generators
```

## Documentation

| Document                                                         | Content                                                               |
| ---------------------------------------------------------------- | --------------------------------------------------------------------- |
| [docs/USER-GUIDE.zh-CN.md](docs/USER-GUIDE.zh-CN.md)             | 用户手册：安装、首次使用、备份、常见问题                              |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)                     | Process model, auth lifecycle, extension points                       |
| [docs/API.md](docs/API.md)                                       | IPC surface                                                           |
| [docs/DEPLOYMENT-NOTES.zh-CN.md](docs/DEPLOYMENT-NOTES.zh-CN.md) | 开发环境、常用命令、打包与排障                                        |
| [docs/RELEASING.zh-CN.md](docs/RELEASING.zh-CN.md)               | 版本号、变更日志与发布流程                                            |
| [docs/TEST-REPORT.zh-CN.md](docs/TEST-REPORT.zh-CN.md)           | 验收项、测试与覆盖率情况                                              |
| [docs/ROADMAP.zh-CN.md](docs/ROADMAP.zh-CN.md)                   | 三个里程碑（M1 自用可开源 → M2 日常全覆盖 → M3 商业级）与明确不做的事 |
| [docs/PRIVACY.zh-CN.md](docs/PRIVACY.zh-CN.md)                   | 隐私说明：唯一联网行为与日志脱敏                                      |
| [docs/MAINTENANCE.zh-CN.md](docs/MAINTENANCE.zh-CN.md)           | 永久开源承诺、维护状态与安全支持窗口                                  |
| [SECURITY.md](SECURITY.md)                                       | Threat model, crypto parameters, how to report a vulnerability        |
| [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)                 | Licenses of bundled dependencies                                      |

## Vault Location

The vault is stored outside the repository in the Electron user data directory:

- Windows: `%APPDATA%/SecurePass/vault.securepass`
- macOS: `~/Library/Application Support/SecurePass/vault.securepass`
- Linux: `~/.config/SecurePass/vault.securepass`

## License

MIT

## Disclaimer

This software is provided "as is", without warranty of any kind. Keep your master password safe:
there is no recovery mechanism, and encrypted backups cannot be decrypted without the master password
that was active when they were created.
