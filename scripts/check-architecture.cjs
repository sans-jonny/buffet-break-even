const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

function inspectSource(file, source) {
  const errors = []
  const report = message => errors.push(`${file}: ${message}`)
  // Parse SFC script blocks as TypeScript; templates and styles have no module imports.
  if (file.endsWith('.vue')) source = [...source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]).join('\n')
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true)
  if (/\/application\/port\/in\/[^/]+\//.test(file)) {
    report('Port.In 契约直接放在 port/in 下，不再建立用例子目录')
  }
  if (/\/application\/port\/in\/[^/]+(?:Request|Response)\.ts$/.test(file)) {
    report('Request 和 Response 应作为 Input 的内部类，不再独立分文件')
  }
  if (file.endsWith('.ts') && ast.statements.filter(node => ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)).length > 1) {
    report('每个 TS 文件至多声明一个顶层 class/interface')
  }
  const context = file.match(/^(contexts\/(independent|orchestration)\/[^/]+)\//)
  const inner = /\/(domain|application)\//.test(file)
  const domain = /\/domain\//.test(file)
  if (domain && context?.[2] === 'orchestration') report('Orchestration 不得建立 Domain')
  const publicFile = context && file === `${context[1]}/public.ts`
  if (publicFile && ast.statements.some(node => !ts.isExportDeclaration(node))) {
    report('public.ts 只能包含 Port.In 契约的具名导出')
  }
  if (context?.[2] === 'independent' && /\/application\/interactor\//.test(file)) {
    const outTypes = new Set(ast.statements.filter(node => ts.isImportDeclaration(node)
      && ts.isStringLiteral(node.moduleSpecifier) && /\/port\/out\//.test(node.moduleSpecifier.text))
      .flatMap(node => node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)
        ? node.importClause.namedBindings.elements.map(item => item.name.text) : []))
    for (const declaration of ast.statements.filter(ts.isClassDeclaration)) {
      for (const constructor of declaration.members.filter(ts.isConstructorDeclaration)) {
        for (const parameter of constructor.parameters) {
          if (!parameter.type || !ts.isTypeReferenceNode(parameter.type) || !outTypes.has(parameter.type.typeName.getText(ast))) {
            report('Interactor 构造参数只能依赖自身实际使用的 Port.Out 接口')
          }
        }
      }
    }
  }
  function check(specifier, node) {
    const target = specifier.startsWith('@/') ? specifier.slice(2)
      : specifier.startsWith('.') ? path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier)) : null
    if (inner && !target) report(`内层禁止依赖外部模块 ${specifier}`)
    if (context && target) {
      if (inner) {
        const own = target.startsWith(`${context[1]}/${domain ? 'domain/' : 'application/'}`)
          || (!domain && target.startsWith(`${context[1]}/domain/`))
        const shared = target.startsWith('utils/')
        const coordination = !domain && context[2] === 'orchestration'
          && /^contexts\/(independent|orchestration)\/[^/]+\/public(?:\.ts)?$/.test(target)
        if (!own && !shared && !coordination) report(`内层越界依赖 ${specifier}`)
        if (domain && context[2] === 'orchestration') report('Orchestration 不得建立 Domain')
      }
      if (!inner && target.startsWith('contexts/') && !target.startsWith(`${context[1]}/`)) {
        if ((context[2] === 'independent' && /\/composition\//.test(file)) || !/\/public(?:\.ts)?$/.test(target)) report(`Context 不得访问其他 Context 的内部实现 ${specifier}`)
      }
      if (/\/application\/port\/in\//.test(file) && !target.startsWith(`${path.posix.dirname(file)}/`)) {
        report(`Port.In 契约必须自包含，不得泄露内部模型 ${specifier}`)
      }
    }
    if (publicFile) {
      if (!ts.isExportDeclaration(node) || !target?.startsWith(`${context[1]}/application/port/in/`)
        || !node.exportClause || !ts.isNamedExports(node.exportClause)
        || node.exportClause.elements.some(item => !/Input$/.test((item.propertyName || item.name).text))) {
        report('public.ts 只能具名导出 Input，Request / Response 由 Input 内部公开')
      }
    }
    if (/^(pages|components|composables)\//.test(file) && target?.startsWith('contexts/')
      && !/^contexts\/(independent|orchestration)\/[^/]+\/public(?:\.ts)?$/.test(target)) report(`UI 只能访问 Context 公共入口 ${specifier}`)
    if (file.startsWith('stores/') && ((target && !target.startsWith('stores/') && !target.startsWith('utils/'))
      || (!target && !['vue', 'pinia'].includes(specifier)))) report(`Store 只能依赖展示模型与框架 ${specifier}`)
  }
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      check(node.moduleSpecifier.text, node)
    }
    if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText(ast) === 'require')
      && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) check(node.arguments[0].text, node)
    if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) check(node.argument.literal.text, node)
    if ((inner || file.startsWith('stores/')) && ts.isIdentifier(node) && node.text === 'uni') report('内层与 Store 不得访问 uni API')
    ts.forEachChild(node, visit)
  }
  visit(ast)
  return errors
}

function inspectProject(root) {
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)])
  return walk(root).filter(file => /\.(ts|vue)$/.test(file)).flatMap(file => inspectSource(
    path.relative(root, file).replaceAll('\\', '/'), fs.readFileSync(file, 'utf8')))
}

module.exports = { inspectSource, inspectProject }
if (require.main === module) {
  const errors = inspectProject(path.resolve(__dirname, '../src'))
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1 }
  else console.log('Architecture checks passed.')
}
