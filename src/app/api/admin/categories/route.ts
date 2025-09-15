import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { categoryRepository } from '@/lib/database/repository';
import { withErrorHandling, requireAdmin } from '@/lib/api';
import { Errors } from '@/lib/utils';

export const GET = withErrorHandling(async () => {
  const session = await auth();
  requireAdmin(session);

  const rootCategories = await categoryRepository.findAllForAdmin();
  return NextResponse.json(rootCategories);
});

export const POST = withErrorHandling(async (request: NextRequest) => {
  const session = await auth();
  requireAdmin(session);

  const { name, description, color, parentId } = await request.json();

  if (!name) {
    throw Errors.MISSING_REQUIRED_FIELD('name');
  }

  // If parentId is provided, validate it exists
  if (parentId) {
    const parentCategory = await categoryRepository.findById(parentId);

    if (!parentCategory) {
      throw Errors.NOT_FOUND('Parent category');
    }
  }

  const newCategory = await categoryRepository.create({
    name,
    description,
    color,
    parentId,
    createdById: session.user.id,
  });

  return NextResponse.json(newCategory[0], { status: 201 });
});

export const PUT = withErrorHandling(async (request: NextRequest) => {
  const session = await auth();
  requireAdmin(session);

  const { id, name, description, color, parentId } = await request.json();

  if (!id || !name) {
    throw Errors.MISSING_REQUIRED_FIELD('Category ID and name');
  }

  // Check if category exists
  const existingCategory = await categoryRepository.findById(id);

  if (!existingCategory) {
    throw Errors.NOT_FOUND('Category');
  }

  // If parentId is provided, validate it exists and is not the same as current category
  if (parentId) {
    if (parentId === id) {
      throw Errors.INVALID_INPUT('Category cannot be its own parent');
    }

    const parentCategory = await categoryRepository.findById(parentId);

    if (!parentCategory) {
      throw Errors.NOT_FOUND('Parent category');
    }
  }

  // Update category
  const updatedCategory = await categoryRepository.update(id, {
    name,
    description,
    color: color || existingCategory.color,
    parentId: parentId || null,
  });

  return NextResponse.json(updatedCategory[0]);
});

export const DELETE = withErrorHandling(async (request: NextRequest) => {
  const session = await auth();
  requireAdmin(session);

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    throw Errors.MISSING_REQUIRED_FIELD('Category ID');
  }

  // Check if category exists
  const existingCategory = await categoryRepository.findById(id);

  if (!existingCategory) {
    throw Errors.NOT_FOUND('Category');
  }

  // Check if category has children
  const childrenCount = await categoryRepository.getChildrenCount(id);

  if (childrenCount > 0) {
    throw Errors.CONFLICT(
      'Cannot delete category with child categories. Please delete child categories first.'
    );
  }

  // Check if category has articles
  const articlesCount = await categoryRepository.getArticlesCount(id);

  if (articlesCount > 0) {
    throw Errors.CONFLICT(
      'Cannot delete category with articles. Please move or delete articles first.'
    );
  }

  // Delete category
  await categoryRepository.delete(id);

  return NextResponse.json({ message: 'Category deleted successfully' });
});
