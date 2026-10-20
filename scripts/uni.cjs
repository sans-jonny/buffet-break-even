const path = require('node:path')

// Keep uni-app's pages, components and static assets together under the UI root.
process.env.UNI_INPUT_DIR = path.resolve(__dirname, '../src/ui')
const plugin = path.dirname(require.resolve('@dcloudio/vite-plugin-uni/package.json'))
require(path.join(plugin, 'bin/uni.js'))
