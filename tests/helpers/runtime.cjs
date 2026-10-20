const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const {createPinia, setActivePinia} = require('pinia')
const sourceRoot = path.resolve(__dirname, '../../src')
const plain = value => JSON.parse(JSON.stringify(value))

function loadModule(entry, uni = {}, cache = new Map()) {
  const filename = path.resolve(sourceRoot, `${entry}.ts`)
  if (cache.has(filename)) return cache.get(filename).exports
  const module = {exports: {}}
  cache.set(filename, module)
  const {outputText} = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020},
  })
  vm.runInNewContext(outputText, {module, exports: module.exports, uni, Error,
    require: name => name.startsWith('@/') ? loadModule(name.slice(2), uni, cache)
      : name.startsWith('.') ? loadModule(path.relative(sourceRoot, path.resolve(path.dirname(filename), name)), uni, cache) : require(name),
  }, {filename})
  return module.exports
}

function application(platform = {getStorageSync: () => undefined, setStorageSync: () => {}}) {
  const cache = new Map()
  const load = entry => loadModule(entry, platform, cache)
  const services = new Map()
  const pinia = createPinia()
  setActivePinia(pinia)
  load('ui/composition/registerApplication').registerApplication({provide: (token, service) => services.set(token, service)}, pinia)
  const inputs = {...load('contexts/dining/public'), ...load('contexts/catalog/public')}
  return {
    load, services, pinia,
    bootstrap: services.get(load('ui/composition/ApplicationBootstrap').ApplicationBootstrap.Token),
    status: load('ui/stores/useApplicationStore').useApplicationStore(pinia),
    dining: load('ui/stores/useDiningStore').useDiningStore(pinia),
    history: load('ui/stores/useHistoryStore').useHistoryStore(pinia),
    collection: load('ui/stores/useCollectionStore').useCollectionStore(pinia),
    execute: (name, request = {}) => services.get(inputs[name + 'Input'].Token).execute(request),
  }
}

module.exports = {loadModule, application, plain}
