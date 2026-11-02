import type {FastifyInstance} from 'fastify';
import type {PrismaClient} from '../../generated/client';
import sharp from 'sharp';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';

/** Public assets are permanent; private image bytes belong only to their temporary room. */
export namespace ProductImages {
    export async function register(app: FastifyInstance, db: PrismaClient, updated: (roomId: string) => Promise<void>) {
        const samples = resolve(__dirname, '../../public/sample-images');
        const params = '/rooms/:roomId/product-images/:restaurantId/:productId';
        app.post<{Params: {roomId: string; restaurantId: string; productId: string}; Body: {dataUrl?: string; url?: string}}>(
            params, {bodyLimit: 4 * 1024 * 1024 + 4096}, async (request, reply) => {
                const {roomId, restaurantId, productId} = request.params;
                if (![restaurantId, productId].every(value => value.trim() && value.length <= 200 && !/[\x00-\x1f]/.test(value)))
                    return reply.code(400).send({error: 'INVALID_IMAGE_ID'});
                let content: Buffer | null = null, digest: string | null = null, externalUrl: string | null = null;
                if (request.body?.url !== undefined) {
                    if (!validExternal(request.body.url)) return reply.code(400).send({error: 'INVALID_IMAGE_URL'});
                    externalUrl = request.body.url;
                } else {
                    const match = typeof request.body?.dataUrl === 'string' && request.body.dataUrl.match(/^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/);
                    if (!match) return reply.code(400).send({error: 'INVALID_IMAGE'});
                    const input = Buffer.from(match[2], 'base64');
                    if (input.length > 3 * 1024 * 1024) return reply.code(413).send({error: 'IMAGE_SIZE_LIMIT'});
                    try {
                        const pipeline = sharp(input, {limitInputPixels: 16000000, animated: false});
                        const metadata = await pipeline.metadata();
                        if (!['jpeg', 'png', 'webp'].includes(metadata.format || '')) throw new Error();
                        content = await pipeline.rotate().resize(800, 800, {fit: 'inside', withoutEnlargement: true}).webp({quality: 82}).toBuffer();
                        digest = createHash('sha256').update(content).digest('hex');
                    } catch { return reply.code(400).send({error: 'INVALID_IMAGE'}); }
                }
                await db.$transaction(async tx => {
                    if (!await tx.roomStream.findUnique({where: {roomId}})) throw new Error('STREAM_NOT_FOUND');
                    await tx.roomProductImage.upsert({where: {roomId_restaurantId_productId: {roomId, restaurantId, productId}},
                        create: {roomId, restaurantId, productId, content, digest, externalUrl}, update: {content, digest, externalUrl}});
                });
                return reply.code(201).send({restaurantId, productId, url: externalUrl || imagePath(roomId, restaurantId, productId, digest!)});
            });
        app.get<{Params: {roomId: string; restaurantId: string; productId: string; filename: string}}>(params + '/:filename', async (request, reply) => {
            const {filename, ...key} = request.params;
            if (!/^[a-f0-9]{64}\.webp$/.test(filename)) return reply.code(404).send({error: 'IMAGE_NOT_FOUND'});
            const image = await db.roomProductImage.findUnique({where: {roomId_restaurantId_productId: key}});
            if (!image?.content || image.digest + '.webp' !== filename) return reply.code(404).send({error: 'IMAGE_NOT_FOUND'});
            return reply.type('image/webp').header('X-Content-Type-Options', 'nosniff')
                .header('Cache-Control', 'private, no-store').send(Buffer.from(image.content));
        });
        app.put<{Params: {roomId: string; restaurantId: string}; Body: {productIds: string[]}}>(
            '/rooms/:roomId/product-images/:restaurantId', async (request, reply) => {
                const {roomId, restaurantId} = request.params;
                if (!Array.isArray(request.body?.productIds) || request.body.productIds.some(id => typeof id !== 'string'))
                    return reply.code(400).send({error: 'INVALID_IMAGE_IDS'});
                if (!await db.roomStream.findUnique({where: {roomId}})) throw new Error('STREAM_NOT_FOUND');
                await db.roomProductImage.deleteMany({where: {roomId, restaurantId, productId: {notIn: request.body.productIds}}});
                await updated(roomId);
                return reply.code(204).send();
            });
        app.get<{Params: {filename: string}}>('/sample-images/:filename', async (request, reply) => {
            if (!/^[a-z0-9-]+\.jpg$/.test(request.params.filename)) return reply.code(404).send({error: 'IMAGE_NOT_FOUND'});
            try {
                return reply.type('image/jpeg').header('X-Content-Type-Options', 'nosniff')
                    .header('Cache-Control', 'public, max-age=31536000, immutable').send(await readFile(resolve(samples, request.params.filename)));
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
                return reply.code(404).send({error: 'IMAGE_NOT_FOUND'});
            }
        });
    }

    export async function manifest(db: PrismaClient, roomId: string) {
        const rows = await db.roomProductImage.findMany({where: {roomId}, orderBy: [{restaurantId: 'asc'}, {productId: 'asc'}],
            select: {restaurantId: true, productId: true, digest: true, externalUrl: true}});
        return rows.map(row => ({restaurantId: row.restaurantId, productId: row.productId,
            url: row.externalUrl || imagePath(roomId, row.restaurantId, row.productId, row.digest!)}));
    }

    function imagePath(roomId: string, restaurantId: string, productId: string, digest: string): string {
        return `/rooms/${encodeURIComponent(roomId)}/product-images/${encodeURIComponent(restaurantId)}/${encodeURIComponent(productId)}/${digest}.webp`;
    }

    function validExternal(value: unknown): value is string {
        if (typeof value !== 'string' || value.length > 2048) return false;
        try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password; }
        catch { return false; }
    }
}
