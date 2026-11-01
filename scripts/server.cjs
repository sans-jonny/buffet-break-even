const envFile = require('node:path').resolve(__dirname, '../.env')
if (require('node:fs').existsSync(envFile)) process.loadEnvFile(envFile)

require('./typescript.cjs')
require('../server/src/transport/RelayServer.ts').RelayServer.start().catch(error => {
    console.error(error);
    process.exitCode = 1
})
