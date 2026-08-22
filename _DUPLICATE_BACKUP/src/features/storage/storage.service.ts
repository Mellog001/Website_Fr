import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { AppError } from '../../common/errors/app-error';
import { logger } from '../../config/logger';

// Local uploads root directory
const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads');

// Standard file folders configurations
const FOLDER_LIMITS: Record<string, { mimeTypes: string[]; maxSizeBytes: number }> = {
  avatars: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSizeBytes: 2 * 1024 * 1024, // 2MB
  },
  qualifications: {
    mimeTypes: ['application/pdf'],
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
  },
  materials: {
    mimeTypes: ['application/pdf', 'video/mp4', 'video/quicktime', 'application/zip'],
    maxSizeBytes: 100 * 1024 * 1024, // 100MB
  },
  assessments: {
    mimeTypes: ['application/pdf'],
    maxSizeBytes: 20 * 1024 * 1024, // 20MB
  },
  submissions: {
    mimeTypes: ['application/pdf', 'application/zip'],
    maxSizeBytes: 50 * 1024 * 1024, // 50MB
  },
};

// Ensure upload directories exist on startup
for (const folder of Object.keys(FOLDER_LIMITS)) {
  const dir = path.join(UPLOADS_ROOT, folder);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export class StorageService {
  /**
   * Validate file metadata and return the local file path info for a direct upload
   */
  public async getPresignedUploadUrl(
    userId: string,
    filename: string,
    contentType: string,
    folder: keyof typeof FOLDER_LIMITS
  ) {
    const limits = FOLDER_LIMITS[folder];
    
    // 1. Validate content type limits
    if (!limits.mimeTypes.includes(contentType)) {
      throw AppError.badRequest(
        `Unsupported media type "${contentType}". Permitted types: [${limits.mimeTypes.join(', ')}]`
      );
    }

    // 2. Generate a unique key
    const cleanedFilename = filename.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.-]/g, '');
    const fileKey = `${folder}/${crypto.randomUUID()}-${cleanedFilename}`;

    // Build the upload URL (local endpoint for multipart/direct upload)
    const uploadUrl = `/api/v1/storage/upload/${fileKey}`;
    const fileUrl = `/uploads/${fileKey}`;

    logger.info(`📁 Local upload path prepared for User: ${userId} -> Key: ${fileKey}`);

    return {
      uploadUrl,
      fileUrl,
      fileKey,
    };
  }

  /**
   * Save an uploaded file buffer to the local filesystem
   */
  public async saveFile(fileKey: string, buffer: Buffer): Promise<string> {
    const filePath = path.join(UPLOADS_ROOT, fileKey);
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, buffer);
    logger.info(`💾 File saved locally: ${fileKey}`);
    return `/uploads/${fileKey}`;
  }

  /**
   * Return local download path for a file
   */
  public async getPresignedDownloadUrl(fileKey: string, _filename?: string) {
    const filePath = path.join(UPLOADS_ROOT, fileKey);

    if (!fs.existsSync(filePath)) {
      throw AppError.notFound('File not found on server.');
    }

    return `/uploads/${fileKey}`;
  }

  /**
   * Delete a file from local storage
   */
  public async deleteFile(fileKey: string) {
    const filePath = path.join(UPLOADS_ROOT, fileKey);

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`🗑️ Deleted local file: ${fileKey}`);
      }
    } catch (error) {
      logger.error(`Failed to delete local file: ${fileKey}`, error);
      // We don't crash on background deletion issues
    }
  }
}

export default StorageService;
