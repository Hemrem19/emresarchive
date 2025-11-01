/**
 * S3 Storage Service (Cloudflare R2 compatible)
 * Handles presigned URL generation for secure uploads/downloads
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';

// Initialize S3 client (works with Cloudflare R2 and other S3-compatible services)
// Note: We don't configure checksum middleware here to avoid issues with presigned URLs
const s3Client = new S3Client({
  region: process.env.S3_REGION || 'auto',
  endpoint: process.env.S3_ENDPOINT, // Cloudflare R2 endpoint
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || ''
  },
  forcePathStyle: true // Required for R2
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || '';
const PRESIGNED_URL_EXPIRY = parseInt(process.env.S3_PRESIGNED_URL_EXPIRY_SECONDS) || 3600; // 1 hour default

/**
 * Generate a presigned URL for uploading a PDF
 * @param {string} key - S3 object key (e.g., "papers/{userId}/{paperId}/{filename}")
 * @param {string} contentType - MIME type (e.g., "application/pdf")
 * @param {number} contentLength - File size in bytes
 * @returns {Promise<string>} Presigned URL for upload
 */
export async function getPresignedUploadUrl(key, contentType, contentLength) {
  try {
    // Validate S3 configuration
    if (!BUCKET_NAME || !process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY) {
      throw new Error('S3 storage is not configured. Please set S3_BUCKET_NAME, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY environment variables.');
    }

    // Check file size limit (e.g., 50MB)
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
    if (contentLength > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    }

    // CRITICAL FIX: Cloudflare R2 does NOT support presigned POST (returns 501 Not Implemented)
    // We must use presigned PUT instead, even though CanonicalRequest shows GET
    // 
    // Check if we're using R2 (endpoint contains 'cloudflarestorage.com' or 'r2.cloudflarestorage.com')
    const isR2 = process.env.S3_ENDPOINT && (
      process.env.S3_ENDPOINT.includes('cloudflarestorage.com') ||
      process.env.S3_ENDPOINT.includes('r2.cloudflarestorage.com')
    );

    if (isR2) {
      // R2 doesn't support presigned POST - use PUT directly
      console.log('[S3] Using presigned PUT for R2 (POST not supported)');
      
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: contentType // Include ContentType in signature
      });

      const url = await getSignedUrl(s3Client, command, { 
        expiresIn: PRESIGNED_URL_EXPIRY
      });

      console.log('[S3] Generated presigned PUT URL for key:', key);
      // Return as string for PUT
      return url;
    } else {
      // For AWS S3 or other S3-compatible services, try presigned POST first
      try {
        const { url, fields } = await createPresignedPost(s3Client, {
          Bucket: BUCKET_NAME,
          Key: key,
          Conditions: [
            ['content-length-range', 1, MAX_FILE_SIZE],
            ['eq', '$Content-Type', contentType]
          ],
          Fields: {
            'Content-Type': contentType
          },
          Expires: PRESIGNED_URL_EXPIRY
        });

        console.log('[S3] Generated presigned POST URL and fields for key:', key);
        return { url, fields };
      } catch (postError) {
        // Fallback to PUT if presigned POST fails
        console.warn('[S3] Presigned POST failed, falling back to PUT:', postError.message);
        
        const command = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
          ContentType: contentType
        });

        const url = await getSignedUrl(s3Client, command, { 
          expiresIn: PRESIGNED_URL_EXPIRY
        });

        console.log('[S3] Generated presigned PUT URL (fallback) for key:', key);
        return url;
      }
    }
  } catch (error) {
    console.error('Error generating presigned upload URL:', error);
    throw error;
  }
}

/**
 * Generate a presigned URL for downloading a PDF
 * @param {string} key - S3 object key
 * @returns {Promise<string>} Presigned URL for download
 */
export async function getPresignedDownloadUrl(key) {
  try {
    // Validate S3 configuration
    if (!BUCKET_NAME || !process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY) {
      throw new Error('S3 storage is not configured. Please set S3_BUCKET_NAME, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY environment variables.');
    }

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: PRESIGNED_URL_EXPIRY });

    return url;
  } catch (error) {
    console.error('Error generating presigned download URL:', error);
    throw error;
  }
}

/**
 * Generate S3 key for a paper's PDF
 * @param {number} userId - User ID
 * @param {number} paperId - Paper ID
 * @param {string} filename - Original filename
 * @returns {string} S3 object key
 */
export function generatePdfKey(userId, paperId, filename) {
  // Sanitize filename (remove path separators and special characters)
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `papers/${userId}/${paperId}/${sanitizedFilename}`;
}

/**
 * Extract S3 key from a full S3 URL or key string
 * @param {string} urlOrKey - S3 URL or key
 * @returns {string} S3 object key
 */
export function extractS3Key(urlOrKey) {
  // If it's a full URL, extract the key
  if (urlOrKey.startsWith('http')) {
    // Extract key from URL (format: https://bucket.endpoint/key or https://endpoint/bucket/key)
    const url = new URL(urlOrKey);
    // Remove leading slash and bucket name if present
    let key = url.pathname.replace(/^\/[^/]+/, '').replace(/^\//, '');
    return key;
  }
  // Already a key
  return urlOrKey;
}

/**
 * Check if S3 is configured
 * @returns {boolean} True if S3 is configured
 */
export function isS3Configured() {
  return !!(
    BUCKET_NAME &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY &&
    process.env.S3_ENDPOINT
  );
}



