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
  courses: {
    mimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
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

// Resolve a fileKey to an absolute path INSIDE UPLOADS_ROOT, rejecting traversal attempts
function resolveSafePath(fileKey: string): string {
  const resolved = path.resolve(UPLOADS_ROOT, fileKey);
  if (resolved !== UPLOADS_ROOT && !resolved.startsWith(UPLOADS_ROOT + path.sep)) {
    throw AppError.badRequest('Invalid file key.');
  }
  return resolved;
}

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
    // Default to 'courses' folder if not specified or invalid
    const validFolder = folder && FOLDER_LIMITS[folder] ? folder : 'courses';
    const limits = FOLDER_LIMITS[validFolder];
    
    // 1. Validate content type limits
    if (!limits.mimeTypes.includes(contentType)) {
      throw AppError.badRequest(
        `Unsupported media type "${contentType}". Permitted types: [${limits.mimeTypes.join(', ')}]`
      );
    }

    // 2. Generate a unique key with timestamp and random ID
    const timestamp = Date.now();
    const randomId = crypto.randomBytes(8).toString('hex');
    const cleanedFilename = filename.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.-]/g, '');
    const fileKey = `${validFolder}/${timestamp}-${randomId}-${cleanedFilename}`;

    // Build the upload URL (local endpoint for multipart/direct upload)
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const uploadUrl = `${baseUrl}/api/v1/storage/upload/${fileKey}`;
    const fileUrl = `${baseUrl}/uploads/${fileKey}`;

    logger.info(`📁 Local upload path prepared for User: ${userId} -> Key: ${fileKey}`);

    return {
      uploadUrl,
      fileUrl,
      fileKey,
      folder: validFolder,
    };
  }

  /**
   * Save an uploaded file buffer to the local filesystem
   */
  public async saveFile(fileKey: string, buffer: Buffer): Promise<string> {
    try {
      const filePath = resolveSafePath(fileKey);
      const dir = path.dirname(filePath);

      // Ensure directory exists
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write the file
      fs.writeFileSync(filePath, buffer);
      
      // Get file size for logging
      const stats = fs.statSync(filePath);
      
      logger.info(`💾 File saved locally: ${fileKey} (${stats.size} bytes)`);
      
      // Return the full URL
      const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
      return `${baseUrl}/uploads/${fileKey}`;
    } catch (error) {
      logger.error(`Failed to save file: ${fileKey}`, error);
      throw AppError.internal('Failed to save file to storage');
    }
  }

  /**
   * Get file path for a given file key
   */
  public async getFilePath(fileKey: string): Promise<string> {
    const filePath = resolveSafePath(fileKey);

    if (!fs.existsSync(filePath)) {
      throw AppError.notFound('File not found on server.');
    }

    return filePath;
  }

  /**
   * Return local download path for a file
   */
  public async getPresignedDownloadUrl(fileKey: string, _filename?: string) {
    const filePath = resolveSafePath(fileKey);

    if (!fs.existsSync(filePath)) {
      throw AppError.notFound('File not found on server.');
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    return `${baseUrl}/uploads/${fileKey}`;
  }

  /**
   * Get file info (size, mime type, etc.)
   */
  public async getFileInfo(fileKey: string) {
    const filePath = resolveSafePath(fileKey);

    if (!fs.existsSync(filePath)) {
      throw AppError.notFound('File not found on server.');
    }

    const stats = fs.statSync(filePath);
    const ext = path.extname(fileKey).toLowerCase();
    
    // Determine mime type from extension
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml',
      '.pdf': 'application/pdf',
      '.mp4': 'video/mp4',
      '.zip': 'application/zip',
    };

    return {
      fileKey,
      size: stats.size,
      mimeType: mimeTypes[ext] || 'application/octet-stream',
      lastModified: stats.mtime,
    };
  }

  /**
   * Delete a file from local storage
   */
  public async deleteFile(fileKey: string) {
    try {
      const filePath = resolveSafePath(fileKey);
      
      if (!fs.existsSync(filePath)) {
        logger.warn(`File not found for deletion: ${fileKey}`);
        return false;
      }

      fs.unlinkSync(filePath);
      logger.info(`🗑️ Deleted local file: ${fileKey}`);
      return true;
    } catch (error) {
      logger.error(`Failed to delete local file: ${fileKey}`, error);
      // We don't crash on background deletion issues
      return false;
    }
  }

  /**
   * Delete all files in a folder (for cleanup)
   */
  public async deleteFolder(folder: string) {
    try {
      const folderPath = path.join(UPLOADS_ROOT, folder);
      
      if (!fs.existsSync(folderPath)) {
        logger.warn(`Folder not found for deletion: ${folder}`);
        return;
      }

      const files = fs.readdirSync(folderPath);
      
      for (const file of files) {
        const filePath = path.join(folderPath, file);
        fs.unlinkSync(filePath);
      }
      
      logger.info(`🗑️ Deleted all files in folder: ${folder}`);
    } catch (error) {
      logger.error(`Failed to delete folder: ${folder}`, error);
    }
  }

  /**
   * Get storage usage statistics
   */
  public async getStorageStats() {
    const stats: Record<string, { count: number; totalSize: number }> = {};
    
    for (const folder of Object.keys(FOLDER_LIMITS)) {
      const folderPath = path.join(UPLOADS_ROOT, folder);
      let count = 0;
      let totalSize = 0;
      
      if (fs.existsSync(folderPath)) {
        const files = fs.readdirSync(folderPath);
        count = files.length;
        
        for (const file of files) {
          const filePath = path.join(folderPath, file);
          const fileStats = fs.statSync(filePath);
          totalSize += fileStats.size;
        }
      }
      
      stats[folder] = { count, totalSize };
    }
    
    return stats;
  }
}

export default StorageService;