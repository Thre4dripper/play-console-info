# Contributing

Thanks for contributing to Play Console Info.

## Before You Start

- Open an issue first for bugs, feature ideas, or API changes that affect action inputs or outputs
- Keep changes focused and avoid mixing unrelated refactors with behavior changes
- Add or update tests when behavior changes
- Keep release-facing changes aligned with the published platform matrix and release workflow

## Local Setup

```bash
git clone https://github.com/Thre4dripper/play-console-info.git
cd play-console-info
pnpm install
```

## Common Commands

```bash
pnpm test
pnpm run lint
pnpm run typecheck
```

If you need to work on the bundled mock CLI or Python CLI, use the existing build scripts under `cli/mock` and `cli/python`.

## Pull Request Guidelines

- Write a clear title and description
- Explain user-visible behavior changes
- Include test coverage for fixes and new behavior when practical
- Update README or action metadata if inputs, outputs, or platform support changes
- Keep pull requests small enough to review quickly

## Commit Messages

Clear, direct commit messages are preferred. If the change affects release notes, describe the user-facing outcome, not just the implementation detail.

## Reporting Issues

When opening a bug report, include:

- What you expected to happen
- What actually happened
- Logs or screenshots if relevant
- Your runner or OS details when the issue is platform-specific

## Security

Please do not open public issues for sensitive vulnerabilities. Use the guidance in [SECURITY.md](SECURITY.md) instead.
