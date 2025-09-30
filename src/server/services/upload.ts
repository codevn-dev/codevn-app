import { fileUpload } from '@/lib/server';
import { BaseService } from './base';
import { UploadImageResponse } from '@/types/shared';
import { CommonError } from '@/types/shared';

export class UploadService extends BaseService {
  /**
   * Upload image
   */
  async uploadImage(fileData: any): Promise<UploadImageResponse> {
    try {
      if (!fileData) {
        throw new Error(CommonError.BAD_REQUEST);
      }

      // Upload image using utils
      const uploadResult = await fileUpload.uploadImage(fileData, 'images');

      const response: UploadImageResponse = {
        imageUrl: uploadResult.publicPath,
        fileName: uploadResult.originalName,
        size: uploadResult.size,
        type: uploadResult.type,
      };
      return response;
    } catch (error) {
      this.handleError(error, 'Upload image');
    }
  }
}

// Export singleton instance
export const uploadService = new UploadService();
