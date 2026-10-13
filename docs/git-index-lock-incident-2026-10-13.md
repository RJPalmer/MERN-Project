# Incident: stale Git index lock

**Date:** October 13, 2026  
**Impact:** Git staging failed until the stale lock file was removed. No project changes were lost.

## What happened

The editor's Git integration attempted to stage project changes with `git add -A -- .` and failed with:

```text
fatal: Unable to create '.git/index.lock': File exists.
```

The lock file was 0 bytes and had a filesystem timestamp of October 12, 2026 at 22:10. The process list showed a GitHub Copilot runtime and `grep`, but no active Git command. A shell from an earlier API module-load check was also listed; it had exited by the time it was checked. The Copilot runtime was not identified as a Git process.

An earlier shell from an API module-load check was also visible in the process output; it had exited by the time termination was attempted. The stale `.git/index.lock` was removed after checking the process list. `git status --short` then succeeded and showed the existing modified vendor review files.

## Root cause

The exact process that created the lock is unknown. The most likely explanation is that an earlier Git operation was interrupted or exited before cleaning up its lock file. The available evidence does not identify which tool or event left it behind.

## Recovery

Before removing a Git lock, check that no Git operation is running. If no Git process is active and the lock remains, remove `.git/index.lock` from the repository root, then retry the Git operation.

```sh
ps -eo pid,%cpu,%mem,comm | grep '[g]it'
```

Only if that check shows no active Git operation, remove the lock and check the repository again:

```sh
rm .git/index.lock
git status --short
```

Do not remove the lock while Git is actively updating the index. If the issue recurs, record which editor action or Git operation ran immediately beforehand.
