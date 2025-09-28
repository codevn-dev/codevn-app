import { userRepository } from '../database/repository';
import { BaseService } from './base';
import {
  CreateSystemUserRequest,
  UpdateSystemUserRequest,
  SystemUserResponse,
} from '@/types/shared/auth';
import { CommonError, RoleLevel } from '@/types/shared';
import { UploadAvatarResponse } from '@/types/shared';
import { fileUpload } from '@/lib/server';
import { getWorkerService } from '../worker';
import { JOB_NAMES } from '../worker/types';
import crypto from 'crypto';

export class SystemUsersService extends BaseService {
  /**
   * Create a new system user
   */
  async createSystemUser(body: CreateSystemUserRequest): Promise<SystemUserResponse> {
    try {
      const { name, email, avatar } = body;

      if (!name || name.trim().length === 0) {
        throw new Error(CommonError.BAD_REQUEST);
      }

      if (!email || email.trim().length === 0) {
        throw new Error(CommonError.BAD_REQUEST);
      }

      // Generate a random password for system user (they still can't login due to auth logic)
      const randomPassword = crypto.randomBytes(32).toString('hex');

      // Create system user (email required for future email features, random password but can't login)
      const newUser = await userRepository.create({
        name: name.trim(),
        email: email.trim(),
        password: randomPassword, // Random password but system users can't login
        role: RoleLevel.system,
        avatar: avatar || null,
      });

      const response: SystemUserResponse = {
        id: newUser[0].id,
        name: newUser[0].name,
        email: newUser[0].email,
        avatar: newUser[0].avatar || undefined,
        role: newUser[0].role,
        createdAt: newUser[0].createdAt.toISOString(),
      };

      return response;
    } catch (error) {
      this.handleError(error, 'Create system user');
    }
  }

  /**
   * Get all system users
   */
  async getSystemUsers(): Promise<SystemUserResponse[]> {
    try {
      const systemUsers = await userRepository.findByRole(RoleLevel.system);

      return systemUsers.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || undefined,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      }));
    } catch (error) {
      this.handleError(error, 'Get system users');
    }
  }

  /**
   * Update a system user
   */
  async updateSystemUser(
    userId: string,
    body: UpdateSystemUserRequest
  ): Promise<SystemUserResponse> {
    try {
      const { name, email, avatar } = body;

      // Verify the user exists and is a system user
      const existingUser = await userRepository.findById(userId);
      if (!existingUser) {
        throw new Error(CommonError.NOT_FOUND);
      }

      if (existingUser.role !== RoleLevel.system) {
        throw new Error(CommonError.BAD_REQUEST);
      }

      // Prepare update data
      const updateData: any = {};
      if (name !== undefined) {
        if (!name || name.trim().length === 0) {
          throw new Error(CommonError.BAD_REQUEST);
        }
        updateData.name = name.trim();
      }
      if (email !== undefined) {
        if (!email || email.trim().length === 0) {
          throw new Error(CommonError.BAD_REQUEST);
        }
        updateData.email = email.trim();
      }
      if (avatar !== undefined) {
        updateData.avatar = avatar || null;
      }

      // Update the user
      const updatedUser = await userRepository.update(userId, updateData);

      const response: SystemUserResponse = {
        id: updatedUser[0].id,
        name: updatedUser[0].name,
        email: updatedUser[0].email,
        avatar: updatedUser[0].avatar || undefined,
        role: updatedUser[0].role,
        createdAt: updatedUser[0].createdAt.toISOString(),
      };

      return response;
    } catch (error) {
      this.handleError(error, 'Update system user');
    }
  }

  /**
   * Delete a system user
   */
  async deleteSystemUser(userId: string): Promise<{ message: string }> {
    try {
      // Verify the user exists and is a system user
      const existingUser = await userRepository.findById(userId);
      if (!existingUser) {
        throw new Error(CommonError.NOT_FOUND);
      }

      if (existingUser.role !== RoleLevel.system) {
        throw new Error(CommonError.BAD_REQUEST);
      }

      // Soft delete the user
      await userRepository.delete(userId);

      return { message: 'System user deleted successfully' };
    } catch (error) {
      this.handleError(error, 'Delete system user');
    }
  }

  /**
   * Upload avatar for a system user
   */
  async uploadSystemUserAvatar(userId: string, fileData: any): Promise<UploadAvatarResponse> {
    try {
      if (!fileData) {
        throw new Error(CommonError.BAD_REQUEST);
      }

      // Verify the user exists and is a system user
      const existingUser = await userRepository.findById(userId);
      if (!existingUser) {
        throw new Error(CommonError.NOT_FOUND);
      }

      if (existingUser.role !== RoleLevel.system) {
        throw new Error(CommonError.BAD_REQUEST);
      }

      // Upload avatar using utils
      const uploadResult = await fileUpload.uploadImage(fileData, 'avatars');

      // Update user's avatar in database
      const updatedUser = await userRepository.update(userId, {
        avatar: uploadResult.publicPath,
      });

      const updatedUserData = {
        id: updatedUser[0].id,
        email: updatedUser[0].email,
        name: updatedUser[0].name,
        avatar: uploadResult.publicPath,
        role: updatedUser[0].role,
        createdAt: updatedUser[0].createdAt.toISOString(),
      };

      const response: UploadAvatarResponse = {
        success: true,
        avatar: uploadResult.publicPath,
        user: updatedUserData as any,
      };
      return response;
    } catch (error) {
      this.handleError(error, 'Upload system user avatar');
    }
  }

  /**
   * Send a message from a system user to one or more users
   */
  async sendMessage(request: {
    systemUserId: string;
    toUserIds?: string[];
    text: string;
    isSendAll?: boolean;
  }): Promise<{
    ok: boolean;
    jobId: string;
    recipientsCount: string | number;
  }> {
    const { systemUserId, toUserIds, text, isSendAll } = request;

    // Validate required fields
    if (!systemUserId || !text || text.trim().length === 0) {
      throw new Error(CommonError.BAD_REQUEST);
    }

    // Validate based on send mode
    if (isSendAll) {
      // Send to all users - no need to validate toUserIds
    } else {
      // Send to specific users - validate toUserIds
      if (!toUserIds || !Array.isArray(toUserIds) || toUserIds.length === 0) {
        throw new Error(CommonError.BAD_REQUEST);
      }
    }

    try {
      // Get worker service and enqueue single bulk job
      const worker = getWorkerService();
      const job = await worker.addJob(JOB_NAMES.SYSTEM_SEND_MESSAGE, {
        systemUserId,
        toUserIds: isSendAll ? [] : toUserIds,
        text,
        isSendAll: isSendAll || false,
      });

      return {
        ok: true,
        jobId: job.id,
        recipientsCount: isSendAll ? 'all' : toUserIds?.length || 0,
      };
    } catch {
      throw new Error(CommonError.INTERNAL_ERROR);
    }
  }
}

export const systemUsersService = new SystemUsersService();
