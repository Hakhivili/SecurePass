# SecurePass

SecurePass is an offline, cross-platform desktop password generator and encrypted local vault.
It is built with Electron, React, TypeScript and Vite.

The project is currently a foundation skeleton: the security core, storage format, IPC boundary,
generator, vault CRUD, settings and encrypted backup/restore are implemented, while the UI is intentionally minimal.

## Features

- Cryptographically secure random password generation (8-20 characters)
- Configurable character classes and ambiguous-character exclusion
- Local encrypted vault with CRUD, search, categories and tags
- Argon2id key derivation and AES-256-GCM authenticated encryption
- Automatic locking, system lock/suspend locking and clipboard auto-clear
- Encrypted backup export and replace-with-rollback restore
- No network calls, no telemetry and no plaintext export by default

## Requirements

- Node.js >= 18.18
- npm >= 9

## Development

```bash
npm install
npm run dev
```

Quality checks:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Packaging:

```bash
npm run package
```

## Project Layout

```
src/
  main/        Electron main process: security, storage, backup, IPC
  preload/     Context-isolated bridge exposed as window.securepass
  renderer/    React UI, Zustand stores and renderer helpers
  shared/      Types, constants and error codes shared by all processes
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/SECURITY.md](docs/SECURITY.md).

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
