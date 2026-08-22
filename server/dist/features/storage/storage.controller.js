"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageController = void 0;
const path_1 = __importDefault(require("path"));
const storage_service_1 = require("./storage.service");
const database_1 = __importDefault(require("../../config/database"));
const app_error_1 = require("../../common/errors/app-error");
const storageService = new storage_service_1.StorageService();
class StorageController {
    /**
     * Get upload info (validates file metadata and returns the fileKey/fileUrl)
     */
    getUploadUrl = async (req, res, next) => {
        try {
            const { filename, contentType, folder } = req.body;
            const result = await storageService.getPresignedUploadUrl(req.user.id, filename, contentType, folder);
            res.status(200).json({
                status: 'success',
                message: 'Upload info generated. Use PUT to /api/v1/storage/upload/:fileKey with the file binary.',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * Handle direct file upload (PUT binary to local storage)
     */
    uploadFile = async (req, res, next) => {
        try {
            if (!req.file) {
                throw app_error_1.AppError.badRequest('No file provided in request.');
            }
            const fileKey = req.params[0]; // Captures the full path after /upload/
            const fileUrl = await storageService.saveFile(fileKey, req.file.buffer);
            res.status(200).json({
                status: 'success',
                message: 'File uploaded successfully.',
                data: {
                    fileUrl,
                    fileKey,
                    size: req.file.size,
                },
            });
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * Serve a course material file for download (Gated via access middleware)
     */
    downloadMaterial = async (req, res, next) => {
        const { materialId } = req.params;
        try {
            const [rows] = await database_1.default.execute('SELECT id, title, file_key FROM materials WHERE id = ?', [materialId]);
            const material = rows[0];
            if (!material) {
                throw app_error_1.AppError.notFound('Course material resource not found.');
            }
            // Resolve full file path and send as download
            const filePath = path_1.default.resolve(process.cwd(), 'uploads', material.file_key);
            res.download(filePath, material.title, (err) => {
                if (err) {
                    next(app_error_1.AppError.notFound('File not found on server.'));
                }
            });
        }
        catch (error) {
            next(error);
        }
    };
}
exports.StorageController = StorageController;
exports.default = StorageController;
//# sourceMappingURL=storage.controller.js.map