// Export original repository as originalUserRepository
export { userRepository as originalUserRepository, UserRepository } from './user-repository';
export { cachedUserRepository } from './cached-user-repository';

// Use cached version as default userRepository
export { cachedUserRepository as userRepository } from './cached-user-repository';
export { articleRepository, ArticleRepository } from './article-repository';
export { categoryRepository, CategoryRepository } from './category-repository';
export { likeRepository, LikeRepository } from './like-repository';
export { commentRepository, CommentRepository } from './comment-repository';
export { messageRepository } from './message-repository';
