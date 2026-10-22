const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const contextEntry = /^contexts\/(catalog|dining|room)\/public$/
const moduleEntry = /^contexts\/dining\/(session|history|collection|completion)\/public$/
const contextOf = file => file.match(/^contexts\/(catalog|dining|room)\//)?.[1]
const moduleOf = file => file.match(/^(contexts\/dining\/(session|history|collection|completion))\//)?.[1]

function inspectSource(file, source) {
  file = file.replaceAll('\\', '/')
  const errors = []
  if (file.endsWith('.vue') && !file.startsWith('ui/')) errors.push(`${file}: Vue 组件必须放在 ui 目录`)
  const report = message => errors.push(`${file}: ${message}`)
  if (file.endsWith('.vue')) source = [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]).join('\n')
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  const context = contextOf(file)
  const module = moduleOf(file)
  const owner = module || (context && `contexts/${context}`)
  const model = /\/model\//.test(file)
  const application = /\/application\//.test(file)
  const inner = model || application
  const input = /\/application\/port\/in\//.test(file)
  const workflow = module === 'contexts/dining/completion'
  const configuration = /Configuration\.ts$/.test(file)
  const publicFile = file.endsWith('/public.ts') && context

  if (file.startsWith('contexts/') && !context) report('上下文只允许 catalog / dining；禁止旧独立与协调目录')
  if (context && /\/(domain|adapter|composition)\//.test(file)) report('使用 model / application / infrastructure 组织模块')
  if (context && /\/model\/(entity|value-object|collection)\//.test(file)) report('模型直接按业务名称组织')
  if (context && /\/application\/ports\//.test(file)) report('应用输出边界必须位于 port/out')
  if (application && !/\/application\/(port\/(in|out)|interactor)\/[^/]+\.ts$/.test(file)) report('应用仅包含 port/in、port/out 和 interactor')
  if (input && /(?:Request|Response)\.ts$/.test(file)) report('Request / Response 必须作为 Input 的内部类')
  if (model && workflow) report('完成流程不拥有领域模型')
  if (publicFile && ast.statements.some(node => !ts.isExportDeclaration(node))) report('公共入口仅允许具名导出 Input')

  if (application && !workflow && /\/interactor\//.test(file)) {
    const ports = new Set(ast.statements.filter(node => ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)
      && /\/port\/out\//.test(node.moduleSpecifier.text)).flatMap(node => node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)
        ? node.importClause.namedBindings.elements.map(item => item.name.text) : []))
    for (const declaration of ast.statements.filter(ts.isClassDeclaration)) {
      for (const constructor of declaration.members.filter(ts.isConstructorDeclaration)) {
        for (const parameter of constructor.parameters) {
          if (!parameter.type || !ts.isTypeReferenceNode(parameter.type) || !ports.has(parameter.type.typeName.getText(ast))) report('独立用例只能注入自身输出端口')
        }
      }
    }
  }

  function check(specifier, node) {
    const resolved = specifier.startsWith('@/') ? specifier.slice(2)
      : specifier.startsWith('.') ? path.posix.join(path.posix.dirname(file), specifier) : null
    const target = resolved === null ? null : path.posix.normalize(resolved).replace(/\.(ts|js)$/, '')
    const targetContext = target && contextOf(target)
    if (!file.startsWith('ui/') && (target?.startsWith('ui/') || (target === null && ['vue', 'pinia', '@dcloudio/uni-app'].includes(specifier)))) report('业务与共享代码不得依赖 UI 或 Vue / Pinia')
    if (inner && target === null) report(`内层禁止框架与外部模块 ${specifier}`)
    if (inner && target !== null) {
      const own = target.startsWith(`${owner}/${model ? 'model/' : 'application/'}`)
        || (application && target.startsWith(`${owner}/model/`))
      const shared = target.startsWith('utils/')
      const coordination = workflow && application && moduleEntry.test(target) && !target.startsWith(`${owner}/`)
      if (!own && !shared && !coordination) report(`内层越界依赖 ${specifier}`)
    }
    if (input && (ts.isImportDeclaration(node) || ts.isImportTypeNode(node) || ts.isCallExpression(node))) report('Input 契约必须自包含，不泄露内部模型')
    if (context && target !== null && target.startsWith('contexts/')) {
      if (targetContext !== context && !(contextEntry.test(target) && !inner)) report(`跨上下文仅允许访问公共入口 ${specifier}`)
      if (module && targetContext === context && !target.startsWith(`${module}/`)
        && !(moduleEntry.test(target) && (workflow || configuration))) report(`内部模块只能通过约定的公共 Input 协作 ${specifier}`)
    }
    if (publicFile) {
      const allowedTarget = module ? target?.startsWith(`${owner}/application/port/in/`)
        : context === 'dining' ? moduleEntry.test(target || '') : target?.startsWith(`${owner}/application/port/in/`)
      if (!ts.isExportDeclaration(node) || !allowedTarget || !node.exportClause || !ts.isNamedExports(node.exportClause)
        || node.exportClause.elements.some(item => !/Input$/.test((item.propertyName || item.name).text) || !/Input$/.test(item.name.text))) report('公共入口只能具名导出 Input')
    }
    if (/^ui\/(pages|components|composables)\//.test(file) && target?.startsWith('contexts/') && !contextEntry.test(target)) report(`页面只能访问上下文公共入口 ${specifier}`)
    if (/^ui\/(pages|components)\//.test(file) && target?.startsWith('ui/stores/')) report('页面和组件通过只读 composable 访问展示状态')
    if (file.startsWith('ui/composables/') && target?.startsWith('ui/stores/') && !/^ui\/composables\/use(Dining|History|Collection|Application|Room)View\.ts$/.test(file)) report('Store 只允许由约定的只读入口访问')
    if (file.startsWith('ui/stores/') && ((target !== null && !target.startsWith('presentation/'))
      || (target === null && !['vue', 'pinia'].includes(specifier)))) report('Store 只能依赖展示契约和 Vue / Pinia')
    if (file.startsWith('presentation/') && ((target !== null && !/^(presentation|utils|data)\//.test(target)) || target === null)) report('共享展示契约与映射保持无框架、无领域依赖')
    if (/\/infrastructure\/presentation\//.test(file) && target?.startsWith('infrastructure/persistence/')) report('Presenter 不得依赖具体数据库')
    if (context && target?.startsWith('ui/stores/')) report('业务模块由装配层注入展示输出，不直接获取 Store')
    if (context === 'dining' && target?.startsWith('data/')) report('Dining 通过 Catalog 公开查询获取菜品')
  }

  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) check(node.moduleSpecifier.text, node)
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(ast) === 'require')
      && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) check(node.arguments[0].text, node)
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) check(node.argument.literal.text, node)
    if ((inner || file.startsWith('ui/stores/')) && ts.isIdentifier(node) && node.text === 'uni') report('内层和 Store 不得访问平台 API')
    if (file.startsWith('ui/composables/') && ts.isPropertyAccessExpression(node) && ['present', '$patch', '$reset', '$state'].includes(node.name.text)) report('只读入口不得调用 Store 写入能力')
    if (input && ts.isClassDeclaration(node) && node.name && /^(Request|Response)$/.test(node.name.text) && !ts.isModuleBlock(node.parent)) report('Request / Response 必须放在 Input 命名空间内')
    ts.forEachChild(node, visit)
  }
  visit(ast)
  return errors
}

function inspectProject(root) {
  const walk = dir => fs.readdirSync(dir, {withFileTypes: true}).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)])
  return walk(root).filter(file => /\.(ts|vue)$/.test(file)).flatMap(file => inspectSource(path.relative(root, file).replaceAll('\\', '/'), fs.readFileSync(file, 'utf8')))
}

module.exports = {inspectSource, inspectProject}
if (require.main === module) {
  const errors = inspectProject(path.resolve(__dirname, '../src'))
  if (errors.length) {console.error(errors.join('\n')); process.exitCode = 1}
  else console.log('Architecture checks passed.')
}
