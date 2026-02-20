---
"@rslike/cmp": patch
---

test(cmp): add missing branch coverage for primitives and utils

**test(cmp/primitives): cover `Symbol.equals` and `Symbol.partialEquals` on all primitive types**

Added tests for previously untested branches on `Number`, `String`, `Boolean`, and `Date`
prototype extensions:

- `Number[Symbol.equals]` strict equality and inequality
- `Number[Symbol.partialEquals]` loose equality with coercion
- `String[Symbol.equals]` inequality path
- `String[Symbol.partialEquals]` cross-type comparison via `==`
- `Boolean[Symbol.equals]` with plain boolean literals
- `Boolean[Symbol.partialEquals]` with `undefined` (returns `false`)
- `Date[Symbol.compare]` with ISO string argument (greater / less paths)
- `Date[Symbol.compare]` with invalid date string → throws `UndefinedBehaviorError`

**test(cmp/utils): document known source bugs discovered during coverage analysis**

- `compare()` with a valid `compareFn`: after validating the return type, the result is never
  returned — execution falls through to throw `UndefinedBehaviorError`. Test documents this as a
  known source bug.
- `partialEquals(null, ...)`: no null guard before `a[kPartialEquals]`, causing
  `TypeError: Cannot read properties of null`. Test documents this crash.
- `partialEquals()` falsy-value coercion: `0 == false` and `1 == true` via `==` fallback.
- `equals()` with two string primitives uses strict `===`.
- `equals(null, null)` falls through to `a === b` (returns `true`).
