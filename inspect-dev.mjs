// Prints the shared-module wrapper the plugin generates (dev server, no browser needed) for two
// packages that differ only by a bundled runtime helper, and says whether the named export is
// read from the SHARED instance (host-provided singleton) or re-exported from the LOCAL copy.
import { createServer } from 'vite'

const PACKAGES = ['esmbug', 'esmok']
const server = await createServer({ server: { middlewareMode: true }, logLevel: 'error' })

const resolveId = (id) => decodeURIComponent(id.replace(/^\/@id\//, '').replace(/^__x00__/, '\0'))

try {
  const main = await server.transformRequest('/src/main.js')
  const ids = [...main.code.matchAll(/from\s+"([^"]*loadShare[^"]*)"/g)].map((m) => m[1])

  for (const pkg of PACKAGES) {
    const id = ids.find((i) => i.includes(pkg))
    if (!id) throw new Error(`no loadShare import found for ${pkg}:\n${main.code}`)
    const code = (await server.transformRequest(resolveId(id))).code

    const fromShared = /mod\["namedValue"\]/.test(code)
    const starFromLocal = /export\s*\*\s*from/.test(code)
    const exportLines = code
      .split('\n')
      .filter((l) => /^\s*export\b/.test(l))
      .map((l) => '    ' + l.trim())

    console.log(`\n=== ${pkg} ===`)
    console.log('  named export `namedValue` read from the shared instance:', fromShared)
    console.log('  falls back to `export * from <local copy>`:             ', starFromLocal)
    console.log('  export statements in the generated wrapper:\n' + exportLines.join('\n'))
  }
} finally {
  await server.close()
}
