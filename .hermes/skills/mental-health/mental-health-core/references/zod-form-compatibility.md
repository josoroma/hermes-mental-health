# zod@4 vs @hookform/resolvers Compatibility

## The problem

zod@4 (released 2025) changed its internal type structure — replacing `_def` with `_zod`.
This breaks type compatibility with `@hookform/resolvers` which expects the v3 internal shape.

## Symptoms

```typescript
// use-zod-form.ts — any generic wrapper around zodResolver
error TS2769: No overload matches this call.
  Argument of type 'ZodType<any, ...>' is not assignable to
  parameter of type 'Zod3Type<any, FieldValues>'.
```

Even explicit casting through `as any` or `@ts-expect-error` may fail because downstream
code that uses `Record<SeverityBand, [number, number]>` relies on zod v3's enum semantics.

## Fix

Pin zod to v3 and @hookform/resolvers to v4:

```bash
npm install zod@3
npm install @hookform/resolvers@4
```

This combination has stable types. Do NOT upgrade to zod@4 + @hookform/resolvers@5 —
the types are fundamentally incompatible.

## Additional quirk: z.nativeEnum().default()

zod@3's `.default()` on `z.nativeEnum()` has type inference issues with TypeScript string
enums (e.g. `enum ScoringType { TOTAL = "total" }`). Using `.default(ScoringType.TOTAL)`
may still fail.

**Workaround:** Cast through `as any`:

```typescript
calculation: z.nativeEnum(ScoringType).default("total" as any),
```

The runtime value is correct; only the TypeScript inference is broken.
