"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const storage_controller_1 = require("./storage.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const validate_1 = require("../../common/middleware/validate");
const storage_validation_1 = require("./storage.validation");
const material_access_middleware_1 = require("../../common/middleware/material-access.middleware");
const router = (0, express_1.Router)();
const controller = new storage_controller_1.StorageController();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB max
// Generate upload info (validates file metadata, returns fileKey)
router.post('/upload', auth_middleware_1.authenticate, (0, validate_1.validate)(storage_validation_1.getUploadUrlSchema), controller.getUploadUrl);
// Direct file upload endpoint (binary upload via multipart)
router.put('/upload/*', auth_middleware_1.authenticate, upload.single('file'), controller.uploadFile);
// Retrieve material file download (authenticated & enrolled students only)
router.get('/download/:materialId', auth_middleware_1.authenticate, material_access_middleware_1.checkMaterialAccess, controller.downloadMaterial);
exports.default = router;
//# sourceMappingURL=storage.routes.js.map