# Repro: valid ESM shared package is classified as CommonJS; wrapper bypasses the shared instance

`@module-federation/vite` 1.23.4 · Vite 7.3.7 · Node 22.22.2 · macOS

Related: #986 / #987 (fixed this misclassification only for `.exports` used as a member property, e.g. `t.exports = …`).

## Run

```sh
npm install
npm run repro
```

No browser needed. `npm run repro` starts a Vite dev server in middleware mode and prints the
`__loadShare__` wrapper the plugin generates for two shared packages.

## The two packages

Both are valid ESM (`"type": "module"`, a top-level `export const namedValue`) and both contain the
same browser-only top-level access (`document.title`). They differ in one thing:

| package | difference |
|---|---|
| `packages/esmbug` | also contains a bundled CommonJS-style runtime helper (what rspack/webpack emit) in which `module` and `exports` are **function parameters** |
| `packages/esmok` (control) | the helper is removed, nothing else changes |

## Expected

Both packages get a wrapper that exports `namedValue` from the **shared** instance, e.g.
`export { __mf_0 as namedValue }` where `__mf_0 = mod["namedValue"]`.

## Actual

```
=== esmbug ===
  named export `namedValue` read from the shared instance: false
  falls back to `export * from <local copy>`:              true
    export default __mfDefaultExport;
    export * from "/packages/esmbug/index.js"
=== esmok ===
  named export `namedValue` read from the shared instance: true
  falls back to `export * from <local copy>`:              false
    export { __mf_default as default };
    export { __mf_0 as namedValue };
```

For `esmbug` the plugin finds no named exports, so the generated wrapper re-exports everything from the
**local** copy and never uses the shared instance for any export. For packages that hold module-level
state (React contexts, stores) a host and a remote then end up with different copies.

## Why (from the plugin's bundled `lib/index.js`)

`inspectSharedExportsFromFile()` reads the export list correctly, then discards it:

```js
namedExports: scanState.complete && !commonJs ? namedExports : void 0
```

`commonJs` comes from `hasCommonJsExports()`, which matches `module.exports` and a standalone `exports`
identifier anywhere in the file text. #987 skips matches preceded by a `.`, but not locally scoped
identifiers (function parameters, local `var exports`). For "CommonJS" files the plugin then tries to
`require()` the entry in Node to read its exports; with browser-only top-level code that throws and is
swallowed, so no names are found.

Checked with `inspectSharedExportsFromFile` on 1.23.4 (every file has a top-level `export`):

| file contents | `commonJs` | named exports |
|---|---|---|
| `t.exports = …` (member property, fixed by #987) | false | found |
| `function (module) { module.exports = … }` | **true** | none |
| `(exports, defs) => { … }` | **true** | none |
| `function (module) { var exports = {}; module.exports = exports }` | **true** | none |
| plain `export { namedValue }` | false | found |

## Suggested fix

A file with real top-level `import`/`export` statements is ESM (this is also how Node decides), so the
CommonJS check should not apply to it. Alternatively only count `module` / `exports` when they are the
free (global) identifiers, not function parameters or local variables.
