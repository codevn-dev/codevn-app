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
    file: File,
    uploadDir: 'avatars' | 'images' = 'images',
    validationOptions?: FileValidationOptions
  ): Promise<FileUploadResult> {
    const options = { ...this.defaultValidationOptions, ...validationOptions };

    // Validate file type
    if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
      throw new Error(`Invalid file type. Allowed types: ${options.allowedTypes.join(', ')}`);
    }

    // Validate file size
    if (options.maxSize && file.size > options.maxSize) {
      throw new Error(
        `File too large. Maximum size is ${Math.round(options.maxSize / (1024 * 1024))}MB`
      );
    }

    // Validate file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
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
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const fileName = `${uuidv4()}.${fileExtension}`;

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads', uploadDir);
    await mkdir(uploadsDir, { recursive: true });

    // Save file
    const filePath = join(uploadsDir, fileName);
    await writeFile(filePath, buffer);

    // Return the public URL
    const publicPath = `/uploads/${uploadDir}/${fileName}`;

    return {
      success: true,
      filePath,
      publicPath,
      fileName,
      originalName: file.name,
      size: file.size,
      type: file.type,
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
    file: File,
    options?: FileValidationOptions
  ): { valid: boolean; error?: string } {
    const validationOptions = { ...this.defaultValidationOptions, ...options };

    // Validate file type
    if (validationOptions.allowedTypes && !validationOptions.allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `Invalid file type. Allowed types: ${validationOptions.allowedTypes.join(', ')}`,
      };
    }

    // Validate file size
    if (validationOptions.maxSize && file.size > validationOptions.maxSize) {
      return {
        valid: false,
        error: `File too large. Maximum size is ${Math.round(validationOptions.maxSize / (1024 * 1024))}MB`,
      };
    }

    // Validate file extension
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
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
