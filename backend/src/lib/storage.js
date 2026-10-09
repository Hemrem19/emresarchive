/**
 * PDF object storage for the Worker.
 *
 * Prefers a native R2 binding (env.PDF_BUCKET) and falls back to the
 * S3-compatible API (S3_ENDPOINT / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY /
 * S3_BUCKET_NAME). Presigned URLs always require the S3 credentials.
 */
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
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

/** Same key layout the Express backend used, so existing objects stay reachable. */
export function generatePdfKey(userId, paperId, filename) {
    const sanitized = (filename || 'upload.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
    return `papers/${userId}/${paperId}/${sanitized}`;
}

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

export function presignUpload(env, key, contentType = 'application/pdf') {
    return getSignedUrl(getS3Client(env), new PutObjectCommand({
        Bucket: env.S3_BUCKET_NAME,
        Key: key,
        ContentType: contentType,
    }), { expiresIn: PRESIGNED_URL_EXPIRY });
}

export function presignDownload(env, key) {
    return getSignedUrl(getS3Client(env), new GetObjectCommand({
        Bucket: env.S3_BUCKET_NAME,
        Key: key,
    }), { expiresIn: PRESIGNED_URL_EXPIRY });
}
