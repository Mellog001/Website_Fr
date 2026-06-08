"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StorageController = void 0;
const storage_service_1 = require("./storage.service");
const prisma_1 = require("../../config/prisma");
const app_error_1 = require("../../common/errors/app-error");
const storageService = new storage_service_1.StorageService();
class StorageController {
    /**
     * Request a PUT presigned upload URL
     */
    getUploadUrl = async (req, res, next) => {
        try {
            const { filename, contentType, folder } = req.body;
            const result = await storageService.getPresignedUploadUrl(req.user.id, filename, contentType, folder);
            res.status(200).json({
                status: 'success',
                message: 'Presigned upload URL generated successfully. Use PUT to upload binary.',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    };
    /**
     * Fetch a short-lived download link for a course material (Gated via access middleware)
     */
    downloadMaterial = async (req, res, next) => {
        const { materialId } = req.params;
        try {
            const material = await prisma_1.prisma.material.findUnique({
                where: { id: materialId },
            });
            if (!material) {
                throw app_error_1.AppError.notFound('Course material resource not found.');
            }
            // Appending file name for a clean download title
            const downloadUrl = await storageService.getPresignedDownloadUrl(material.fileKey, material.title);
            res.status(200).json({
                status: 'success',
                data: {
                    downloadUrl,
                },
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