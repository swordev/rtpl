---
"@rtpl/cli": minor
---

- `check` no longer prompts for confirmation, so it fails with exit code 1 in non-interactive environments when there are changes
- `--no-backup` now skips the backup in `install`, and dry runs no longer create backups or remove directories
- Reject resource paths that escape the resources directory (`..` segments or sibling prefixes like `resources-other`)
- Report the real error when an existing resource file cannot be read
- Remove the unused `--filter` option and the `cli()` default options parameter
