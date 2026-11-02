require('../../scripts/typescript.cjs')
const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const ts = require('typescript')
const {createSSRApp} = require('vue')
const {UniAppUseCaseScope} = require('../../src/composition/UniAppUseCaseScope.ts')

test('provide / resolve 从 token 推断服务类型，并拒绝不匹配实现与无类型 token', () => {
    const program = ts.createProgram([path.resolve('tests/types/UniAppUseCaseScopeTypes.ts')], {
        noEmit: true, strict: true, skipLibCheck: true, types: [],
        target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS,
        moduleResolution: ts.ModuleResolutionKind.Node10
    })
    const diagnostics = ts.getPreEmitDiagnostics(program)
    assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCurrentDirectory: () => process.cwd(), getCanonicalFileName: file => file, getNewLine: () => '\n'
    }))
})

test('容器保留 symbol 身份隔离，支持假值，未注册 token 明确报错', () => {
    const scope = new UniAppUseCaseScope(createSSRApp({}))
    const first = Symbol('SameDescription'), second = Symbol('SameDescription')
    const service = {name: 'service'}
    scope.provide(first, service)
    assert.equal(scope.resolve(first), service)
    assert.throws(() => scope.resolve(second), /UseCase 未注册：Symbol\(SameDescription\)/)
    for (const value of [false, 0, '', null]) {
        const token = Symbol('Falsy')
        scope.provide(token, value)
        assert.equal(scope.resolve(token), value)
    }
})
