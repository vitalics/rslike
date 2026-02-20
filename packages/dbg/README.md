# @rslike/dbg

Never use `console.log` to debug again.

Inspired by Python's [icecream](https://github.com/gruns/icecream) library — `dbg` prints both the expression source and its value, so you always know what you're looking at.

## Installation

```bash
npm i @rslike/dbg
yarn add @rslike/dbg
pnpm add @rslike/dbg
```

## Quick start

```ts
import { dbg } from "@rslike/dbg";

const a = 123;
dbg(() => a);
// dbg | a: 123
```

Instead of writing:

```ts
console.log("foo(123)", foo(123));
// foo(123) 456
```

Write:

```ts
dbg(() => foo(123));
// dbg | foo(123): 456
```

## API

### `dbg(fn, [options])`

```ts
import { dbg } from "@rslike/dbg";
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `fn` | `() => unknown` | Arrow function wrapping the expression to inspect. **Must be an arrow function.** |
| `options` | `Options` (optional) | Configuration object (see below) |

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `prefix` | `string` | `"dbg | "` | String prepended to every output line |
| `delimiter` | `string` | `": "` | String between the expression name and its value |
| `outputFunction` | `(...args: unknown[]) => void` | `console.log` | Function used to print the message |

#### Return value

`dbg` returns an `InspectionResult` object:

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Source text of the expression inside the arrow function |
| `type` | `string` | Result of `typeof` on the value |
| `value` | `unknown` | The actual runtime value |
| `message` | `string` | The full formatted string that was printed |
| `prefix` | `string` | The prefix that was used |
| `delimiter` | `string` | The delimiter that was used |
| `isProxy` | `boolean` | `true` when the value was created with `new Proxy()` or `Proxy.revocable()` |

#### Throws

`TypeError` when `fn` is not an arrow function.

## Examples

### Basic values

```ts
const name = "Alice";
dbg(() => name);
// dbg | name: "Alice"

const count = 42;
dbg(() => count);
// dbg | count: 42

const active = true;
dbg(() => active);
// dbg | active: true
```

### Objects and arrays

```ts
const user = { id: 1, name: "Alice" };
dbg(() => user);
// dbg | user: {"id":1,"name":"Alice"}

const scores = [10, 20, 30];
dbg(() => scores);
// dbg | scores: [10,20,30]
```

### Expressions and property access

```ts
const obj = { x: 42 };
dbg(() => obj.x);
// dbg | obj.x: 42

function double(n: number) { return n * 2; }
dbg(() => double(21));
// dbg | double(21): 42
```

### Special numbers

```ts
dbg(() => Infinity);   // dbg | Infinity: Infinity
dbg(() => -Infinity);  // dbg | -Infinity: -Infinity
dbg(() => NaN);        // dbg | NaN: NaN

const big = Number.MAX_SAFE_INTEGER + 1;
dbg(() => big);        // dbg | big: 9007199254740992 (unsafe)
```

### BigInt and Symbol

```ts
const n = 123n;
dbg(() => n);
// dbg | n: 123n

const sym = Symbol("token");
dbg(() => sym);
// dbg | sym: Symbol(token)
```

### Functions

```ts
function add(a: number, b: number) { return a + b; }
dbg(() => add);
// dbg | add: function add(a, b) { return a + b; }
```

### Proxy detection

`@rslike/dbg` automatically detects `Proxy` objects created after the module is first imported — no changes to your code required.

```ts
import { dbg, isProxy } from "@rslike/dbg";

const target = { value: 1 };
const p = new Proxy(target, {});

dbg(() => p);
// dbg | p (Proxy): {"value":1}

isProxy(p);       // true
isProxy(target);  // false
```

Works with `Proxy.revocable` too:

```ts
const { proxy } = Proxy.revocable({ x: 1 }, {});
isProxy(proxy);  // true
```

> **Note:** Proxies created before `@rslike/dbg` is first imported cannot be detected.

### Custom options

```ts
// Custom delimiter
const x = 99;
dbg(() => x, { delimiter: " = " });
// dbg | x = 99

// Custom prefix
dbg(() => x, { prefix: "[DEBUG] " });
// [DEBUG] x: 99

// Redirect output (e.g. to console.warn or a logger)
dbg(() => x, { outputFunction: console.warn });

// Silence output entirely while still getting the return value
const noop = () => {};
const { name, value, type } = dbg(() => x, { outputFunction: noop });
```

### Using the return value

```ts
const a = [1, 2, 3];
const result = dbg(() => a);

result.name;      // "a"
result.value;     // [1, 2, 3]
result.type;      // "object"
result.message;   // "dbg | a: [1,2,3]"
result.isProxy;   // false
```

## `isProxy(value)`

```ts
import { isProxy } from "@rslike/dbg";
```

Returns `true` if `value` is a `Proxy` instance created after `@rslike/dbg` was first imported.

```ts
isProxy(new Proxy({}, {}));  // true
isProxy({});                  // false
isProxy(null);                // false
isProxy(42);                  // false
```

## Performance note

`dbg` calls `.toString()` on the arrow function to extract the expression name. For functions with large bodies passed as values (rather than called), this prints the entire function source. Wrap such values normally:

```ts
function huge() { /* ... */ }

// prints the entire function body — can be noisy
dbg(() => huge);

// just call the function and inspect the result instead
dbg(() => huge());
```

## Related packages

- [@rslike/std](https://www.npmjs.com/package/@rslike/std) — `Option`, `Result`, `UndefinedBehaviorError`
- [@rslike/cmp](https://www.npmjs.com/package/@rslike/cmp) — comparison traits
- [@rslike/iter](https://www.npmjs.com/package/@rslike/iter) — lazy iterators

## WIKI

https://github.com/vitalics/rslike/wiki/Debug
