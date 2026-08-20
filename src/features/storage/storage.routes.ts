import { Router } from 'express';
import multer from 'multer';
import { StorageController } from './storage.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { validate } from '../../common/middleware/validate';
import { getUploadUrlSchema } from './storage.validation';
import { checkMaterialAccess } from '../../common/middleware/material-access.middleware';

const router = Router();
const controller = new StorageController();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB max

// Generate upload info (validates file metadata, returns fileKey)
router.post('/upload', authenticate, validate(getUploadUrlSchema), controller.getUploadUrl);

// Direct file upload endpoint (binary upload via multipart)
router.put('/upload/*', authenticate, upload.single('file'), controller.uploadFile);

// Retrieve material file download (authenticated & enrolled students only)
router.get('/download/:materialId', authenticate, checkMaterialAccess, controller.downloadMaterial);

export default router;
