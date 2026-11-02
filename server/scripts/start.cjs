const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

// Resolve configuration from the server package, regardless of the caller's cwd.
const serverDirectory = path.resolve(__dirname, '..')
process.chdir(serverDirectory)
const envFile = path.join(serverDirectory, '.env')
if (fs.existsSync(envFile)) process.loadEnvFile(envFile)

require.extensions['.ts'] = (module, filename) => {
    const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        fileName: filename,
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            esModuleInterop: true
        }
    })
    module._compile(result.outputText, filename)
}

require('../src/transport/RelayServer.ts').RelayServer.start().catch(error => {
    console.error(error)
    process.exitCode = 1
})
