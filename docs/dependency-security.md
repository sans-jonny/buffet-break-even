# Vite 漏洞与升级约束

本轮处理 IDE 诊断时确认：项目直接依赖 Vite 5.2.8；当前安装的 `@dcloudio/vite-plugin-uni@3.0.0-5020420260813003` 在 peerDependencies 中精确要求 `vite: 5.2.8`。

Vite 的依赖漏洞提示属于实际安全问题，未通过关闭检查、忽略 peer 冲突或强制安装来消除提示。package.json 和 package-lock.json 的依赖版本保持不变。

官方公告 [CVE-2026-53571](https://github.com/vitejs/vite/security/advisories/GHSA-fx2h-pf6j-xcff) 的受影响范围包含 `<=6.4.2`，修复版本为 6.4.3、7.3.5、8.0.16。仅升级到 Vite 5.4 的补丁版本无法解决该项。项目运行在 Windows，因此不能将此类报告视为无关的 IDE 误报。

后续升级应先确认 uni-app 编译器及其 Vite、Vue 插件支持的修复版本，再成套更新编译依赖和锁文件。需验证依赖树不存在 peer 冲突、H5 开发服务器及热更新正常、H5 与微信构建通过，然后重新运行依赖审计。

当前仍存在上述版本风险；本次通过的业务测试、类型检查和构建不代表依赖漏洞已经修复。
