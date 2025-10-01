'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Category } from '@/types/shared';
import { useI18n } from '@/components/providers';
import { useArticlesActions } from '@/hooks/use-articles-actions';
import dynamic from 'next/dynamic';

// Lazy load TipTap Rich Text Editor to reduce initial bundle size
const TiptapRichTextEditor = dynamic(
  () => import('@/features/articles').then((m) => m.TiptapRichTextEditor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[400px] rounded-lg border border-gray-300 bg-gray-50 p-4 text-center text-gray-500">
        Loading editor...
      </div>
    ),
  }
);

interface ArticleFormState {
  title: string;
  content: string;
  slug: string;
  thumbnail: string;
  categoryIds: string[];
  published: boolean;
}

interface ArticlesFormModalProps {
  open: boolean;
  isEditing: boolean;
  form: ArticleFormState;
  categories: Category[];
  onClose: () => void;
  onChange: (form: ArticleFormState) => void;
  onSubmit: () => void | Promise<void>;
  onOpenImageUpload: () => void;
  onRemoveThumbnail: () => void;
  isCreateDisabled: boolean;
}

export function ArticlesFormModal({
  open,
  isEditing,
  form,
  categories,
  onClose,
  onChange,
  onSubmit,
  onOpenImageUpload,
  onRemoveThumbnail,
  isCreateDisabled,
}: ArticlesFormModalProps) {
  const { t } = useI18n();
  const { checkSlug } = useArticlesActions();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [slugValidation, setSlugValidation] = useState<{
    status: 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const slugCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced slug validation
  const validateSlug = useCallback(
    async (slug: string) => {
      console.log('validateSlug called with:', slug);
      if (!slug.trim()) {
        setSlugValidation({ status: 'idle', message: '' });
        return;
      }

      // Basic slug format validation
      const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
      if (!slugRegex.test(slug)) {
        setSlugValidation({
          status: 'invalid',
          message: t('articles.form.slugInvalid'),
        });
        return;
      }

      setSlugValidation({
        status: 'checking',
        message: t('articles.form.slugChecking'),
      });

      try {
        const result = await checkSlug(slug);
        setSlugValidation({
          status: result.available ? 'available' : 'taken',
          message: result.available
            ? t('articles.form.slugAvailable')
            : t('articles.form.slugTaken'),
        });
      } catch {
        setSlugValidation({
          status: 'error',
          message: t('articles.form.slugCheckFailed'),
        });
      }
    },
    [checkSlug, t]
  );

  // Debounce slug validation
  const debouncedValidateSlug = useCallback(
    (slug: string) => {
      console.log('debouncedValidateSlug called with:', slug);
      if (slugCheckTimeoutRef.current) {
        clearTimeout(slugCheckTimeoutRef.current);
      }

      slugCheckTimeoutRef.current = setTimeout(() => {
        validateSlug(slug);
      }, 500);
    },
    [validateSlug]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (slugCheckTimeoutRef.current) {
        clearTimeout(slugCheckTimeoutRef.current);
      }
    };
  }, []);
  if (!open) return null;

  const generateSlug = (title: string) =>
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="flex h-[90vh] w-full max-w-4xl flex-col rounded-lg bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 p-6 pb-4">
          <h2 className="text-lg font-semibold">
            {isEditing ? t('common.edit') + ' Article' : t('articles.form.createNew')}
          </h2>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('articles.form.title')} *</label>
                <Input
                  placeholder={t('articles.form.titlePlaceholder')}
                  value={form.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    const newSlug = isEditing ? form.slug : generateSlug(title);
                    console.log(
                      'Title changed:',
                      title,
                      'Generated slug:',
                      newSlug,
                      'isEditing:',
                      isEditing
                    );

                    onChange({
                      ...form,
                      title,
                      slug: newSlug,
                    });

                    // Validate auto-generated slug for new articles
                    if (!isEditing && newSlug !== form.slug) {
                      console.log('Calling debouncedValidateSlug for auto-generated slug');
                      debouncedValidateSlug(newSlug);
                    }
                  }}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('articles.form.slug')} *</label>
                <div className="relative">
                  <Input
                    placeholder={t('articles.form.slugPlaceholder')}
                    value={form.slug}
                    onChange={(e) => {
                      const newSlug = e.target.value;
                      console.log('Slug input changed:', newSlug, 'isEditing:', isEditing);
                      onChange({ ...form, slug: newSlug });

                      // Only validate for new articles, not when editing
                      if (!isEditing) {
                        console.log('Calling debouncedValidateSlug');
                        debouncedValidateSlug(newSlug);
                      } else {
                        console.log('Skipping validation because isEditing is true');
                      }
                    }}
                    className={`pr-10 ${
                      slugValidation.status === 'available'
                        ? 'border-green-500 focus:border-green-500'
                        : slugValidation.status === 'taken' ||
                            slugValidation.status === 'invalid' ||
                            slugValidation.status === 'error'
                          ? 'border-red-500 focus:border-red-500'
                          : ''
                    }`}
                    required
                  />

                  {/* Validation Icon */}
                  <div className="absolute top-1/2 right-3 -translate-y-1/2">
                    {slugValidation.status === 'checking' && (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    )}
                    {slugValidation.status === 'available' && (
                      <Check className="h-4 w-4 text-green-500" />
                    )}
                    {(slugValidation.status === 'taken' ||
                      slugValidation.status === 'invalid' ||
                      slugValidation.status === 'error') && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                </div>

                {/* Validation Message */}
                {slugValidation.message && (
                  <p
                    className={`text-xs ${
                      slugValidation.status === 'available'
                        ? 'text-green-600'
                        : slugValidation.status === 'taken' ||
                            slugValidation.status === 'invalid' ||
                            slugValidation.status === 'error'
                          ? 'text-red-600'
                          : 'text-gray-500'
                    }`}
                  >
                    {slugValidation.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('articles.form.thumbnail')}</label>
              {form.thumbnail ? (
                <div className="space-y-2">
                  <div className="relative w-full max-w-sm">
                    <img
                      src={form.thumbnail}
                      alt="Thumbnail preview"
                      className="h-40 w-full rounded-lg object-cover"
                    />
                    <Button
                      type="button"
                      variant="back"
                      size="sm"
                      onClick={onRemoveThumbnail}
                      className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="back"
                    onClick={onOpenImageUpload}
                    className="w-full max-w-sm"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Change Image
                  </Button>
                </div>
              ) : (
                <div className="w-full max-w-sm">
                  <button
                    type="button"
                    onClick={onOpenImageUpload}
                    className="group flex h-40 w-full flex-col items-center justify-center space-y-2 rounded-lg bg-white transition-colors"
                  >
                    <Upload className="h-8 w-8 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">
                      {t('articles.form.clickToUpload')}
                    </span>
                  </button>
                  <p className="mt-2 text-xs text-gray-500">{t('articles.form.thumbHint')}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('articles.form.category')} *</label>
              <div className="relative" ref={dropdownRef}>
                {/* Dropdown Button */}
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="focus:border-brand-500 focus:ring-brand-500 flex w-full items-center justify-between rounded-lg border border-gray-300 bg-white p-3 text-sm hover:bg-gray-50"
                >
                  <span className="text-gray-700">
                    {form.categoryIds.length === 0
                      ? t('articles.form.selectCategories') + '...'
                      : `${form.categoryIds.length} categories selected`}
                  </span>
                  <svg
                    className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-300 bg-white shadow-lg">
                    {categories.length === 0 ? (
                      <div className="p-3 text-sm text-gray-500">No categories available</div>
                    ) : (
                      <div className="py-1">
                        {categories.map((category) => (
                          <div key={category.id}>
                            {/* Parent Category */}
                            <div
                              className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-gray-50"
                              onClick={() => {
                                const isSelected = form.categoryIds.includes(category.id);
                                const newCategoryIds = isSelected
                                  ? form.categoryIds.filter((id) => id !== category.id)
                                  : [...form.categoryIds, category.id];
                                onChange({ ...form, categoryIds: newCategoryIds });
                              }}
                            >
                              <div className="flex items-center">
                                <input
                                  type="checkbox"
                                  checked={form.categoryIds.includes(category.id)}
                                  onChange={() => {}} // Handled by parent div onClick
                                  className="text-brand-600 focus:ring-brand-500 h-4 w-4 rounded border-gray-300"
                                />
                              </div>
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-3 w-3 rounded-full"
                                  style={{ backgroundColor: category.color }}
                                />
                                <span className="text-sm font-semibold">{category.name}</span>
                                {category.children && category.children.length > 0 && (
                                  <span className="text-xs text-gray-500">
                                    ({category.children.length})
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Subcategories */}
                            {category.children &&
                              category.children.map((subCategory) => (
                                <div
                                  key={subCategory.id}
                                  className="flex cursor-pointer items-center gap-3 px-3 py-2 pl-8 hover:bg-gray-50"
                                  onClick={() => {
                                    const isSelected = form.categoryIds.includes(subCategory.id);
                                    const newCategoryIds = isSelected
                                      ? form.categoryIds.filter((id) => id !== subCategory.id)
                                      : [...form.categoryIds, subCategory.id];
                                    onChange({ ...form, categoryIds: newCategoryIds });
                                  }}
                                >
                                  <div className="flex items-center">
                                    <input
                                      type="checkbox"
                                      checked={form.categoryIds.includes(subCategory.id)}
                                      onChange={() => {}} // Handled by parent div onClick
                                      className="text-brand-600 focus:ring-brand-500 h-4 w-4 rounded border-gray-300"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="h-2.5 w-2.5 rounded-full"
                                      style={{ backgroundColor: subCategory.color }}
                                    />
                                    <span className="text-sm text-gray-700">
                                      {subCategory.name}
                                    </span>
                                  </div>
                                </div>
                              ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {form.categoryIds.length === 0 && (
                <p className="text-xs text-red-600">{t('articles.form.pleaseSelectCategory')}</p>
              )}

              {/* Selected Categories Tags */}
              {form.categoryIds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {form.categoryIds.map((categoryId) => {
                    const category =
                      categories.find((c) => c.id === categoryId) ||
                      categories.flatMap((c) => c.children || []).find((c) => c.id === categoryId);
                    if (!category) return null;
                    return (
                      <span
                        key={categoryId}
                        className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700"
                      >
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                        <button
                          type="button"
                          onClick={() => {
                            const newCategoryIds = form.categoryIds.filter(
                              (id) => id !== categoryId
                            );
                            onChange({ ...form, categoryIds: newCategoryIds });
                          }}
                          className="ml-1 text-gray-400 hover:text-gray-600"
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('articles.form.content')} *</label>
              <TiptapRichTextEditor
                value={form.content}
                onChange={(value) => onChange({ ...form, content: value })}
                placeholder="Write your article content here..."
                className="min-h-[400px]"
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="published"
                checked={form.published}
                onChange={(e) => onChange({ ...form, published: e.target.checked })}
                className="accent-brand focus:ring-brand h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="published" className="text-sm font-medium">
                {t('articles.form.publishNow')}
              </label>
            </div>
          </form>
        </div>

        {/* Sticky Footer with Buttons */}
        <div className="border-t border-gray-200 p-6 pt-4">
          <div className="flex justify-end gap-2">
            <Button variant="back" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              onClick={() => onSubmit()}
              disabled={isEditing ? false : isCreateDisabled}
            >
              {isEditing ? t('common.update') : t('common.create')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
