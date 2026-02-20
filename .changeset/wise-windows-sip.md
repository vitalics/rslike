---
"@rslike/std": minor
---

fix(std): correct Rust semantic mismatches in Option, Result, and match; add Option.take()

**fix(result): `isErrAnd` always passed `undefined` to the predicate instead of the actual error**

The predicate referenced a non-existent field `this.err`; the real field is `this.error`.

Before:
```ts
const res = predicate(this.err as TErr); // always undefined
```

After:
```ts
const res = predicate(this.error as TErr);
```

---

**fix(result): `expect()` silently returned `null` when `reason` was an empty string**

The `reason &&` short-circuit caused `Err("x").expect("")` to skip the throw entirely and
return `null`. Rust's `expect` always panics on `Err` regardless of the message content.

Before:
```ts
if (reason && this.status === Status.Err) {
  throw new Error(reason, { cause: this.error });
}
// Err("x").expect("") → returned null silently
```

After:
```ts
if (this.status === Status.Err) {
  throw new Error(reason, { cause: this.error });
}
// Err("x").expect("") → throws Error("")
```

---

**fix(result): `Result.fromPromise` produced a different type than `Async()`**

`Async()` returns `Result<Option<T>, E>`. `fromPromise` returned `Result<T, E>` with no `Option`
wrapper, making the two Promise-to-Result helpers type-incompatible even though they are
documented as equivalent.

Before:
```ts
const a = await Async(Promise.resolve(42));
a.unwrap().unwrap(); // 42  — Option wrapper present

const b = await Result.fromPromise(Promise.resolve(42));
b.unwrap(); // 42  — no Option wrapper (inconsistent)
```

After:
```ts
const b = await Result.fromPromise(Promise.resolve(42));
b.unwrap().unwrap(); // 42  — Option wrapper now present, consistent with Async()
```

---

**fix(option): `xor()` returned `Some` when both operands were `Some`**

Rust's `xor` returns `Some` only if **exactly one** of the two operands is `Some`. When both are
`Some` the result must be `None`. The missing check caused the wrong value to be returned.

Before:
```ts
Some(1).xor(Some(2)) // → Some(1)  ❌ should be None()
Some(1).xor(None())  // → Some(1)  ✅
None().xor(Some(2))  // → Some(2)  ✅
None().xor(None())   // → None()   ✅
```

After:
```ts
Some(1).xor(Some(2)) // → None()   ✅
Some(1).xor(None())  // → Some(1)  ✅
None().xor(Some(2))  // → Some(2)  ✅
None().xor(None())   // → None()   ✅
```

---

**fix(option): `flatten()` relied on accidental `Some(undefined) → None` coercion for the `None` path**

`None().flatten()` produced the correct result only because `Some(undefined)` happens to coerce
to `None`. An explicit `isNone()` guard now makes the intent clear and removes the fragile
dependency on the coercion side-effect.

Before:
```ts
flatten() {
  if (this.value instanceof Option) {
    return Some(this.value.value) as never; // accessed private .value directly
  }
  return Some(this.value) as never; // None path: Some(undefined) → None by accident
}
```

After:
```ts
flatten() {
  if (this.isNone()) return None() as never; // explicit, intentional
  if (this.value instanceof Option) {
    return Some((this.value as Option<any>).valueOf()) as never;
  }
  return Some(this.value) as never;
}
```

---

**fix(match): JSDoc comment claimed `Ok(None())` triggers the Ok callback — code does the opposite**

The implementation correctly routes `Ok(None())` to the Err/None callback (absence of value
inside an Ok wrapper = effectively None). Only the doc comment was wrong.

Before:
```
Ok(None) - will trigger Ok callback
```

After:
```
Ok(None()) - will trigger Err/None callback
```

---

**feat(option): add missing `take()` method**

Rust's `Option::take` moves the value out of the option, leaving `None` in its place. This
method was absent from the implementation.

Before:
```ts
// method did not exist — runtime error
Some(2).take(); // TypeError: Some(...).take is not a function
```

After:
```ts
const x = Some(2);
const y = x.take();
x.isNone();  // true  — original is now None
y.unwrap();  // 2     — taken value is preserved

const a = None<number>();
const b = a.take();
a.isNone();  // true
b.isNone();  // true
```
