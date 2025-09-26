import { getDb } from '..';
import { reactions } from '../schema';
import { eq, and } from 'drizzle-orm';
import { ReactionRow } from '@/types/shared/reaction';

export class ReactionsRepository {
  // Article reactions
  async findByUserAndArticle(
    userId: string,
    articleId: string,
    type: 'like' | 'unlike'
  ): Promise<ReactionRow | null> {
    const row = await getDb().query.reactions.findFirst({
      where: and(
        eq(reactions.articleId, articleId),
        eq(reactions.userId, userId),
        eq(reactions.type, type)
      ),
    });
    return (row as ReactionRow) || null;
  }

  async createArticleReaction(
    userId: string,
    articleId: string,
    type: 'like' | 'unlike'
  ): Promise<void> {
    await getDb().insert(reactions).values({
      articleId,
      userId,
      type,
    });
  }

  async deleteArticleReaction(
    userId: string,
    articleId: string,
    type: 'like' | 'unlike'
  ): Promise<number> {
    const result = await getDb()
      .delete(reactions)
      .where(
        and(
          eq(reactions.articleId, articleId),
          eq(reactions.userId, userId),
          eq(reactions.type, type)
        )
      );
    return Number((result as unknown as { rowCount?: number }).rowCount || 0);
  }

  async getReactionsByArticle(articleId: string, type?: 'like' | 'unlike'): Promise<ReactionRow[]> {
    const whereConditions = [eq(reactions.articleId, articleId)];
    if (type) {
      whereConditions.push(eq(reactions.type, type));
    }

    return await getDb().query.reactions.findMany({
      where: and(...whereConditions),
    });
  }

  // Comment reactions
  async findByUserAndComment(
    userId: string,
    commentId: string,
    type: 'like' | 'unlike'
  ): Promise<ReactionRow | null> {
    const row = await getDb().query.reactions.findFirst({
      where: and(
        eq(reactions.commentId, commentId),
        eq(reactions.userId, userId),
        eq(reactions.type, type)
      ),
    });
    return (row as ReactionRow) || null;
  }

  async createCommentReaction(
    userId: string,
    commentId: string,
    type: 'like' | 'unlike'
  ): Promise<void> {
    await getDb().insert(reactions).values({
      commentId,
      userId,
      type,
    });
  }

  async deleteCommentReaction(
    userId: string,
    commentId: string,
    type: 'like' | 'unlike'
  ): Promise<number> {
    const result = await getDb()
      .delete(reactions)
      .where(
        and(
          eq(reactions.commentId, commentId),
          eq(reactions.userId, userId),
          eq(reactions.type, type)
        )
      );
    return Number((result as unknown as { rowCount?: number }).rowCount || 0);
  }

  async getReactionsByComment(commentId: string, type?: 'like' | 'unlike'): Promise<ReactionRow[]> {
    const whereConditions = [eq(reactions.commentId, commentId)];
    if (type) {
      whereConditions.push(eq(reactions.type, type));
    }

    return await getDb().query.reactions.findMany({
      where: and(...whereConditions),
    });
  }

  async getReactionsByUser(userId: string, type?: 'like' | 'unlike'): Promise<ReactionRow[]> {
    const whereConditions = [eq(reactions.userId, userId)];
    if (type) {
      whereConditions.push(eq(reactions.type, type));
    }

    return await getDb().query.reactions.findMany({
      where: and(...whereConditions),
    });
  }

  // Legacy methods for backward compatibility
  async findByUserAndArticleLike(userId: string, articleId: string) {
    return this.findByUserAndArticle(userId, articleId, 'like');
  }

  async findByUserAndArticleUnlike(userId: string, articleId: string) {
    return this.findByUserAndArticle(userId, articleId, 'unlike');
  }

  async createArticleLike(userId: string, articleId: string) {
    return this.createArticleReaction(userId, articleId, 'like');
  }

  async createArticleUnlike(userId: string, articleId: string) {
    return this.createArticleReaction(userId, articleId, 'unlike');
  }

  async deleteArticleLike(userId: string, articleId: string) {
    return this.deleteArticleReaction(userId, articleId, 'like');
  }

  async deleteArticleUnlike(userId: string, articleId: string) {
    return this.deleteArticleReaction(userId, articleId, 'unlike');
  }

  async getLikesByArticle(articleId: string) {
    return this.getReactionsByArticle(articleId, 'like');
  }

  async getUnlikesByArticle(articleId: string) {
    return this.getReactionsByArticle(articleId, 'unlike');
  }

  async findByUserAndCommentLike(userId: string, commentId: string) {
    return this.findByUserAndComment(userId, commentId, 'like');
  }

  async findByUserAndCommentUnlike(userId: string, commentId: string) {
    return this.findByUserAndComment(userId, commentId, 'unlike');
  }

  async createCommentLike(userId: string, commentId: string) {
    return this.createCommentReaction(userId, commentId, 'like');
  }

  async createCommentUnlike(userId: string, commentId: string) {
    return this.createCommentReaction(userId, commentId, 'unlike');
  }

  async deleteCommentLike(userId: string, commentId: string) {
    return this.deleteCommentReaction(userId, commentId, 'like');
  }

  async deleteCommentUnlike(userId: string, commentId: string) {
    return this.deleteCommentReaction(userId, commentId, 'unlike');
  }

  async getLikesByComment(commentId: string) {
    return this.getReactionsByComment(commentId, 'like');
  }

  async getUnlikesByComment(commentId: string) {
    return this.getReactionsByComment(commentId, 'unlike');
  }

  async getLikesByUser(userId: string) {
    return this.getReactionsByUser(userId, 'like');
  }

  async getUnlikesByUser(userId: string) {
    return this.getReactionsByUser(userId, 'unlike');
  }
}

export const reactionsRepository = new ReactionsRepository();
