// Normalize server image files to center-cover 100x100 thumbnails, retaining their formats and names.
const fs = require('node:fs/promises')
const path = require('node:path')
const {randomUUID} = require('node:crypto')
const sharp = require('../server/node_modules/sharp')

async function processImages(directory, {dryRun = false, log = console.log} = {}) {
    const root = await fs.realpath(directory)
    const formats = new Map([['.jpg', 'jpeg'], ['.jpeg', 'jpeg'], ['.png', 'png'], ['.webp', 'webp'], ['.avif', 'avif']])
    const files = []
    async function walk(folder) {
        for (const entry of await fs.readdir(folder, {withFileTypes: true})) {
            if (entry.name === '.originals' || entry.isSymbolicLink()) continue
            const file = path.join(folder, entry.name)
            if (entry.isDirectory()) await walk(file)
            else if (entry.isFile() && formats.has(path.extname(file).toLowerCase())) files.push(file)
        }
    }
    await walk(root)
    files.sort()
    const backup = path.join(root, '.originals', new Date().toISOString().replace(/[:.]/g, '-') + '-' + randomUUID().slice(0, 8))
    const summary = {processed: 0, skipped: 0, failed: 0, beforeBytes: 0, afterBytes: 0, backupDirectory: null}
    for (const file of files) {
        let temporary
        try {
            const original = await fs.readFile(file)
            const metadata = await sharp(original, {limitInputPixels: 64000000}).metadata()
            if ((metadata.pages || 1) > 1) throw new Error('Animated images are not supported')
            if (metadata.width === 100 && metadata.height === 100 && (!metadata.orientation || metadata.orientation === 1)) {
                summary.skipped++
                log(`SKIP ${path.relative(root, file)} (already 100x100)`)
                continue
            }
            if (dryRun) {
                summary.processed++
                log(`PREVIEW ${path.relative(root, file)}: ${metadata.width}x${metadata.height} -> 100x100 cover`)
                continue
            }
            const format = formats.get(path.extname(file).toLowerCase())
            const pipeline = sharp(original, {limitInputPixels: 64000000}).rotate()
                .resize(100, 100, {fit: 'cover', position: 'centre'})
            if (format === 'jpeg') pipeline.flatten({background: '#ffffff'}).jpeg({quality: 82})
            else if (format === 'png') pipeline.png({compressionLevel: 9})
            else if (format === 'webp') pipeline.webp({quality: 82})
            else pipeline.avif({quality: 50})
            const thumbnail = await pipeline.toBuffer()
            const saved = path.join(backup, path.relative(root, file))
            await fs.mkdir(path.dirname(saved), {recursive: true})
            await fs.writeFile(saved, original, {flag: 'wx'})
            summary.backupDirectory = backup
            temporary = path.join(path.dirname(file), `.${path.basename(file)}.${randomUUID()}.tmp`)
            await fs.writeFile(temporary, thumbnail, {flag: 'wx'})
            await fs.rename(temporary, file)
            summary.processed++
            summary.beforeBytes += original.length
            summary.afterBytes += thumbnail.length
            log(`OK ${path.relative(root, file)}: ${metadata.width}x${metadata.height} -> 100x100 (${original.length} -> ${thumbnail.length} bytes)`)
        } catch (error) {
            summary.failed++
            log(`FAIL ${path.relative(root, file)}: ${error.message}`)
        } finally {
            if (temporary) await fs.unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error })
        }
    }
    return summary
}

async function main(args = process.argv.slice(2)) {
    let directory = path.resolve(__dirname, '../server/public/sample-images'), dryRun = false
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--dry-run') dryRun = true
        else if (args[i] === '--dir' && args[i + 1] && !args[i + 1].startsWith('--')) directory = path.resolve(args[++i])
        else if (args[i] === '--help') {
            console.log('Usage: node scripts/resize-server-images.cjs [--dir IMAGE_DIRECTORY] [--dry-run]\nDefault: server/public/sample-images. Originals are backed up under IMAGE_DIRECTORY/.originals/.')
            return
        } else throw new Error(`Unknown or incomplete option: ${args[i]}`)
    }
    const summary = await processImages(directory, {dryRun})
    console.log(JSON.stringify({...summary, dryRun}, null, 2))
    if (summary.failed) process.exitCode = 1
}

module.exports = {processImages}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1 })
