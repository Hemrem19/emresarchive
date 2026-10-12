/**
 * PDF object storage for the Worker.
 *
 * Prefers a native R2 binding (env.PDF_BUCKET) and falls back to the
 * S3-compatible API (S3_ENDPOINT / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY /
 * S3_BUCKET_NAME). Presigned download URLs require the S3 credentials.
 */
import {
    S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const PRESIGNED_URL_EXPIRY = 3600;

const hasS3Credentials = (env) =>
    !!(env.S3_ENDPOINT && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY && env.S3_BUCKET_NAME);

export const isStorageConfigured = (env) => !!env.PDF_BUCKET || hasS3Credentials(env);

export const canPresign = hasS3Credentials;

const getS3Client = (env) => new S3Client({
    region: env.S3_REGION || 'auto',
    endpoint: env.S3_ENDPOINT,
    credentials: {
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
});

/** pdfUrl may hold a bare key or a full R2 URL (legacy rows). */
export function extractKey(urlOrKey) {
    if (!urlOrKey.startsWith('http')) return urlOrKey;
    const url = new URL(urlOrKey);
    return url.pathname.replace(/^\/[^/]+/, '').replace(/^\//, '');
}

export const isStoredObject = (pdfUrl) =>
    !!pdfUrl && (pdfUrl.startsWith('papers/') || pdfUrl.includes('r2.'));

export async function putObject(env, key, body, contentType = 'application/pdf') {
    if (env.PDF_BUCKET) {
        await env.PDF_BUCKET.put(key, body, { httpMetadata: { contentType } });
        return;
    }
    await getS3Client(env).send(new PutObjectCommand({
        Bucket: env.S3_BUCKET_NAME,
        Key: key,
        Body: body instanceof ArrayBuffer ? new Uint8Array(body) : body,
        ContentType: contentType,
    }));
}

/** Returns { body: ReadableStream, size } or null when the object does not exist. */
export async function getObject(env, key) {
    if (env.PDF_BUCKET) {
        const obj = await env.PDF_BUCKET.get(key);
        return obj ? { body: obj.body, size: obj.size } : null;
    }
    try {
        const res = await getS3Client(env).send(new GetObjectCommand({
            Bucket: env.S3_BUCKET_NAME,
            Key: key,
        }));
        return { body: res.Body.transformToWebStream(), size: res.ContentLength };
    } catch (err) {
        if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) return null;
        throw err;
    }
}

/** Yields { key, size, uploaded } for every object under `prefix`. */
export async function* listObjects(env, prefix) {
    if (env.PDF_BUCKET) {
        let cursor;
        do {
            const page = await env.PDF_BUCKET.list({ prefix, cursor, limit: 1000 });
            for (const o of page.objects) yield { key: o.key, size: o.size, uploaded: new Date(o.uploaded) };
            cursor = page.truncated ? page.cursor : undefined;
        } while (cursor);
        return;
    }
    const client = getS3Client(env);
    let token;
    do {
        const page = await client.send(new ListObjectsV2Command({
            Bucket: env.S3_BUCKET_NAME, Prefix: prefix, ContinuationToken: token,
        }));
        for (const o of page.Contents || []) yield { key: o.Key, size: o.Size, uploaded: new Date(o.LastModified) };
        token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
}

/** Deletes up to 1000 keys. */
export async function deleteObjects(env, keys) {
    if (!keys.length) return;
    if (env.PDF_BUCKET) {
        await env.PDF_BUCKET.delete(keys);
        return;
    }
    await getS3Client(env).send(new DeleteObjectsCommand({
        Bucket: env.S3_BUCKET_NAME,
        Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true },
    }));
}

export function presignDownload(env, key) {
    return getSignedUrl(getS3Client(env), new GetObjectCommand({
        Bucket: env.S3_BUCKET_NAME,
        Key: key,
    }), { expiresIn: PRESIGNED_URL_EXPIRY });
}
