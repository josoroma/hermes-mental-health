# Hover Delete Button Pitfall

When adding a hover-reveal delete button to assessment cards in the library grid
(`app/(dashboard)/_components/assessment-library.tsx`), position it at `bottom-2 right-2` —
NOT `top-2 right-2`.

## Why

The card header already has an item count badge (`<Badge>N items</Badge>`) in the top-right
area, aligned with the card title. Placing the delete button at `top-2 right-2` causes it to
overlap the badge when it appears on hover.

## Correct pattern

```tsx
<div className="relative group/card">
  <Link href={`/editor/${measure.slug}`}>
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle>{measure.title}</CardTitle>
          <Badge>{measure.fieldCount} items</Badge>  {/* top-right */}
        </div>
      </CardHeader>
      ...
    </Card>
  </Link>
  <Button
    variant="destructive"
    size="sm"
    className="absolute bottom-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity z-10"
    onClick={...}
  >
    <Trash2 className="size-3.5" />
  </Button>
</div>
```

## File affected

`app/(dashboard)/_components/assessment-library.tsx` — the delete button on custom assessment cards.