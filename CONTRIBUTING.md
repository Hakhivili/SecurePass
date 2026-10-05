# Contributing

Thanks for your interest in SecurePass.

## Development Flow

1. Create a branch from `main`.
2. Keep changes focused on one problem.
3. Add or update tests for behavior changes.
4. Run the full local checks before opening a pull request.

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Code Guidelines

- TypeScript strict mode is enabled; avoid `any` unless there is a documented reason.
- Keep cryptographic and storage logic in the main process.
- Never log, serialize or transmit plaintext passwords, master passwords or key material.
- Do not silently truncate or normalize stored passwords.
- Prefer established cryptographic libraries over custom implementations.

## Security Issues

Do not open a public issue for an unpatched vulnerability. Report it privately to the maintainers with
reproduction steps and impact.
