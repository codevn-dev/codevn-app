export interface UploadImageResponse {
  imageUrl: string; // Cloudflare transform URL by default
  fileName: string;
  size: number;
  type: string;
}

import type { User } from './auth';

export interface UploadAvatarResponse {
  avatar: string;
  user?: User;
}
