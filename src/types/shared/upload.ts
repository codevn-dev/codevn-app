export interface UploadImageResponse {
  imageUrl: string;
  fileName: string;
  size: number;
  type: string;
}

import type { User } from './auth';

export interface UploadAvatarResponse {
  avatar: string;
  user?: User;
}
