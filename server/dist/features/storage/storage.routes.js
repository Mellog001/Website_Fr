"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const storage_controller_1 = require("./storage.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const validate_1 = require("../../common/middleware/validate");
const storage_validation_1 = require("./storage.validation");
const material_access_middleware_1 = require("../../common/middleware/material-access.middleware");
const router = (0, express_1.Router)();
const controller = new storage_controller_1.StorageController();
// Generate PUT direct-upload signature (authenticated users)
router.post('/upload', auth_middleware_1.authenticate, (0, validate_1.validate)(storage_validation_1.getUploadUrlSchema), controller.getUploadUrl);
// Retrieve GET short-lived material download signature (authenticated & enrolled students only)
router.get('/download/:materialId', auth_middleware_1.authenticate, material_access_middleware_1.checkMaterialAccess, controller.downloadMaterial);
exports.default = router;
//# sourceMappingURL=storage.routes.js.map