import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  quality?: number;
  initialQuality?: number;
  alwaysKeepResolution?: boolean;
  exifOrientation?: number;
  fileType?: string;
  preserveExif?: boolean;
}

export interface CompressionSettings {
  enabled: boolean;
  quality: number;
  maxSizeMB: number;
  maxWidthOrHeight: number;
  fileType: 'image/jpeg' | 'image/png' | 'image/webp';
}

export interface CompressionResult {
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  quality: number;
}

export class ImageCompressionUtils {
  private defaultOptions: CompressionOptions = {
    maxSizeMB: 1, // Reduce from 5MB to 1MB
    maxWidthOrHeight: 1920, // Maximum size limit
    useWebWorker: true,
    quality: 0.8, // 80% quality
    initialQuality: 0.8,
    alwaysKeepResolution: false,
    fileType: 'image/jpeg', // Convert to JPEG for optimization
    preserveExif: false,
  };

  private customSettings: CompressionSettings | null = null;

  /**
   * Compress image with custom options
   */
  async compressImage(
    file: File,
    options?: Partial<CompressionOptions>
  ): Promise<CompressionResult> {
    const compressionOptions = { ...this.defaultOptions, ...options };

    try {
      const compressedFile = await imageCompression(file, compressionOptions);

      const originalSize = file.size;
      const compressedSize = compressedFile.size;
      const compressionRatio = Math.round((1 - compressedSize / originalSize) * 100);

      return {
        compressedFile,
        originalSize,
        compressedSize,
        compressionRatio,
        quality: compressionOptions.quality || 0.8,
      };
    } catch (error) {
      console.error('Error compressing image:', error);
      throw new Error('Failed to compress image');
    }
  }

  /**
   * Compress image for avatar (smaller size)
   */
  async compressForAvatar(file: File): Promise<CompressionResult> {
    return this.compressImage(file, {
      maxSizeMB: 0.5, // 500KB for avatar
      maxWidthOrHeight: 300, // Small avatar size
      quality: 0.5, // Higher quality for avatar
      fileType: 'image/jpeg',
    });
  }

  /**
   * Compress image for articles (medium size)
   */
  async compressForArticle(file: File): Promise<CompressionResult> {
    return this.compressImage(file, {
      maxSizeMB: 1, // 1MB for article images
      maxWidthOrHeight: 1920, // Full HD
      quality: 0.8,
      fileType: 'image/jpeg',
    });
  }

  /**
   * Compress image with high quality (for important images)
   */
  async compressHighQuality(file: File): Promise<CompressionResult> {
    return this.compressImage(file, {
      maxSizeMB: 2, // 2MB for high quality images
      maxWidthOrHeight: 2560, // 2K resolution
      quality: 0.9,
      fileType: 'image/jpeg',
    });
  }

  /**
   * Check if file needs compression
   */
  shouldCompress(file: File, maxSizeMB: number = 1): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size > maxSizeBytes;
  }

  /**
   * Get file information before compression
   */
  getFileInfo(file: File): {
    name: string;
    size: number;
    type: string;
    lastModified: number;
  } {
    return {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
    };
  }

  /**
   * Format file size to readable string
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Set custom compression settings
   */
  setCustomSettings(settings: CompressionSettings): void {
    this.customSettings = settings;
  }

  /**
   * Get current custom settings
   */
  getCustomSettings(): CompressionSettings | null {
    return this.customSettings;
  }

  /**
   * Clear custom settings (use defaults)
   */
  clearCustomSettings(): void {
    this.customSettings = null;
  }

  /**
   * Compress image with custom settings
   */
  async compressWithCustomSettings(file: File): Promise<CompressionResult> {
    if (!this.customSettings || !this.customSettings.enabled) {
      return this.compressImage(file);
    }

    const options: CompressionOptions = {
      maxSizeMB: this.customSettings.maxSizeMB,
      maxWidthOrHeight: this.customSettings.maxWidthOrHeight,
      quality: this.customSettings.quality,
      fileType: this.customSettings.fileType,
      useWebWorker: true,
      preserveExif: false,
    };

    return this.compressImage(file, options);
  }

  /**
   * Check if compression should be applied with custom settings
   */
  shouldCompressWithCustomSettings(file: File): boolean {
    if (!this.customSettings || !this.customSettings.enabled) {
      return this.shouldCompress(file);
    }

    return file.size > this.customSettings.maxSizeMB * 1024 * 1024;
  }
}

export const imageCompressionUtils = new ImageCompressionUtils();
