import {test} from 'node:test'
import assert from 'node:assert/strict'
import {readdirSync, readFileSync, existsSync} from 'node:fs'
import {basename, dirname, relative, resolve} from 'node:path'
import ts from 'typescript'

export namespace ArchitectureSpec {
    export function files(directory: string, includeVue = false): string[] {
        return readdirSync(directory, {withFileTypes: true}).flatMap(entry => entry.isDirectory()
            ? entry.name === 'generated' ? [] : files(resolve(directory, entry.name), includeVue)
            : (/\.ts$/.test(entry.name) || includeVue && /\.vue$/.test(entry.name)) && !entry.name.endsWith('.d.ts') ? [resolve(directory, entry.name)] : [])
    }

    export function dependencies(file: string, runtimeOnly = false): string[] {
        let text = readFileSync(file, 'utf8')
        if (file.endsWith('.vue')) text = [...text.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]).join('\n')
        const result: string[] = [], source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)
        const visit = (node: ts.Node) => {
            if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {if(!runtimeOnly||!ts.isImportDeclaration(node)||!node.importClause?.isTypeOnly)result.push(node.moduleSpecifier.text)}
            if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
                assert.ok(node.arguments[0] && ts.isStringLiteral(node.arguments[0]), `${file}: 不允许无法静态解析的动态依赖`)
                result.push((node.arguments[0] as ts.StringLiteral).text)
            }
            ts.forEachChild(node, visit)
        }
        visit(source);
        return result
    }

    export function verify(): void {
        const sources = ['src', 'server/src', 'protocol', 'tests'].flatMap(directory => files(resolve(directory)))
        test('领域模型不声明 URL 或 emoji 等展示字段', () => {
            for (const file of sources.filter(file => /src[\\/]contexts[\\/].+[\\/]domain[\\/]/.test(file))) {
                const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
                const visit = (node: ts.Node) => {
                    if ((ts.isPropertyDeclaration(node) || ts.isPropertySignature(node)) && node.name && ts.isIdentifier(node.name))
                        assert.ok(!/url|emoji/i.test(node.name.text), `${file}: 展示信息应存入独立的媒体数据`);
                    ts.forEachChild(node, visit);
                };
                visit(source);
            }
        });
        test('页面通过 useStore 访问业务，不保留客户端门面或等待初始化', () => {
            assert.equal(existsSync(resolve('src/ui/DiningClient.ts')), false);
            assert.equal(existsSync(resolve('src/ui/useDining.ts')), false);
            for (const file of files(resolve('src/ui/pages'), true)) {
                const text = readFileSync(file, 'utf8');
                assert.ok(!/DiningClient|client\.ready|useDining\(\)/.test(text), file);
            }
        });
        test('具体用例不再定义 TransactionPort 文件',()=>{
            assert.deepEqual(sources.filter(file=>file.startsWith(resolve('src'))&&file.endsWith('TransactionPort.ts')),[])
            assert.deepEqual(sources.filter(file=>file.startsWith(resolve('src'))&&(file.endsWith('Transactions.ts')||file.endsWith('InTransactionUseCase.ts'))),[])
        })
        test('会话由独立输入端口与 Interactor 实现，不保留 Workflow、Service 或聚合门面', () => {
            for (const file of ['workflow/DiningSessionWorkflow.ts', 'workflow/DiningSessionService.ts',
                'port/in/DiningSessions.ts', 'port/in/DiningSessionActions.ts'])
                assert.equal(existsSync(resolve('src/coordination/application', file)), false, file);
            const store = readFileSync(resolve('src/stores/business/SessionStore.ts'), 'utf8');
            assert.ok(!/DiningSessions|DiningSessionActions|Workflow|Service/.test(store));
        });
        test('私人持久化对象上传不依赖 Domain 或业务事件编码', () => {
            const file = resolve('src/infrastructure/storage/RoomRestaurantPersistence.ts');
            for (const dependency of dependencies(file))
                assert.ok(!/\/domain\/|SerializedEvent|EventMapper|CopyRestaurantToRoom/.test(dependency), dependency);
        });
        test('业务层无存储键与基础设施依赖；领域无传输信封和 Model 包装',()=>{
            for(const file of sources.filter(f=>f.includes(`${require('node:path').sep}src${require('node:path').sep}`))){
                const name=relative(process.cwd(),file).replace(/\\/g,'/'),text=readFileSync(file,'utf8')
                if(!name.includes('/application/')&&!name.includes('/domain/'))continue
                if(name.startsWith('src/kernel/'))continue
                const source=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true)
                const visit=(node:ts.Node)=>{
                    if(ts.isStringLiteralLike(node))assert.ok(!/^(accounting\/(activity|consumption)\/|catalog\/[^/]+\/restaurant\/|collaboration\/room\/|personal\/|cursor\/|journal\/|outcome\/)/.test(node.text),`${name}: 业务存储键必须位于适配器`)
                    if(name.includes('/domain/')){
                        if(ts.isClassDeclaration(node))assert.notEqual(node.name?.text,'Model',`${name}: 使用直接聚合类`)
                        if(ts.isIdentifier(node))assert.ok(!['schemaVersion','TransactionContext','PrismaClient'].includes(node.text),`${name}: 领域不依赖传输或事务`)
                    }
                    ts.forEachChild(node,visit)
                }
                visit(source)
                for(const dependency of dependencies(file))assert.ok(!/infrastructure|adapter\/|\bvue\b|@dcloudio|prisma/.test(dependency),`${name} -> ${dependency}`)
            }
        })
        test('Repository 契约不依赖事务；领域没有 state 包装、事件快照或冻结实例', () => {
            for (const file of sources.filter(f => f.startsWith(resolve('src')))) {
                const name = relative(process.cwd(), file).replace(/\\/g, '/'), text = readFileSync(file, 'utf8');
                assert.ok(!/Object\.freeze\(this\)/.test(text), `${name}: 使用 readonly`);
                if (/\/application\/port\/out\/.*Repository\.ts$/.test(name)) {
                    assert.ok(!/\bTransaction\b|\bstage\s*\(/.test(text), `${name}: 公开仓储不依赖事务和实现机制`);
                    assert.match(text, /\bapply\s*\(/);
                }
                if (name.includes('/domain/')) assert.ok(!/this\.state\b|readonly state\b/.test(text), `${name}: 领域数据直接作为字段`);
                if (name.includes('/domain/event/')) assert.ok(!/\bsnapshot\b|\.State\b|\bpayload\b/.test(text), `${name}: 事件只包含必要事实`);
            }
        })
        test('写 Interactor 不覆写 execute；内部事务端口不暴露给 UI',()=>{
            for(const file of sources){
                const name=relative(process.cwd(),file).replace(/\\/g,'/'),source=ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true)
                if(name.startsWith('src/ui/'))for(const dependency of dependencies(file))assert.ok(!dependency.includes('/application/internal/'),`${name}: 内部事务端口不是页面入口`)
                source.statements.filter(ts.isClassDeclaration).forEach(declaration=>{
                    const transactional=declaration.heritageClauses?.some(clause=>clause.types.some(type=>type.expression.getText(source)==='TransactionalInteractor'))
                    if(transactional){
                        assert.ok(!declaration.members.some(member=>member.name?.getText(source)==='execute'),`${name}: 不能覆写模板入口`)
                        assert.ok(declaration.members.some(member=>member.name?.getText(source)==='executeInTransaction'),`${name}: 缺少模板扩展点`)
                    }
                })
                if(name.includes('/application/use-case/'))assert.ok(!/\btransactions\.run\s*\(|\btx\.stage\s*\(/.test(source.text),`${name}: 事务由模板管理，暂存通过仓储`)
            }
        })
        test('每个运行时 TS 文件仅有一个同文件名的顶级对象；内部类型依附同一个对象', () => {
            for (const file of sources) {
                const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true),
                    names = new Set<string>()
                source.statements.forEach(statement => {
                    if (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) return
                    if (ts.isModuleDeclaration(statement) && statement.name.text === 'global') return // ambient declarations emit no object
                    if (ts.isVariableStatement(statement)) statement.declarationList.declarations.forEach(d => names.add(d.name.getText(source)))
                    else if ((ts.isClassDeclaration(statement) || ts.isInterfaceDeclaration(statement) || ts.isTypeAliasDeclaration(statement) || ts.isModuleDeclaration(statement) || ts.isFunctionDeclaration(statement)) && statement.name) names.add(statement.name.getText(source))
                    else assert.fail(`${relative(process.cwd(), file)}: 意外顶级语句 ${statement.getText(source).slice(0, 70)}`)
                })
                // TS declaration merging (function/namespace, port type/token) names one object.
                const expected = file === resolve('src/ui/main.ts') ? 'createApp' : basename(file, '.ts')
                assert.deepEqual([...names], [expected], relative(process.cwd(), file))
            }
        })
        test('Domain / Application / Coordination / Server 依赖方向及无循环导入', () => {
            const graph = new Map<string, string[]>()
            for (const file of [...sources, ...files(resolve('src/ui'), true).filter(file => file.endsWith('.vue'))]) {
                const name = relative(process.cwd(), file).replace(/\\/g, '/'), imports = dependencies(file)
                const targets = imports.map(specifier => specifier.startsWith('@/') ? resolve('src', specifier.slice(2)) : specifier.startsWith('.') ? resolve(dirname(file), specifier) : specifier)
                const runtimeImports=dependencies(file,true)
                graph.set(file, targets.filter((target,index)=>runtimeImports.includes(imports[index])).filter(target => target.includes(':') || target.startsWith('/')).map(target => /\.(ts|vue)$/.test(target) ? target : target + '.ts'))
                for (let index = 0; index < imports.length; index++) {
                    const specifier = imports[index],
                        target = relative(process.cwd(), targets[index]).replace(/\\/g, '/')
                    const domain = name.match(/^src\/contexts\/([^/]+)\/domain\//)
                    if (domain) assert.ok(target.startsWith(`src/contexts/${domain[1]}/domain/`) || target.startsWith('src/kernel/domain/'), `${name} -> ${specifier}`)
                    if (name.startsWith('src/kernel/')) assert.ok(target.startsWith('src/kernel/'), `${name} -> ${specifier}`)
                    if (name.startsWith('src/coordination/application/')) assert.ok(/^src\/contexts\/[^/]+\/application\/(port\/in|internal)\//.test(target) || target.startsWith('src/kernel/') || target.startsWith('src/coordination/application/'), `${name} -> ${specifier}`)
                    const application = name.match(/^src\/contexts\/([^/]+)\/application\//)
                    if (application) assert.ok(target.startsWith(`src/contexts/${application[1]}/`) && !target.includes('/adapter/') || target.startsWith('src/kernel/'), `${name} -> ${specifier}`)
                    if (name.startsWith('server/')) assert.ok(!target.startsWith('src/'), `${name} -> ${specifier}`)
                    if (name.startsWith('protocol/')) assert.equal(imports.length, 0)
                    if (name.startsWith('src/ui/pages/')) assert.ok(!target.startsWith('src/') || target.startsWith('src/ui/') || /^src\/stores\/(business|page-state)\/use\w+Store(?:\.ts)?$/.test(target), `${name}: 页面通过 useStore 访问业务`)
                    assert.ok(!specifier.startsWith('@buffet/'), `${name}: 禁止旧的多 npm 包边界`)
                }
            }
            const visited = new Set<string>(), visiting = new Set<string>()
            const visit = (file: string) => {
                if (visited.has(file)) return
                assert.ok(!visiting.has(file), `循环依赖: ${file}`)
                visiting.add(file);
                (graph.get(file) || []).filter(f => graph.has(f)).forEach(visit);
                visiting.delete(file);
                visited.add(file)
            }
            sources.forEach(visit)
        })
    }
}
