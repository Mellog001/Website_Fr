import path from 'path';
import fs from 'fs';
import { Request, Response, NextFunction } from 'express';
import { StorageService } from './storage.service';
import pool from '../../config/database';
import { AppError } from '../../common/errors/app-error';
import { logger } from '../../config/logger';
import { RowDataPacket } from 'mysql2';

const storageService = new StorageService();
const UPLOADS_ROOT = path.resolve(process.cwd(), 'uploads');

function resolveSafeUploadPath(fileKey: string): string {
  const resolved = path.resolve(UPLOADS_ROOT, fileKey);
  if (resolved !== UPLOADS_ROOT && !resolved.startsWith(UPLOADS_ROOT + path.sep)) {
    throw AppError.badRequest('Invalid file key.');
  }
  return resolved;
}

export class StorageController {
  /**
   * Get upload info (validates file metadata and returns the fileKey/fileUrl)
   */
  public getUploadUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (req.user && req.user.role === 'STUDENT') {
        throw AppError.forbidden('Students are not permitted to upload files.');
      }
      const { fileName, fileType, fileSize, type, mimeType } = req.body;
      
      // Validate required fields
      if (!fileName) {
        throw AppError.badRequest('File name is required');
      }
      
      // Determine folder based on type
      const folder = req.body.folder || req.body.type || 'courses';
      
      // Generate a unique file key
      const timestamp = Date.now();
      const random = Math.round(Math.random() * 1E9);
      const extension = path.extname(fileName);
      const baseName = path.basename(fileName, extension);
      const fileKey = `${folder}/${baseName}-${timestamp}-${random}${extension}`;
      
      // Construct the upload URL (this is the endpoint that will receive the file)
      const uploadUrl = `${req.protocol}://${req.get('host')}/api/v1/storage/upload/${fileKey}`;
      
      // Construct the final file URL (where the file will be accessible)
      const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${fileKey}`;
      
      logger.info(`📁 Generated upload URL for: ${fileKey}`);
      
      res.status(200).json({
        status: 'success',
        message: 'Upload info generated. Use PUT to /api/v1/storage/upload/:fileKey with the file binary.',
        data: {
          fileKey: fileKey,
          uploadUrl: uploadUrl,
          fileUrl: fileUrl,
          folder: folder,
          fileName: fileName
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Handle direct file upload (PUT binary to local storage)
   */
  public uploadFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        throw AppError.badRequest('No file provided in request.');
      }

      // Get the file key from the URL path
      const fileKey = req.params[0]; // Captures the full path after /upload/
      
      if (!fileKey) {
        throw AppError.badRequest('File key is required');
      }

      // Save the file using the storage service
      const fileUrl = await storageService.saveFile(fileKey, req.file.buffer);

      logger.info(`📁 File uploaded successfully: ${fileKey} (${req.file.size} bytes)`);

      res.status(200).json({
        status: 'success',
        message: 'File uploaded successfully.',
        data: {
          fileUrl: fileUrl,
          fileKey: fileKey,
          size: req.file.size,
          mimetype: req.file.mimetype,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get a file by its key (public access)
   */
  public getFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fileKey } = req.params;
      
      if (!fileKey) {
        throw AppError.badRequest('File key is required');
      }

      // Construct the file path
      const filePath = resolveSafeUploadPath(fileKey);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw AppError.notFound('File not found');
      }

      // Determine content type based on file extension
      const ext = path.extname(fileKey).toLowerCase();
      let contentType = 'application/octet-stream';
      
      if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.gif') contentType = 'image/gif';
      else if (ext === '.webp') contentType = 'image/webp';
      else if (ext === '.pdf') contentType = 'application/pdf';
      else if (ext === '.mp4') contentType = 'video/mp4';
      
      res.setHeader('Content-Type', contentType);
      res.sendFile(filePath);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete a file (authenticated users only)
   */
  public deleteFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fileKey } = req.params;
      
      if (!fileKey) {
        throw AppError.badRequest('File key is required');
      }

      // Construct the file path
      const filePath = resolveSafeUploadPath(fileKey);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw AppError.notFound('File not found');
      }

      // Delete the file
      fs.unlinkSync(filePath);
      
      logger.info(`🗑️ File deleted: ${fileKey}`);
      
      res.status(200).json({
        status: 'success',
        message: 'File deleted successfully',
        data: { fileKey }
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Serve a course material file for download (Gated via access middleware)
   */
  public downloadMaterial = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { materialId } = req.params;

    try {
      const [rows] = await pool.execute<RowDataPacket[]>(
        'SELECT id, title, file_key FROM materials WHERE id = ?',
        [materialId]
      );

      const material = rows[0];

      if (!material) {
        throw AppError.notFound('Course material resource not found.');
      }

      // Resolve full file path and send as download
      const filePath = resolveSafeUploadPath(material.file_key);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        throw AppError.notFound('File not found on server.');
      }
      
      res.download(filePath, material.title, (err) => {
        if (err) {
          next(AppError.notFound('File not found on server.'));
        }
      });
    } catch (error) {
      next(error);
    }
  };
}

export default StorageController;