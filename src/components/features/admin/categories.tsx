'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardBody } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Tag,
  Edit,
  Trash2,
  ChevronDown,
  ChevronRight,
  XCircle,
  GripVertical,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuthState } from '@/hooks/use-auth-state';
import { RoleLevel } from '@/types/shared/roles';
import { Category } from '@/types/shared/category';
import { SuccessResponse } from '@/types/shared/common';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/utils/api-client';
import { useI18n } from '@/components/providers';
import { formatDateTime } from '@/lib/utils/time-format';

interface CategoriesProps {
  onDataChange?: () => void;
}

interface SortableCategoryProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onToggleCollapse: (categoryId: string) => void;
  isCollapsed: boolean;
  t: (key: string) => string;
}

function SortableCategory({
  category,
  onEdit,
  onDelete,
  onToggleCollapse,
  isCollapsed,
  t,
}: SortableCategoryProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 14, scale: 0.99 },
        visible: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { type: 'spring', stiffness: 420, damping: 32, mass: 0.8 },
        },
      }}
    >
      <Card
        ref={setNodeRef}
        style={style}
        className="hover:border-brand/60 border border-gray-200 transition-all duration-300"
      >
        <CardHeader className="pb-4">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex flex-1 items-center">
              {/* Drag Handle */}
              <button
                className="mr-2 cursor-grab p-1 text-gray-400 hover:text-gray-600 active:cursor-grabbing"
                {...attributes}
                {...listeners}
              >
                <GripVertical className="h-5 w-5" />
              </button>

              <div
                className="mr-3 h-5 w-5 rounded-full shadow-sm sm:mr-4"
                style={{ backgroundColor: category.color }}
              ></div>
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-2 sm:gap-3">
                  <h3 className="line-clamp-2 text-lg font-bold text-gray-900 sm:text-xl">
                    {category.name}
                  </h3>
                  <Badge>{t('admin.rootCategory')}</Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-500 sm:text-sm">
                  <span className="font-medium">
                    {t('admin.createdBy')} {category.createdBy.name}
                  </span>
                  <span className="mx-2 hidden sm:inline">•</span>
                  <span>{formatDateTime(category.createdAt)}</span>
                  {category.children && category.children.length > 0 && (
                    <>
                      <span className="mx-2 hidden sm:inline">•</span>
                      <span className="text-brand font-medium">
                        {t('admin.subCategories')} ({category.children.length})
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="ml-0 flex space-x-2 sm:ml-4">
              <Button variant="back" size="sm" onClick={() => onEdit(category)}>
                <Edit className="mr-1 h-4 w-4" />
                {t('common.edit')}
              </Button>
              <Button
                variant="back"
                size="sm"
                onClick={() => onDelete(category)}
                className="border-red-600 text-red-600 hover:bg-red-50"
              >
                <Trash2 className="mr-1 h-4 w-4" />
                {t('common.delete')}
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Children Categories */}
        {category.children && category.children.length > 0 && (
          <CardBody className="pt-0">
            <div className="rounded-lg bg-gray-50/50 p-6">
              <button
                onClick={() => onToggleCollapse(category.id)}
                className="mb-4 flex w-full items-center justify-between text-sm font-semibold text-gray-700 transition-colors hover:text-gray-900"
              >
                <div className="flex items-center">
                  <div className="mr-2 h-2 w-2 rounded-full bg-gray-400"></div>
                  {t('admin.subCategories')} ({category.children.length})
                </div>
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="grid gap-3 overflow-hidden"
                >
                  <SortableContext
                    items={category.children.map((child) => child.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {category.children.map((child: Category) => (
                      <SortableChildCategory
                        key={child.id}
                        category={child}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        t={t}
                      />
                    ))}
                  </SortableContext>
                </motion.div>
              )}
            </div>
          </CardBody>
        )}
      </Card>
    </motion.div>
  );
}

interface SortableChildCategoryProps {
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  t: (key: string) => string;
}

function SortableChildCategory({ category, onEdit, onDelete, t }: SortableChildCategoryProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="hover:border-brand/60 border border-gray-200 transition-all duration-300"
    >
      <CardBody className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center">
            {/* Drag Handle */}
            <button
              className="mr-2 cursor-grab p-1 text-gray-400 hover:text-gray-600 active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>

            <div
              className="mr-3 h-4 w-4 rounded-full shadow-sm"
              style={{ backgroundColor: category.color }}
            ></div>
            <div>
              <h5 className="line-clamp-2 font-semibold text-gray-900">{category.name}</h5>

              <div className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
                <span>
                  {t('admin.createdBy')} {category.createdBy.name}
                </span>
                <span className="mx-2 hidden sm:inline">•</span>
                <span>{formatDateTime(category.createdAt)}</span>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <Button variant="back" size="sm" onClick={() => onEdit(category)}>
              <Edit className="mr-1 h-3 w-3" />
              {t('common.edit')}
            </Button>
            <Button
              variant="back"
              size="sm"
              onClick={() => onDelete(category)}
              className="border-red-600 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="mr-1 h-3 w-3" />
              {t('common.delete')}
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export function Categories({ onDataChange }: CategoriesProps) {
  const { t } = useI18n();
  const { user } = useAuthState();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    color: '#3B82F6',
    parentId: '',
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch categories data
  const fetchCategories = useCallback(async () => {
    if (!user || user.role !== RoleLevel.admin) {
      setLoading(false);
      return;
    }

    try {
      const categoriesData = await apiGet<Category[]>('/api/categories');
      setCategories(categoriesData);

      // Set all categories with children as collapsed by default
      const categoriesWithChildren = categoriesData
        .filter((cat: Category) => cat.children && cat.children.length > 0)
        .map((cat: Category) => cat.id);
      setCollapsedCategories(new Set(categoriesWithChildren));
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Toggle collapse state for a category
  const toggleCategoryCollapse = (categoryId: string) => {
    setCollapsedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Handle drag end for reordering
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the active and over categories
    let activeCategory: Category | null = null;
    let overCategory: Category | null = null;
    let activeParentId: string | null = null;
    let overParentId: string | null = null;

    // Check if they are root categories
    for (const category of categories) {
      if (category.id === activeId) {
        activeCategory = category;
        activeParentId = null;
      }
      if (category.id === overId) {
        overCategory = category;
        overParentId = null;
      }

      // Check children
      if (category.children) {
        for (const child of category.children) {
          if (child.id === activeId) {
            activeCategory = child;
            activeParentId = category.id;
          }
          if (child.id === overId) {
            overCategory = child;
            overParentId = category.id;
          }
        }
      }
    }

    if (!activeCategory || !overCategory) {
      return;
    }

    // Only allow reordering within the same parent level
    if (activeParentId !== overParentId) {
      return;
    }

    // Update local state optimistically
    setCategories((prevCategories) => {
      const newCategories = [...prevCategories];

      if (activeParentId === null) {
        // Reordering root categories
        const activeIndex = newCategories.findIndex((cat) => cat.id === activeId);
        const overIndex = newCategories.findIndex((cat) => cat.id === overId);

        if (activeIndex !== -1 && overIndex !== -1) {
          const reorderedCategories = arrayMove(newCategories, activeIndex, overIndex);
          return reorderedCategories;
        }
      } else {
        // Reordering child categories
        const parentIndex = newCategories.findIndex((cat) => cat.id === activeParentId);
        if (parentIndex !== -1 && newCategories[parentIndex].children) {
          const children = [...newCategories[parentIndex].children!];
          const activeIndex = children.findIndex((child) => child.id === activeId);
          const overIndex = children.findIndex((child) => child.id === overId);

          if (activeIndex !== -1 && overIndex !== -1) {
            const reorderedChildren = arrayMove(children, activeIndex, overIndex);
            newCategories[parentIndex] = {
              ...newCategories[parentIndex],
              children: reorderedChildren,
            };
          }
        }
      }

      return newCategories;
    });

    // Prepare reorder data for API
    try {
      let reorderData: Array<{ id: string; order: string; parentId?: string | null }> = [];

      if (activeParentId === null) {
        // Reordering root categories
        const rootCategories = categories.filter((cat) => !cat.parentId);
        const activeIndex = rootCategories.findIndex((cat) => cat.id === activeId);
        const overIndex = rootCategories.findIndex((cat) => cat.id === overId);

        if (activeIndex !== -1 && overIndex !== -1) {
          const reorderedCategories = arrayMove(rootCategories, activeIndex, overIndex);
          reorderData = reorderedCategories.map((cat, index) => ({
            id: cat.id,
            order: index.toString(),
            parentId: null,
          }));
        }
      } else {
        // Reordering child categories
        const parentCategory = categories.find((cat) => cat.id === activeParentId);
        if (parentCategory && parentCategory.children) {
          const children = [...parentCategory.children];
          const activeIndex = children.findIndex((child) => child.id === activeId);
          const overIndex = children.findIndex((child) => child.id === overId);

          if (activeIndex !== -1 && overIndex !== -1) {
            const reorderedChildren = arrayMove(children, activeIndex, overIndex);
            reorderData = reorderedChildren.map((child, index) => ({
              id: child.id,
              order: index.toString(),
              parentId: activeParentId,
            }));
          }
        }
      }

      // Send reorder request to API
      if (reorderData.length > 0) {
        await apiPost('/api/categories/reorder', { categories: reorderData });
        // Don't refresh categories to preserve collapse state
        // The optimistic update already reflects the changes
        onDataChange?.();
      }
    } catch (error) {
      console.error('Failed to reorder categories:', error);
      // Revert optimistic update by refetching
      fetchCategories();
    }
  };

  // Fetch data when component mounts
  useEffect(() => {
    if (user && user.role === RoleLevel.admin) {
      fetchCategories();
    }
  }, [fetchCategories, user]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || user.role !== RoleLevel.admin) {
      setCategoryError('Only admin can create categories');
      return;
    }

    setIsSubmitting(true);
    setCategoryError(null);

    try {
      await apiPost<Category>('/api/categories', categoryForm);
      setCategoryForm({ name: '', color: '#3B82F6', parentId: '' });
      setShowCategoryForm(false);
      setCategoryError(null);
      fetchCategories();
      onDataChange?.();
    } catch (error: any) {
      const errorMessage =
        error?.response?.error || error?.message || 'Network error. Please try again.';
      setCategoryError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      color: category.color,
      parentId: category.parentId || '',
    });
    setShowCategoryForm(true);
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingCategory) return;

    if (!user || user.role !== RoleLevel.admin) {
      setCategoryError('Only admin can update categories');
      return;
    }

    setIsSubmitting(true);
    setCategoryError(null);

    try {
      await apiPut<Category>('/api/categories', {
        id: editingCategory.id,
        ...categoryForm,
      });
      setCategoryForm({ name: '', color: '#3B82F6', parentId: '' });
      setShowCategoryForm(false);
      setEditingCategory(null);
      setCategoryError(null);
      fetchCategories();
      onDataChange?.();
    } catch (error: any) {
      const errorMessage =
        error?.response?.error || error?.message || 'Network error. Please try again.';
      setCategoryError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (!user || user.role !== RoleLevel.admin) {
      setDeleteError('Only admin can delete categories');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await apiDelete<SuccessResponse>(`/api/categories?id=${category.id}`);
      setShowDeleteConfirm(null);
      setDeleteError(null);
      fetchCategories();
      onDataChange?.();
    } catch (error: any) {
      // Display specific error message from server
      const errorMessage =
        error?.response?.data?.error || error?.message || 'Network error. Please try again.';
      setDeleteError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const resetForm = () => {
    setCategoryForm({ name: '', color: '#3B82F6', parentId: '' });
    setShowCategoryForm(false);
    setEditingCategory(null);
    setCategoryError(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="border-brand h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold sm:text-xl">{t('admin.categoriesManagement')}</h2>
        <Button className="w-full sm:w-auto" onClick={() => setShowCategoryForm(true)}>
          <Plus className="mr-1 h-4 w-4" />
          {t('admin.newCategory')}
        </Button>
      </div>

      {/* Category Form Modal */}
      {showCategoryForm &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowCategoryForm(false);
                resetForm();
              }
            }}
          >
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6">
              <div className="mb-4">
                <h2 className="text-lg font-semibold">
                  {editingCategory
                    ? t('common.update') + ' ' + t('admin.categories')
                    : t('admin.category.new')}
                </h2>
              </div>

              <form
                id="category-form"
                onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('admin.category.name')}</label>
                  <Input
                    placeholder={t('admin.category.namePlaceholder')}
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('admin.category.color')}</label>
                  <Input
                    type="color"
                    value={categoryForm.color}
                    onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">{t('admin.parentCategory')}</label>
                  <Select
                    value={categoryForm.parentId || 'none'}
                    onValueChange={(value) =>
                      setCategoryForm({
                        ...categoryForm,
                        parentId: value === 'none' ? '' : value,
                      })
                    }
                  >
                    <SelectTrigger className="focus:ring-brand/20 bg-white transition-colors focus:ring-2">
                      <SelectValue placeholder={'Select a parent category (optional)'} />
                    </SelectTrigger>
                    <SelectContent className="z-[80]">
                      <SelectItem value="none">{t('admin.category.noParentRoot')}</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {categoryError && <p className="text-sm text-red-600">{categoryError}</p>}

                <div className="mt-6 flex justify-end gap-2">
                  <Button variant="back" onClick={resetForm}>
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" variant="primary" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        {editingCategory ? t('common.update') + '...' : t('common.create') + '...'}
                      </>
                    ) : editingCategory ? (
                      t('common.update')
                    ) : (
                      t('common.create')
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      <div className="grid gap-4 sm:gap-6">
        {categories.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <Tag className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-gray-900">No categories yet</h3>
            <p className="mb-4 text-gray-500">Get started by creating your first category</p>
            <Button onClick={() => setShowCategoryForm(true)}>
              <Plus className="mr-1 h-4 w-4" />
              New Category
            </Button>
          </div>
        ) : (
          (() => {
            const containerVariants = {
              hidden: { opacity: 1 },
              visible: {
                opacity: 1,
                transition: { staggerChildren: 0.05, delayChildren: 0.02 },
              },
            } as const;

            return (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={categories.map((cat) => cat.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid gap-4 sm:gap-6"
                  >
                    {categories.map((category) => (
                      <SortableCategory
                        key={category.id}
                        category={category}
                        onEdit={handleEditCategory}
                        onDelete={setShowDeleteConfirm}
                        onToggleCollapse={toggleCategoryCollapse}
                        isCollapsed={collapsedCategories.has(category.id)}
                        t={t}
                      />
                    ))}
                  </motion.div>
                </SortableContext>
              </DndContext>
            );
          })()
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div
              className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4">
                <h2 className="text-lg font-semibold">{t('admin.category.deleteTitle')}</h2>
              </div>
              <p className="mb-2 text-gray-600">
                {t('admin.category.deleteConfirm')} &quot;{showDeleteConfirm?.name}&quot;
                {t('admin.category.deleteConfirmSuffix')}
              </p>

              {deleteError && (
                <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <XCircle className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        {t('admin.category.cannotDeleteTitle')}
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>{deleteError}</p>
                        {deleteError.includes('articles') && (
                          <div className="mt-2">
                            <p className="font-medium">{t('admin.category.deleteInstructions')}</p>
                            <ul className="mt-1 list-inside list-disc space-y-1">
                              <li>{t('admin.category.moveArticles')}</li>
                              <li>{t('admin.category.deleteArticles')}</li>
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteConfirm(null);
                    setDeleteError(null);
                  }}
                  disabled={isDeleting}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => showDeleteConfirm && handleDeleteCategory(showDeleteConfirm)}
                  className="border-red-600 text-red-600 hover:bg-red-50"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                      {t('admin.category.deleting')}
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-1 h-4 w-4" />
                      {t('common.delete')}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
