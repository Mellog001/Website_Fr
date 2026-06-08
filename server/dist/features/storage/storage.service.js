"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const s3_1 = require("../../config/s3");
const env_1 = require("../../config/env");
const app_error_1 = require("../../common/errors/app-error");
const logger_1 = require("../../config/logger");
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
class StorageService {
    /**
     * Request a presigned URL to upload directly to S3
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
        const command = new client_s3_1.PutObjectCommand({
            Bucket: env_1.env.AWS_S3_BUCKET_NAME,
            Key: fileKey,
            ContentType: contentType,
        });
        try {
            // Presigned PUT URL expires in 15 minutes
            const uploadUrl = await (0, s3_request_presigner_1.getSignedUrl)(s3_1.s3Client, command, { expiresIn: 900 });
            // Formulate public download URL reference
            const host = env_1.env.AWS_S3_ENDPOINT ? env_1.env.AWS_S3_ENDPOINT : `https://${env_1.env.AWS_S3_BUCKET_NAME}.s3.${env_1.env.AWS_REGION}.amazonaws.com`;
            const fileUrl = env_1.env.AWS_S3_ENDPOINT
                ? `${host}/${env_1.env.AWS_S3_BUCKET_NAME}/${fileKey}`
                : `${host}/${fileKey}`;
            logger_1.logger.info(`📡 Presigned upload URL generated for User: ${userId} -> Key: ${fileKey}`);
            return {
                uploadUrl,
                fileUrl,
                fileKey,
            };
        }
        catch (error) {
            logger_1.logger.error('Failed S3 sign url request:', error);
            throw app_error_1.AppError.internal('Failed to generate secure upload credentials.');
        }
    }
    /**
     * Request a short-lived presigned GET URL for secured downloads
     */
    async getPresignedDownloadUrl(fileKey, filename) {
        const command = new client_s3_1.GetObjectCommand({
            Bucket: env_1.env.AWS_S3_BUCKET_NAME,
            Key: fileKey,
            ...(filename ? { ResponseContentDisposition: `attachment; filename="${filename}"` } : {}),
        });
        try {
            // Presigned GET URL expires in 30 minutes
            const downloadUrl = await (0, s3_request_presigner_1.getSignedUrl)(s3_1.s3Client, command, { expiresIn: 1800 });
            return downloadUrl;
        }
        catch (error) {
            logger_1.logger.error(`S3 download signature error for key: ${fileKey}`, error);
            throw app_error_1.AppError.internal('Failed to acquire secure resource download link.');
        }
    }
    /**
     * Delete an object directly from S3 bucket
     */
    async deleteFile(fileKey) {
        const command = new client_s3_1.DeleteObjectCommand({
            Bucket: env_1.env.AWS_S3_BUCKET_NAME,
            Key: fileKey,
        });
        try {
            await s3_1.s3Client.send(command);
            logger_1.logger.info(`🗑️ Deleted S3 resource: ${fileKey}`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to delete S3 file: ${fileKey}`, error);
            // We don't crash on background deletion issues
        }
    }
}
exports.StorageService = StorageService;
exports.default = StorageService;
//# sourceMappingURL=storage.service.js.map