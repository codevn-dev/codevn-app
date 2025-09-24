import { commentRepository, reactionsRepository, userRepository } from '../database/repository';
import { BaseService } from './base';
import { UpdateCommentRequest, Comment } from '@/types/shared/comment';
import { SuccessResponse } from '@/types/shared/common';

export class CommentsService extends BaseService {
  /**
   * Transform comment data to include author information
   */
  private transformCommentData(comment: any): any {
    const { authorId, ...commentWithoutFlatFields } = comment;
    return {
      ...commentWithoutFlatFields,
      author: {
        id: comment.author?.id || authorId,
        name: comment.author?.name || 'Unknown',
        avatar: comment.author?.avatar || null,
      },
    };
  }

  /**
   * Get a specific comment
   */
  async getComment(commentId: string): Promise<Comment> {
    try {
      const comment = await commentRepository.findById(commentId);
      if (!comment) {
        throw new Error('Comment not found');
      }

      return this.transformCommentData(comment) as Comment;
    } catch (error) {
      this.handleError(error, 'Get comment');
    }
  }

  /**
   * Update a comment
   */
  async updateComment(
    commentId: string,
    body: UpdateCommentRequest,
    userId: string
  ): Promise<Comment> {
    try {
      const { content } = body;

      if (!content || content.trim().length === 0) {
        throw new Error('Comment content is required');
      }

      if (content.length > 1000) {
        throw new Error('Comment is too long (max 1000 characters)');
      }

      // Check if comment exists and user is the author
      const existingComment = await commentRepository.findById(commentId);
      if (!existingComment) {
        throw new Error('Comment not found');
      }

      this.validateOwnership({ id: userId, role: 'user' }, existingComment.authorId);

      await commentRepository.update(commentId, content.trim());

      // Fetch the updated comment with relations
      const comment = await commentRepository.findById(commentId);
      if (!comment) {
        throw new Error('Failed to retrieve updated comment');
      }

      return this.transformCommentData(comment) as Comment;
    } catch (error) {
      this.handleError(error, 'Update comment');
    }
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string, userId: string): Promise<SuccessResponse> {
    try {
      // Check if comment exists and user is the author or admin
      const existingComment = await commentRepository.findById(commentId);
      if (!existingComment) {
        throw new Error('Comment not found');
      }

      const isAuthor = existingComment.authorId === userId;
      if (!isAuthor) {
        const user = await userRepository.findById(userId);
        const isAdmin = user?.role === 'admin';
        if (!isAdmin) {
          throw new Error('You can only delete your own comments');
        }
      }

      await commentRepository.delete(commentId);
      return { success: true };
    } catch (error) {
      this.handleError(error, 'Delete comment');
    }
  }

  /**
   * Handle comment reaction (like/dislike)
   */
  async handleCommentReaction(commentId: string, userId: string, action: string): Promise<any> {
    try {
      if (!action || !['like', 'unlike', 'dislike'].includes(action)) {
        throw new Error('Invalid reaction action. Must be "like", "unlike", or "dislike"');
      }

      // Normalize 'dislike' to 'unlike' for database compatibility
      const normalizedType = (action === 'dislike' ? 'unlike' : action) as 'like' | 'unlike';

      // Check if comment exists
      const comment = await commentRepository.findById(commentId);
      if (!comment) {
        throw new Error('Comment not found');
      }

      // Check if user already reacted to this comment with the same type
      const existingReaction = await reactionsRepository.findByUserAndComment(
        userId,
        commentId,
        normalizedType
      );

      if (existingReaction) {
        // User already has this reaction, remove it
        await reactionsRepository.deleteCommentReaction(userId, commentId, normalizedType);
        return {
          success: true,
          action: 'removed',
          reaction: null,
        };
      } else {
        // Check if user has the opposite reaction
        const oppositeType = normalizedType === 'like' ? 'unlike' : 'like';
        const oppositeReaction = await reactionsRepository.findByUserAndComment(
          userId,
          commentId,
          oppositeType
        );

        if (oppositeReaction) {
          // User has opposite reaction, remove it and create new one
          await reactionsRepository.deleteCommentReaction(userId, commentId, oppositeType);
        }

        // Create new reaction
        await reactionsRepository.createCommentReaction(userId, commentId, normalizedType);

        return {
          success: true,
          action: 'created',
          reaction: { type: action },
        };
      }
    } catch (error) {
      this.handleError(error, 'Comment reaction');
    }
  }

  /**
   * Get user's reaction to comment
   */
  async getUserCommentReaction(commentId: string, userId: string): Promise<any> {
    try {
      // Check if comment exists
      const comment = await commentRepository.findById(commentId);
      if (!comment) {
        throw new Error('Comment not found');
      }

      // Get user's reaction (check both like and unlike)
      const likeReaction = await reactionsRepository.findByUserAndComment(
        userId,
        commentId,
        'like'
      );
      const unlikeReaction = await reactionsRepository.findByUserAndComment(
        userId,
        commentId,
        'unlike'
      );

      const reaction = likeReaction || unlikeReaction;

      return {
        reaction: reaction ? { type: reaction.type } : null,
      };
    } catch (error) {
      this.handleError(error, 'Get comment reaction');
    }
  }

  /**
   * Remove user's reaction to comment
   */
  async removeUserCommentReaction(commentId: string, userId: string): Promise<any> {
    try {
      // Check if comment exists
      const comment = await commentRepository.findById(commentId);
      if (!comment) {
        throw new Error('Comment not found');
      }

      // Check if user has any reaction (like or unlike)
      const likeReaction = await reactionsRepository.findByUserAndComment(
        userId,
        commentId,
        'like'
      );
      const unlikeReaction = await reactionsRepository.findByUserAndComment(
        userId,
        commentId,
        'unlike'
      );

      const existingReaction = likeReaction || unlikeReaction;

      if (!existingReaction) {
        throw new Error('No reaction found to remove');
      }

      // Remove the reaction
      await reactionsRepository.deleteCommentReaction(userId, commentId, existingReaction.type);

      return {
        success: true,
        action: 'removed',
        reaction: null,
      };
    } catch (error) {
      this.handleError(error, 'Delete comment reaction');
    }
  }
}

// Export singleton instance
export const commentsService = new CommentsService();
