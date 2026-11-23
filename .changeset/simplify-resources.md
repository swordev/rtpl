---
"@rtpl/cli": minor
---

Simplify resource classes (breaking):

- Remove `ResType`, `MinimalRes`, `MinimalDirRes` and the static `isInstance` helpers of resources and `DelayedValue`; use `instanceof`
- Remove resource symbols (`symbol` constructor argument, `res.symbol` and the `symbol` filter of the resource system)
- Remove derived secrets (`new SecretRes(parentSecret)`)
- Remove `res.options`, `res.resolved` and `res.config`; resources only keep `name`, `data` and `path`
- `AbstractRes<TData>` only takes the data type parameter; resources with options define them (`DirRes<T, TConf>.config`, `IniRes.format`, `YamlRes.format`)
- Replace `onDefaultExtension()` with the optional `extension` property
- Replace `res.dirname` with `res.path.dirname` (`ResPath`) and remove the `DelayedValue` resolver
- Remove the `ResConfig` type (use `DirConfig`)
