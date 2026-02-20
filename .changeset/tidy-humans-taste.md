---
"@rslike/dbg": minor
---

feat(dbg): add automatic Proxy detection and expose `isProxy` utility

**feat(dbg): intercept global `Proxy` constructor to track all created proxies**

On module import, `@rslike/dbg` replaces the global `Proxy` constructor with a transparent
intercepting version that registers every `new Proxy(...)` and `Proxy.revocable(...)` call in a
`WeakSet`. No user-side changes are required — any proxy created after the module is first
imported is automatically tracked.

Before:
```ts
import { dbg } from "@rslike/dbg";

const store = new Proxy({ count: 0 }, {});
dbg(() => store);
// dbg | store: {"count":0}
// — no indication that `store` is a Proxy
```

After:
```ts
import { dbg } from "@rslike/dbg";

const store = new Proxy({ count: 0 }, {});
dbg(() => store);
// dbg | store (Proxy): {"count":0}
// — Proxy is detected and annotated automatically
```

---

**feat(dbg): expose `isProxy(value)` utility function**

Returns `true` if the value was created via `new Proxy(...)` after `@rslike/dbg` was imported.
Returns `false` for plain objects, primitives, or proxies created before the module was loaded.

Before:
```ts
// no way to check programmatically
```

After:
```ts
import { isProxy } from "@rslike/dbg";

const p = new Proxy({ x: 1 }, {});
isProxy(p);          // true
isProxy({ x: 1 });  // false
isProxy(null);       // false
isProxy(42);         // false
```

---

**feat(dbg): `dbg()` return value now includes `isProxy` field**

The inspection result object returned by `dbg()` now exposes whether the inspected value is a
known Proxy, allowing callers to branch on it programmatically.

Before:
```ts
const result = dbg(() => store);
// result = { name, type, value, message, delimiter, prefix }
```

After:
```ts
const result = dbg(() => store);
// result = { name, type, value, message, delimiter, prefix, isProxy: true }
result.isProxy; // true for Proxy values, false for plain values
```

---

**fix(dbg): label extraction regex stripped `() =>` only with exact spacing**

The old regex `/(\(\) => )/g` required a space before and after `=>`. Bundlers such as esbuild
and swc emit `()=>` without spaces, causing the arrow prefix to appear in the output label.

Before:
```ts
dbg(() => double(21))
// dbg | ()=>double(21): 42   ❌ prefix not stripped
```

After:
```ts
dbg(() => double(21))
// dbg | double(21): 42       ✅
```
