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

test('轻量作用域按需创建依赖，同作用域复用，事务作用域之间隔离且不创建 Vue App', () => {
    const token = Symbol('Dependency'), unused = Symbol('Unused')
    let created = 0
    const make = () => {
        const scope = new UniAppUseCaseScope()
        scope.factory(token, () => ({id: ++created}))
        scope.factory(unused, () => { throw new Error('MUST_STAY_LAZY') })
        return scope
    }
    const first = make(), second = make()
    assert.equal(created, 0)
    assert.equal(first.resolve(token), first.resolve(token))
    assert.notEqual(first.resolve(token), second.resolve(token))
    assert.equal(created, 2)
})

test('工厂循环明确报错，工厂失败不缓存半成品，成功实例可被显式替换', () => {
    const scope = new UniAppUseCaseScope(), a = Symbol('A'), b = Symbol('B')
    scope.factory(a, () => scope.resolve(b))
    scope.factory(b, () => scope.resolve(a))
    assert.throws(() => scope.resolve(a), /循环依赖/)
    let attempts = 0
    scope.factory(a, () => { if (++attempts === 1) throw new Error('CONSTRUCTION_FAILED'); return {name: 'ready'} })
    assert.throws(() => scope.resolve(a), /CONSTRUCTION_FAILED/)
    assert.equal(scope.resolve(a).name, 'ready')
    assert.equal(attempts, 2)
    const replacement = {name: 'replacement'}
    scope.provide(a, replacement)
    assert.equal(scope.resolve(a), replacement)
})
