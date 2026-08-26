import { Router } from 'express';
import multer from 'multer';
import { StorageController } from './storage.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { validate } from '../../common/middleware/validate';
import { getUploadUrlSchema } from './storage.validation';
import { checkMaterialAccess } from '../../common/middleware/material-access.middleware';

const router = Router();
const controller = new StorageController();

// Configure multer for memory storage (file in memory, then saved to disk)
const upload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB max
});

// Generate upload info (validates file metadata, returns fileKey and uploadUrl)
router.post('/upload', authenticate, validate(getUploadUrlSchema), controller.getUploadUrl);

// Direct file upload endpoint (binary upload via multipart)
// The wildcard captures the file key from the URL
router.put('/upload/*', authenticate, upload.single('file'), controller.uploadFile);

// Get file URL (for retrieving uploaded files)
router.get('/file/:fileKey', controller.getFile);

// Delete file (authenticated users only)
router.delete('/file/:fileKey', authenticate, controller.deleteFile);

// Retrieve material file download (authenticated & enrolled students only)
router.get('/download/:materialId', authenticate, checkMaterialAccess, controller.downloadMaterial);

export default router;