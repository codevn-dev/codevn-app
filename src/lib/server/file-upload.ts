import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface FileUploadResult {
  success: boolean;
  filePath: string;
  publicPath: string;
  fileName: string;
  originalName: string;
  size: number;
  type: string;
}

export interface FileValidationOptions {
  allowedTypes?: string[];
  maxSize?: number; // in bytes
  allowedExtensions?: string[];
}

export class FileUploadUtils {
  private defaultValidationOptions: FileValidationOptions = {
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    maxSize: 5 * 1024 * 1024, // 5MB
  };

  async uploadImage(
    file: any, // Fastify multipart file object
    uploadDir: 'avatars' | 'images' = 'images',
    validationOptions?: FileValidationOptions
  ): Promise<FileUploadResult> {
    const options = { ...this.defaultValidationOptions, ...validationOptions };

    // Extract file properties from Fastify multipart
    const fileType = file.mimetype;
    const fileSize = file.file?.bytesRead || 0;
    const fileName = file.filename;
    const fileExtension = fileName.split('.').pop()?.toLowerCase();

    // Validate file type
    if (options.allowedTypes && !options.allowedTypes.includes(fileType)) {
      throw new Error(`Invalid file type. Allowed types: ${options.allowedTypes.join(', ')}`);
    }

    // Validate file size
    if (options.maxSize && fileSize > options.maxSize) {
      throw new Error(
        `File too large. Maximum size is ${Math.round(options.maxSize / (1024 * 1024))}MB`
      );
    }

    // Validate file extension
    if (
      options.allowedExtensions &&
      fileExtension &&
      !options.allowedExtensions.includes(fileExtension)
    ) {
      throw new Error(
        `Invalid file extension. Allowed extensions: ${options.allowedExtensions.join(', ')}`
      );
    }

    // Convert file to buffer
    const buffer = await file.toBuffer();

    // Generate unique filename
    const uniqueFileName = `${uuidv4()}.${fileExtension}`;

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', uploadDir);
    await mkdir(uploadsDir, { recursive: true });

    // Save file
    const filePath = join(uploadsDir, uniqueFileName);
    await writeFile(filePath, buffer);

    // Return the public URL
    const publicPath = `/uploads/${uploadDir}/${uniqueFileName}`;

    return {
      success: true,
      filePath,
      publicPath,
      fileName: uniqueFileName,
      originalName: fileName,
      size: fileSize,
      type: fileType,
    };
  }

  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const fullPath = join(process.cwd(), 'public', filePath);
      await unlink(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async deleteAvatar(avatarPath: string): Promise<boolean> {
    if (!avatarPath) return true;

    // Remove leading slash if present
    const cleanPath = avatarPath.startsWith('/') ? avatarPath.slice(1) : avatarPath;
    return this.deleteFile(cleanPath);
  }

  async deleteImage(imagePath: string): Promise<boolean> {
    if (!imagePath) return true;

    // Remove leading slash if present
    const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
    return this.deleteFile(cleanPath);
  }

  validateImageFile(
    file: any, // Fastify multipart file object
    options?: FileValidationOptions
  ): { valid: boolean; error?: string } {
    const validationOptions = { ...this.defaultValidationOptions, ...options };

    // Extract file properties from Fastify multipart
    const fileType = file.mimetype;
    const fileSize = file.file?.bytesRead || 0;
    const fileName = file.filename;
    const fileExtension = fileName.split('.').pop()?.toLowerCase();

    // Validate file type
    if (validationOptions.allowedTypes && !validationOptions.allowedTypes.includes(fileType)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed types: ${validationOptions.allowedTypes.join(', ')}`,
      };
    }

    // Validate file size
    if (validationOptions.maxSize && fileSize > validationOptions.maxSize) {
      return {
        valid: false,
        error: `File too large. Maximum size is ${Math.round(validationOptions.maxSize / (1024 * 1024))}MB`,
      };
    }

    // Validate file extension
    if (
      validationOptions.allowedExtensions &&
      fileExtension &&
      !validationOptions.allowedExtensions.includes(fileExtension)
    ) {
      return {
        valid: false,
        error: `Invalid file extension. Allowed extensions: ${validationOptions.allowedExtensions.join(', ')}`,
      };
    }

    return { valid: true };
  }
}

export const fileUpload = new FileUploadUtils();
