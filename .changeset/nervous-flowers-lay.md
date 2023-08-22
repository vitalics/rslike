---
"@rslike/std": major
"@rslike/cmp": major
---

# New Package

`cmp` - comparison package. Provides interfaces, types and new class `Ordering`.

How to install:

``` bash
npm i @rslike/cmp
yarn add @rslike/cmp
pnpm add @rslike/cmp
```

## How to use

For you class you can implements type.

Example

```ts
class MyStructure implements Eq {
  equals(other: unknown){
    // some checks
    return true;
  }
}
```

## Types/Interfaces

- `Eq` - type for equality check
- `PartialEq` - type for partial equality check
- `Ord` - type for ordering
- `PartialOrd` - type for partial ordering

More details on [WIKI](https://github.com/vitalics/rslike/wiki)
