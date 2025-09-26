export interface ArticleScoreStats {
  likes: number;
  dislikes: number;
  comments: number;
  views: number;
}

export interface FeaturedArticleScoreStats extends ArticleScoreStats {
  createdAt: Date;
}

export interface RelatedArticleScoreStats extends ArticleScoreStats {
  sameCategory: boolean;
  relatedCategory: boolean;
  sameAuthor: boolean;
}

export interface UserScoreStats extends ArticleScoreStats {
  posts: number;
}

const LIKE_WEIGHT = 5;
const COMMENT_WEIGHT = 3;
const VIEW_WEIGHT = 5;
const DISLIKE_WEIGHT = 3;
const POST_WEIGHT = 10;
const SAME_CATEGORY_WEIGHT = 300;
const RELATED_CATEGORY_WEIGHT = 200;
const AUTHOR_WEIGHT = 100;

export function calculateArticleScore(stats: ArticleScoreStats): number {
  const { likes, dislikes, comments, views } = stats;
  return (
    likes * LIKE_WEIGHT +
    comments * COMMENT_WEIGHT +
    Math.log(views + 1) * VIEW_WEIGHT -
    dislikes * DISLIKE_WEIGHT
  );
}

export function calculateFeaturedArticleScore(
  stats: FeaturedArticleScoreStats,
  windowHours: number
): number {
  const { likes, dislikes, comments, views, createdAt } = stats;
  const timeDiff = Date.now() - new Date(createdAt).getTime();
  const timeDiffInHours = timeDiff / (1000 * 60 * 60);
  return (
    calculateArticleScore({ likes, dislikes, comments, views }) *
    Math.exp(-timeDiffInHours / windowHours)
  );
}

export function calculateRelatedArticleScore(stats: RelatedArticleScoreStats): number {
  const { likes, dislikes, comments, views, sameCategory, relatedCategory, sameAuthor } = stats;

  return (
    (sameCategory ? 1 : 0) * SAME_CATEGORY_WEIGHT +
    (relatedCategory ? 1 : 0) * RELATED_CATEGORY_WEIGHT +
    (sameAuthor ? 1 : 0) * AUTHOR_WEIGHT +
    calculateArticleScore({ likes, dislikes, comments, views })
  );
}

export function calculateUserScore(stats: UserScoreStats): number {
  const { likes, dislikes, comments, views, posts } = stats;
  return posts * POST_WEIGHT + calculateArticleScore({ likes, dislikes, comments, views });
}
