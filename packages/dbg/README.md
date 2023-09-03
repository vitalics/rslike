# @rslike/dbg

Never use `console.log` to debug again

## Inspect Variables

Have you ever printed variables or expressions to debug your program? If you've ever typed something like

```ts
console.log(foo('123'))
```

or the more thorough

```typescript
console.log("foo('123')", foo('123'))
```

then `@rslike/dbg` will put a smile on your face. With arguments, `dbg` inspects itself and prints both its own arguments and the values of those arguments.

```ts
import {dbg} from '@rslike/dbg'

function foo(i){
  return i + 333;
}

dbg(() => foo(123))
```

Prints:

``` bash
foo(123): 456
```

Similarry,

```ts
const d = {'key': {1: 'one'}}
dbg(() => d['key'][1])

class Klass{
  static attr = 'yep'
}
dbg(() => Klass.attr)
```

## Installation

NPM:

```bash
npm i @rslike/dbg
```

YARN/PNPM:

```bash
yarn add @rslike/dbg
pnpm add @rslike/dbg
```

## WIKI

Available by link: https://github.com/vitalics/rslike/wiki/Debug

## Related packages

- [std](https://www.npmjs.com/package/@rslike/std)
- [cmp](https://www.npmjs.com/package/@rslike/cmp)

## API

### dbg(fn, [opts])

- `fn` - arrow function.
- `opts` - object with next arguments
  - `prefix` - prefix before message. Default is `dbg | `
  - `outputFunction` - function to print output. Default is `console.log`
  - `delimiter` - delimiter between variable name and it's value.

Returns an object with next fields:

- `name` - variable name
- `type` - returns from `typeof` operator.
- `value` - variable value.
- `prefix` - called prefix from options
- `delimiter` - called delimiter from options
