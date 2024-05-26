---
"@rslike/cmp": patch
---

## What's new

Add primise-like API for `Option` and `Result`

`Result` uses `ok` and `err` for callbacks.

Example:

```ts
const result = new Result((ok, err) => {
  if (true) ok(1);
  err("Some Error");
});

result.unwrap(); // 1
```

`Option` uses `some` and `none` for callbacks.

**NOTE** `some(null)` and `some(undefined)` will be converted to `none` automatically since it nullable values.

Example:

```ts
const o = new Option((some, none) => {
  some(undefined);
});

o.isNone(); // true
```

`Result` and `Option` now uses `withResolves` as `Promise` API.

Example:

```ts
const { ok, result, err } = Result.withResolvers();

ok(3);

result.unwrap(); // 3
```
