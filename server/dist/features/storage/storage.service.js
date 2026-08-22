"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const app_error_1 = require("../../common/errors/app-error");
const logger_1 = require("../../config/logger");
// Local uploads root directory
const UPLOADS_ROOT = path_1.default.resolve(process.cwd(), 'uploads');
// Standard file folders configurations
const FOLDER_LIMITS = {
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
    const dir = path_1.default.join(UPLOADS_ROOT, folder);
    if (!fs_1.default.existsSync(dir)) {
        fs_1.default.mkdirSync(dir, { recursive: true });
    }
}
class StorageService {
    /**
     * Validate file metadata and return the local file path info for a direct upload
     */
    async getPresignedUploadUrl(userId, filename, contentType, folder) {
        const limits = FOLDER_LIMITS[folder];
        // 1. Validate content type limits
        if (!limits.mimeTypes.includes(contentType)) {
            throw app_error_1.AppError.badRequest(`Unsupported media type "${contentType}". Permitted types: [${limits.mimeTypes.join(', ')}]`);
        }
        // 2. Generate a unique key
        const cleanedFilename = filename.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.-]/g, '');
        const fileKey = `${folder}/${crypto_1.default.randomUUID()}-${cleanedFilename}`;
        // Build the upload URL (local endpoint for multipart/direct upload)
        const uploadUrl = `/api/v1/storage/upload/${fileKey}`;
        const fileUrl = `/uploads/${fileKey}`;
        logger_1.logger.info(`📁 Local upload path prepared for User: ${userId} -> Key: ${fileKey}`);
        return {
            uploadUrl,
            fileUrl,
            fileKey,
        };
    }
    /**
     * Save an uploaded file buffer to the local filesystem
     */
    async saveFile(fileKey, buffer) {
        const filePath = path_1.default.join(UPLOADS_ROOT, fileKey);
        const dir = path_1.default.dirname(filePath);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        fs_1.default.writeFileSync(filePath, buffer);
        logger_1.logger.info(`💾 File saved locally: ${fileKey}`);
        return `/uploads/${fileKey}`;
    }
    /**
     * Return local download path for a file
     */
    async getPresignedDownloadUrl(fileKey, _filename) {
        const filePath = path_1.default.join(UPLOADS_ROOT, fileKey);
        if (!fs_1.default.existsSync(filePath)) {
            throw app_error_1.AppError.notFound('File not found on server.');
        }
        return `/uploads/${fileKey}`;
    }
    /**
     * Delete a file from local storage
     */
    async deleteFile(fileKey) {
        const filePath = path_1.default.join(UPLOADS_ROOT, fileKey);
        try {
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
                logger_1.logger.info(`🗑️ Deleted local file: ${fileKey}`);
            }
        }
        catch (error) {
            logger_1.logger.error(`Failed to delete local file: ${fileKey}`, error);
            // We don't crash on background deletion issues
        }
    }
}
exports.StorageService = StorageService;
exports.default = StorageService;
//# sourceMappingURL=storage.service.js.map