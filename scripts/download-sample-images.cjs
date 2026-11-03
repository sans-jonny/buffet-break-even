// Refresh the explicitly curated public menu covers; source metadata is committed beside the files.
const fs = require('node:fs/promises')
const path = require('node:path')
const sharp = require('../server/node_modules/sharp')

async function main() {
    const directory = path.resolve(__dirname, '../server/public/sample-images')
    const sources = JSON.parse(await fs.readFile(path.join(directory, 'SOURCES.json'), 'utf8'))
    const failures = []
    let index = 0
    async function worker() {
        while (index < sources.length) {
            const source = sources[index++]
            try {
                if (!/^[a-z0-9-]+\.jpg$/.test(source.filename)) throw new Error('Invalid local image filename')
                const url = new URL(source.downloadUrl)
                if (url.protocol !== 'https:' || url.hostname !== 'images.pexels.com') throw new Error('Unexpected image host')
                let bytes
                for (let attempt = 0; attempt < 3; attempt++) {
                    try {
                        const response = await fetch(url, {signal: AbortSignal.timeout(25000)})
                        if (!response.ok || !response.headers.get('content-type')?.startsWith('image/'))
                            throw new Error(`Invalid image response: ${response.status}`)
                        bytes = Buffer.from(await response.arrayBuffer())
                        if (bytes.length > 6 * 1024 * 1024) throw new Error('Image exceeds 6 MB')
                        break
                    } catch (error) { if (attempt === 2) throw error }
                }
                const image = await sharp(bytes).rotate().resize(100, 100, {fit: 'cover', position: 'centre'}).jpeg({quality: 82}).toBuffer()
                await fs.writeFile(path.join(directory, source.filename), image)
                console.log(`Saved ${source.filename} (${image.length} bytes)`)
            } catch (error) { failures.push(`${source.filename}: ${error.message}`) }
        }
    }
    await Promise.all(Array.from({length: 4}, worker))
    if (failures.length) throw new Error(failures.join('\n'))
    console.log(`Downloaded and verified ${sources.length} menu covers.`)
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
