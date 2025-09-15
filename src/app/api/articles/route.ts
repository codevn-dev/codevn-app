import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { articleRepository, categoryRepository } from '@/lib/database/repository';
import {
  withErrorHandling,
  validateRequiredFields,
  getPaginationParams,
  getSortParams,
  getSearchParam,
  requireAuth,
  requireOwnership,
} from '@/lib/api';
import { Errors } from '@/lib/utils/errors';

// GET /api/articles - Get articles with filtering and pagination
export const GET = withErrorHandling(async (request: NextRequest) => {
  const session = await auth();
  const { searchParams } = new URL(request.url);

  const { page, limit } = getPaginationParams(request);
  const { sortBy, sortOrder } = getSortParams(request, ['title', 'createdAt', 'updatedAt']);
  const search = getSearchParam(request);

  const status = searchParams.get('status') || 'all';
  const categoryId = searchParams.get('categoryId') || '';
  const authorId = searchParams.get('authorId') || '';
  const publishedOnlyParam = searchParams.get('publishedOnly');

  // Determine if user is admin
  const isAdmin = session?.user?.role === 'admin';

  // Respect explicit client intent for publishedOnly even for admin.
  // Default behavior: if not specified, admins see all, others see only published.
  const publishedOnly = publishedOnlyParam === null ? !isAdmin : publishedOnlyParam === 'true';

  const result = await articleRepository.findManyWithPagination({
    search,
    sortBy,
    sortOrder,
    page,
    limit,
    status: status as 'all' | 'published' | 'draft',
    categoryId: categoryId || undefined,
    authorId: authorId || undefined,
    publishedOnly,
    userId: session?.user?.id,
  });

  return NextResponse.json(result);
});

// POST /api/articles - Create new article
export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await auth();
  requireAuth(session);

  const body = await request.json();
  const { title, content, slug, thumbnail, categoryId, published = false } = body;

  // Validate required fields
  validateRequiredFields(body, ['title', 'content', 'slug', 'categoryId']);

  // Check if slug already exists
  const existingArticle = await articleRepository.checkSlugExists(slug);
  if (existingArticle) {
    throw Errors.ALREADY_EXISTS('Article with this slug');
  }

  // Verify category exists
  const category = await categoryRepository.findById(categoryId);
  if (!category) {
    throw Errors.NOT_FOUND('Category');
  }

  // Create article
  const newArticle = await articleRepository.create({
    title,
    content,
    slug,
    thumbnail,
    categoryId,
    authorId: session.user!.id,
    published,
  });

  // Fetch the created article with relations
  const createdArticle = await articleRepository.findById(newArticle[0].id);
  if (!createdArticle) {
    throw Errors.INTERNAL_ERROR('Failed to retrieve created article');
  }

  return NextResponse.json(createdArticle, { status: 201 });
});

// PUT /api/articles - Update article
export const PUT = withErrorHandling(async (request: NextRequest) => {
  const session = await auth();
  requireAuth(session);

  const body = await request.json();
  const { id, title, content, slug, thumbnail, categoryId, published } = body;

  validateRequiredFields(body, ['id']);

  // Check if article exists
  const existingArticle = await articleRepository.findById(id);
  if (!existingArticle) {
    throw Errors.NOT_FOUND('Article');
  }

  // Check ownership
  requireOwnership(session, existingArticle.authorId);

  // Check if slug already exists (excluding current article)
  if (slug && slug !== existingArticle.slug) {
    const slugExists = await articleRepository.checkSlugExists(slug, id);
    if (slugExists) {
      throw Errors.ALREADY_EXISTS('Article with this slug');
    }
  }

  // Verify category exists if provided
  if (categoryId) {
    const category = await categoryRepository.findById(categoryId);
    if (!category) {
      throw Errors.NOT_FOUND('Category');
    }
  }

  // Update article
  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (content !== undefined) updateData.content = content;
  if (slug !== undefined) updateData.slug = slug;
  if (thumbnail !== undefined) updateData.thumbnail = thumbnail;
  if (categoryId !== undefined) updateData.categoryId = categoryId;
  if (published !== undefined) updateData.published = published;

  const updatedArticle = await articleRepository.update(id, updateData);

  return NextResponse.json(updatedArticle);
});

// DELETE /api/articles - Delete article
export const DELETE = withErrorHandling(async (request: NextRequest) => {
  const session = await auth();
  requireAuth(session);

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    throw Errors.MISSING_REQUIRED_FIELD('id');
  }

  // Check if article exists
  const existingArticle = await articleRepository.findById(id);
  if (!existingArticle) {
    throw Errors.NOT_FOUND('Article');
  }

  // Check ownership
  requireOwnership(session, existingArticle.authorId);

  // Delete article (cascade will handle related comments and likes)
  await articleRepository.delete(id);

  return NextResponse.json({ message: 'Article deleted successfully' });
});
