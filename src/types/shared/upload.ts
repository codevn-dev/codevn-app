export interface UploadImageResponse {
  success: boolean;
  imageUrl: string;
  fileName: string;
  size: number;
  type: string;
}

import type { User } from './auth';

export interface UploadAvatarResponse {
  success: boolean;
  avatar: string;
  user?: User;
}
