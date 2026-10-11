// Valid ESM: top-level export, plus a bundled CommonJS-style runtime helper (as emitted by rspack/webpack).
// `module` and `exports` below are function parameters, not the file's own CommonJS exports.
const registry = {
  1(module) {
    module.exports = { x: 1 }
  },
}
const define = (exports, defs) => {
  for (const key in defs) Object.defineProperty(exports, key, { enumerable: true, get: defs[key] })
}
void registry
void define

// Browser-only top-level access, as in real browser bundles; makes the plugin's require() fallback throw in Node.
document.title

export const namedValue = 'named ESM export'
