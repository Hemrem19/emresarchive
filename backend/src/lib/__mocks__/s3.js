import { vi } from 'vitest';

export const getPresignedUploadUrl = vi.fn();
export const generatePdfKey = vi.fn((userId, paperId, filename) => `papers/${userId}/${paperId}/${filename}`);
export const isS3Configured = vi.fn().mockReturnValue(true);
export const uploadFileToS3 = vi.fn().mockResolvedValue({});
export const getPresignedDownloadUrl = vi.fn();
export const extractS3Key = vi.fn((url) => url.split('/').pop());
export const getS3ObjectStream = vi.fn();
