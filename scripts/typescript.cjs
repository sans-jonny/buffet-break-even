// Node runner for TypeScript specifications; not shipped to the client.
const fs = require('node:fs')
const ts = require('typescript')
require.extensions['.ts'] = (module, filename) => {
    const source = fs.readFileSync(filename, 'utf8')
    const result = ts.transpileModule(source, {
        fileName: filename, compilerOptions: {
            module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true
        }
    })
    module._compile(result.outputText, filename)
}
