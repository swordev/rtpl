---
"@rtpl/cli": minor
---

Add file modes and owners to resources:

- New `mode` (`0o640`, `"0640"` or `"640"`), `owner` and `group` (names or numeric ids) resource options, exposed as `res.mode`, `res.owner` and `res.group`. Undeclared attributes are not managed
- `diff`, `check` and `install` compare them with the installed files, report attribute-only changes as `[P]` and apply them (`chown` before `chmod`; new files are created with the declared mode)
- Backups store the mode, uid and gid of each file and `restore` applies them
- Attributes are ignored on Windows
- `DirRes` keeps `mode`, `owner` and `group` as custom options (directory attributes are not managed yet)
