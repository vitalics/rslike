---
"@rslike/cmp": minor
"@rslike/std": minor
"@rslike/dbg": patch
---

## Fixes

### [@rslike/cmp]

- Number[Symbol.compare] is not a function error.

Before:

```ts
(9)[Symbol.compare](3); // Symbol.compare is not a function
```

After:

```ts
(9)[Symbol.compare](3); // works correctly now, no error
```

### [@rslike/std]

- `unwrap` typings now returns correct result.

**NOTE:** behavior is not changed, only inferred type

Before:

```ts
const a = None();
a.unwrap(); // unknown
```

After:

```ts
const a = None();
a.unwrap(); // never, since this throws an error
```

## Other

- Migrate from `jest` to `vitest`
