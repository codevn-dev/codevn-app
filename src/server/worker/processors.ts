/**
 * Job Processors
 * Contains all job processing logic
 */

import { logger } from '@/lib/utils/logger';
import { messageRepository } from '../database/repository/messages';
import { userRepository } from '../database/repository';
import { chatWebSocketService } from '../websocket/chat';
import { Job, SystemSendMessageJobData, SystemSendBatchMessageJobData, JOB_NAMES } from './types';
import { getWorkerService } from './index';

/**
 * System user send message processor (handles bulk and individual messages)
 */
export const systemSendMessageProcessor = {
  name: JOB_NAMES.SYSTEM_SEND_MESSAGE,
  process: async (job: Job<SystemSendMessageJobData>) => {
    const { systemUserId, toUserIds, text, isSendAll } = job.data || {};

    if (!systemUserId || !text) {
      throw new Error('Missing required fields: systemUserId, text');
    }

    if (!isSendAll && (!toUserIds || !Array.isArray(toUserIds) || toUserIds.length === 0)) {
      throw new Error('Missing required fields: toUserIds (when not sending to all)');
    }

    let enqueued = 0;
    const batchSize = 100; // each small job handles ~100 users

    if (isSendAll) {
      // Fan-out by paging through users and enqueue batch jobs
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const { users, pagination } = await userRepository.findManyWithPagination({
          search: '',
          sortBy: 'createdAt',
          sortOrder: 'asc',
          page,
          limit: batchSize,
        });

        if (!users || users.length === 0) {
          hasMore = false;
          break;
        }

        // Filter out system users
        const nonSystemUsers = users.filter((u) => (u as any).role !== 'system');

        if (nonSystemUsers.length > 0) {
          // Enqueue one batch job for this group of users
          const worker = getWorkerService();
          await worker.addJob(JOB_NAMES.SYSTEM_SEND_BATCH_MESSAGE, {
            systemUserId,
            toUserIds: nonSystemUsers.map((u) => u.id),
            text,
          });
          enqueued++;
        }

        hasMore = page < (pagination?.totalPages || page);
        page++;
      }
    } else {
      // Specific recipients: split into batches of 100
      for (let i = 0; i < (toUserIds?.length || 0); i += batchSize) {
        const batch = toUserIds?.slice(i, i + batchSize) || [];
        const worker = getWorkerService();
        await worker.addJob(JOB_NAMES.SYSTEM_SEND_BATCH_MESSAGE, {
          systemUserId,
          toUserIds: batch,
          text,
        });
        enqueued++;
      }
    }

    logger.info(`Enqueued ${enqueued} batch jobs for system user ${systemUserId}`);
    return { enqueued };
  },
};

/**
 * System user send batch message processor (handles ~100 users per job)
 */
export const systemSendBatchMessageProcessor = {
  name: JOB_NAMES.SYSTEM_SEND_BATCH_MESSAGE,
  process: async (job: Job<SystemSendBatchMessageJobData>) => {
    const { systemUserId, toUserIds, text } = job.data || {};

    if (
      !systemUserId ||
      !toUserIds ||
      !Array.isArray(toUserIds) ||
      toUserIds.length === 0 ||
      !text
    ) {
      throw new Error('Missing required fields: systemUserId, toUserIds, text');
    }

    const results = [];
    const errors = [];

    // Process each recipient in this batch
    for (const toUserId of toUserIds) {
      try {
        // Prepare conversation and persist message
        const conversationId = await messageRepository.getConversationId(systemUserId, toUserId);

        const savedMessage = await messageRepository.createMessageOnly({
          conversationId,
          fromUserId: systemUserId,
          toUserId,
          text: String(text).slice(0, 4000),
          type: 'message',
        });

        const messageData = {
          id: savedMessage.id,
          type: savedMessage.type,
          chat: { id: savedMessage.conversationId },
          fromUser: { id: savedMessage.fromUserId },
          toUser: { id: toUserId },
          text: savedMessage.text,
          seen: savedMessage.seen,
          seenAt: savedMessage.seenAt,
          timestamp: savedMessage.createdAt.getTime(),
          createdAt: savedMessage.createdAt,
        };

        // Deliver via websocket service (local and cross-instance)
        await chatWebSocketService.deliverNewMessage(messageData as any);

        results.push({ toUserId, messageId: savedMessage.id, success: true });
      } catch (error) {
        logger.error(`Failed to send message to user ${toUserId}:`, undefined, error as Error);
        errors.push({ toUserId, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }

    logger.info(
      `Batch job completed: ${results.length} successful, ${errors.length} failed for ${toUserIds.length} users`
    );

    return {
      totalRecipients: toUserIds.length,
      successful: results.length,
      failed: errors.length,
      results: results.slice(0, 50), // Only return first 50 results to avoid huge response
      errors: errors.length > 0 ? errors.slice(0, 50) : undefined, // Only return first 50 errors
    };
  },
};

// Export all processors
export const processors = [systemSendMessageProcessor, systemSendBatchMessageProcessor];
