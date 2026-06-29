# Hermes Tool Pitfalls for this Project

## `patch` tool — escape-drift with quotes

**Symptom**: `patch` fails with "Escape-drift detected: old_string and new_string contain
the literal sequence '\\\"' but the matched region of the file does not."

**Cause**: When `old_string` or `new_string` contains double-quote characters that get
serialized through JSON, the escaping conflicts with the file's actual content.

**Fix**: Use `write_file` to rewrite the entire file instead of patching specific lines.
This is especially useful for:
- JSON files with quoted strings
- JSX/TSX files with many quote-escaped attributes
- Mermaid diagrams in markdown

**Pattern**: After 2 failed `patch` attempts on the same file with escape-related errors,
switch to `write_file` — don't attempt a third patch.

## `patch` in `execute_code` — different signature

**Symptom**: Calling `patch(path, old, new)` from `hermes_tools` inside `execute_code`
produces errors like `'content'` or positional arg mismatches.

**Cause**: The `patch` function exposed in `execute_code`'s hermes_tools module has a
different signature than the main tool. It expects:
```python
patch(path: str, old_string: str, new_string: str, replace_all: bool = False) -> dict
```
NOT the keyword form `patch(mode='replace', path=..., old_string=..., new_string=...)`.

**Fix**: Use the main `patch` tool directly from the conversation. Reserve `execute_code`
for multi-step scripts where you need processing between tool calls. For single
find-and-replace operations, the main tool is simpler and more reliable.

## `write_file` as the reliable fallback

When editing a corrupted file (e.g., after a bad patch), `write_file` is the fastest
path to a clean state. Don't spend time trying to surgically fix a badly mangled file —
read the current (broken) state, identify the correct content, and rewrite it.

## Batch implementation workflow

When implementing multiple epics at once from SPECS.md:

1. Read all relevant SPECS sections + existing code in one batch
2. Write all new files (create directories as needed)
3. Run `npm run typecheck` to catch all errors at once
4. Fix errors in batch — prefer `write_file` for files needing multiple fixes
5. Run `npm run lint` for warnings
6. Clean up unused imports
7. Run `npm test` to verify no regressions
8. Test routes with `curl`

This avoids the slow iterate-fix-iterate cycle and keeps context clean.
