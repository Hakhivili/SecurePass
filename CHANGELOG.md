# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Added

- Single-page workbench: the generator is usable without unlocking, the vault unlocks on demand.
- Custom title bar with theme-aware colors, settings entry and window state persistence.
- Design tokens for light/dark themes, six accent presets and a configurable generator position.
- Duplicate-record warning before saving the same site/account twice.
- Undoable delete, category filter, auto-lock countdown and an "About" panel (version, runtime,
  data directory).
- Keyboard shortcuts (`Ctrl/Cmd + N/F/L`) and screen-reader labels for icon-only actions.
- Error boundary for the renderer plus `render-process-gone` recovery in the main process.
- Root `SECURITY.md`, `THIRD-PARTY-NOTICES.md` and `docs/USER-GUIDE.zh-CN.md`.
- Application icon, NSIS installer metadata and a `package-smoke` CI job.

### Fixed

- The vault lock reported a live session as stale after 30 seconds; it now relies on a 15-second
  heartbeat and a 60-second staleness window, and is only reclaimed when the owner process is gone.
- Auto locking now follows system idle time and window focus instead of vault IPC calls only.
- Vault payloads with missing or duplicated record ids and invalid timestamps are repaired on load.
- Closing the editor discards unsaved input; it now asks for confirmation first.
- Restoring a backup overwrote the vault without confirmation; it now asks and keeps a
  `pre-restore` copy.
- Edits no longer clear `lastUsed`, a failed save no longer wipes the editor, and the generated
  password no longer flickers from out-of-order generator responses.
- `{placeholder}` values in translated strings were rendered literally in some views.

### Changed

- Dependencies are no longer shipped inside `app.asar`: front-end libraries are already bundled by
  Vite, which shrinks the archive from 75 MB to about 1.2 MB.
- Windows executables now carry the application icon, product name and version (previously they kept
  Electron's defaults); the workaround config `electron-builder.portable.yml` was removed.
- Releases are published to GitHub Releases with `SHA256SUMS.txt` instead of loose artifacts.

## [0.1.0] - 2026-10-05

### Added

- Project foundation for Electron + React + TypeScript + Vite.
- Argon2id key derivation and AES-256-GCM authenticated encryption.
- Versioned encrypted vault file format with atomic writes and single-writer lock.
- Unlock session, automatic locking and system lock/suspend handling.
- Vault record CRUD with exact password preservation and local search.
- Secure password generator for 8-20 characters with ambiguous-character exclusion.
- Encrypted backup export and replace-with-rollback restore.
- Clipboard auto-clear and settings management.
- Unit tests for crypto, storage, password generation and vault workflows.
