import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { StorageService } from './storage.service';
import pool from '../../config/database';
import { AppError } from '../../common/errors/app-error';
import { RowDataPacket } from 'mysql2';

const storageService = new StorageService();

export class StorageController {
  /**
   * Get upload info (validates file metadata and returns the fileKey/fileUrl)
   */
  public getUploadUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { filename, contentType, folder } = req.body;
      const result = await storageService.getPresignedUploadUrl(
        req.user!.id,
        filename,
        contentType,
        folder
      );

      res.status(200).json({
        status: 'success',
        message: 'Upload info generated. Use PUT to /api/v1/storage/upload/:fileKey with the file binary.',
        data: result,
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
      const filePath = path.resolve(process.cwd(), 'uploads', material.file_key);
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
