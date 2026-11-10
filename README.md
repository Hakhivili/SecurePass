# SecurePass

SecurePass is an offline, cross-platform desktop password generator and encrypted local vault.
It is built with Electron, React, TypeScript and Vite.

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
npm test
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

| Document                                             | Content                                                        |
| ---------------------------------------------------- | -------------------------------------------------------------- |
| [docs/USER-GUIDE.zh-CN.md](docs/USER-GUIDE.zh-CN.md) | 用户手册：安装、首次使用、备份、常见问题                       |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)         | Process model, auth lifecycle, extension points                |
| [docs/API.md](docs/API.md)                           | IPC surface                                                    |
| [SECURITY.md](SECURITY.md)                           | Threat model, crypto parameters, how to report a vulnerability |
| [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md)     | Licenses of bundled dependencies                               |

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
