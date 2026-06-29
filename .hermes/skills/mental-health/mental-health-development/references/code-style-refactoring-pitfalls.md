# Code Style Refactoring Pitfalls

## When bulk sed/perl breaks TypeScript

Running `sed` or `perl` to convert double quotes to single quotes, remove semicolons, or convert function declarations to arrow functions across `.ts`/`.tsx` files causes predictable breakage. These patterns recur every time a bulk refactor is attempted.

## Pitfall 1: Apostrophes in single-quoted strings

**Symptom:** `TS1002: Unterminated string literal` or `TS1005: ',' expected`

**Cause:** Replacing `"` with `'` converts `"patient's"` → `'patient's'` which breaks because the apostrophe terminates the string.

**Files most affected:** `lib/prompts.ts` (natural language prompts), `app/api/clinical/generate/route.ts` (system prompts with contractions like "I've", "don't").

**Fix:** Use double quotes for strings containing apostrophes, or escape with `\'`:
```ts
// ✅ Either use double quotes for strings with apostrophes
prompt: "Audit the existing care plans against the patient's assessment results."

// ✅ Or escape
prompt: 'Audit the existing care plans against the patient\'s assessment results.'
```

## Pitfall 2: Generic function parameters

**Symptom:** `TS1005: '=>' expected` on converted function declarations

**Cause:** `export function Name<T>(params)` → `export const Name = <T>(params)` which TypeScript interprets as JSX, not a generic.

**Fix:** Do NOT bulk-convert functions with generic type parameters. Keep them as `export function`:
```ts
// ✅ Keep as function declaration when generics are present
export function listAllPatients(): Patient[]
export async function getInviteByToken<T>(token: string): Promise<T | null>
```

## Pitfall 3: Destructured props with type annotations

**Symptom:** `export const Component = ({ prop }: Props)` → broken if the regex doesn't handle the full pattern

**Cause:** The regex `s/^export function (\w+)\(/export const $1 = (/g` matches only the function name and first parenthesis, missing the closing paren and type annotation.

**Fix:** Do manual conversion for complex parameter signatures. Simple cases (`export function Name() {`) convert cleanly with perl.

## Pitfall 4: Mixed JSX/TS contexts in .tsx files

**Symptom:** Broken JSX attributes when all double quotes are converted

**Cause:** `.tsx` files use double quotes for JSX attributes (`className="flex"`) AND for import strings. A blanket `'"' → "'"` replacement breaks JSX.

**Fix:** Only convert import/export lines and `'use client'`/`'use server'` directives in `.tsx` files. Leave JSX attributes alone:
```bash
# Safe: only import/export lines
sed -i '' '/^import /s/"/'"'"'/g' "$f"
sed -i '' '/^export /s/"/'"'"'/g' "$f"
```

## Pitfall 5: Empty string sentinel in .ts files

**Symptom:** `let best = ''` becomes ambiguous when semicolons are removed and next line starts with `(`

**Cause:** After removing semicolons, `let best = ''` followed by `(el as HTMLElement).style.position = 'relative'` is interpreted as calling `''()` (empty string as function).

**Fix:** Use a non-empty sentinel value:
```ts
// ❌ Ambiguous without semicolons
let best = ''

// ✅ Clear
let best = 'default'
// ...
return best === 'default' ? null : best
```

Or insert explicit semicolons before `(` expressions:
```ts
;(el as HTMLElement).style.position = 'relative'
```

## Pitfall 6: Template literal backslash artifacts

**Symptom:** `\"` appearing in strings after sed replacement

**Cause:** Running `s/\\\"/'/g` to clean up artifacts introduced by earlier sed passes can match escaped characters incorrectly.

**Fix:** Use `write_file` to rewrite affected files cleanly rather than chaining multiple sed commands. After a bulk operation, always run `npx tsc --noEmit` and fix remaining errors one by one.

## Safe refactoring workflow

1. **Separate .ts from .tsx** — process `.ts` files aggressively (no JSX risk), `.tsx` files conservatively
2. **Run typecheck after each batch** — don't batch all changes then check
3. **Use `git checkout -- <file>`** to revert broken files and redo manually
4. **Manually fix apostrophes** — they're rare and the sed fixes are unreliable
5. **Never bulk-convert functions with generics** — keep as `export function`
