# Changelog

All notable changes to this project are documented in this file.

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
