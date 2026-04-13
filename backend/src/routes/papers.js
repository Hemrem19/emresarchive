import { Hono } from 'hono';
import { authenticate } from '../middleware/auth.js';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const papers = new Hono();
papers.use('*', authenticate);

// Helper to instantiate R2-compatible S3 SDK
const getS3Client = (env) => {
    return new S3Client({
        region: 'auto',
        endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: env.R2_ACCESS_KEY_ID,
            secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        },
    });
};

papers.get('/:id/pdf/upload-url', async (c) => {
    const paperId = c.req.param('id');
    const user = c.get('user');
    const s3 = getS3Client(c.env);
    
    try {
        const objectKey = `users/${user.id}/papers/${paperId}.pdf`;
        const command = new PutObjectCommand({
            Bucket: c.env.R2_BUCKET_NAME,
            Key: objectKey,
            ContentType: 'application/pdf',
        });
        
        const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
        
        return c.json({ success: true, uploadUrl, objectKey });
    } catch (error) {
        console.error('[R2 Presigner Error]:', error);
        return c.json({ success: false, message: 'Failed to generate secure Edge upload URL.' }, 500);
    }
});

papers.get('/:id/pdf/download-url', async (c) => {
    const paperId = c.req.param('id');
    const user = c.get('user');
    const s3 = getS3Client(c.env);
    
    try {
        const objectKey = `users/${user.id}/papers/${paperId}.pdf`;
        const command = new GetObjectCommand({
            Bucket: c.env.R2_BUCKET_NAME,
            Key: objectKey,
        });
        
        const downloadUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
        return c.json({ success: true, downloadUrl });
    } catch (error) {
        console.error('[R2 Presigner Error]:', error);
        return c.json({ success: false, message: 'Failed to generate secure Edge download URL.' }, 500);
    }
});

export default papers;
