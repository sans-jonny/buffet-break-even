const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const sourceRoot = path.resolve(__dirname, '../../src')
const plain = value => JSON.parse(JSON.stringify(value))

function loadModule(entry, uni = {}, cache = new Map(), globals = {}) {
  if (entry.endsWith('.json')) return JSON.parse(fs.readFileSync(path.resolve(sourceRoot, entry), 'utf8'))
  if (fs.existsSync(path.resolve(sourceRoot, entry, 'index.ts'))) entry += '/index'
  const filename = path.resolve(sourceRoot, `${entry}.ts`)
  if (cache.has(filename)) return cache.get(filename).exports
  const module = {exports: {}}
  cache.set(filename, module)
  const {outputText} = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true},
  })
  vm.runInNewContext(outputText, {...globals, module, exports: module.exports, uni, Error, setTimeout, clearTimeout, setInterval, clearInterval,
    require: name => name.startsWith('@/') ? loadModule(name.slice(2), uni, cache, globals)
      : name.startsWith('.') ? loadModule(path.relative(sourceRoot, path.resolve(path.dirname(filename), name)), uni, cache, globals) : require(name),
  }, {filename})
  return module.exports
}

module.exports = {loadModule, plain}
