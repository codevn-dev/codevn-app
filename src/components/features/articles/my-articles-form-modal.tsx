'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, X } from 'lucide-react';
import { Category } from '@/types/shared';
import { useI18n } from '@/components/providers';
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
  categoryId: string;
  published: boolean;
}

interface MyArticlesFormModalProps {
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

export function MyArticlesFormModal({
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
}: MyArticlesFormModalProps) {
  const { t } = useI18n();
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
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">
            {isEditing ? t('common.edit') + ' Article' : t('articles.form.createNew')}
          </h2>
        </div>

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
                  onChange({
                    ...form,
                    title,
                    slug: isEditing ? form.slug : generateSlug(title),
                  });
                }}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('articles.form.slug')} *</label>
              <Input
                placeholder={t('articles.form.slugPlaceholder')}
                value={form.slug}
                onChange={(e) => onChange({ ...form, slug: e.target.value })}
                required
              />
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
            <Select
              value={form.categoryId || 'placeholder'}
              onValueChange={(value) =>
                onChange({ ...form, categoryId: value === 'placeholder' ? '' : value })
              }
            >
              <SelectTrigger
                className={`focus:ring-brand/20 focus:ring-2 ${form.categoryId ? 'bg-brand/10 text-brand-600' : 'bg-white text-gray-700'}`}
              >
                <SelectValue placeholder={t('articles.form.selectCategory')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="placeholder" disabled>
                  {t('articles.form.selectCategory')}
                </SelectItem>
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

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="back" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            onClick={() => onSubmit()}
            disabled={isEditing ? false : isCreateDisabled}
          >
            {isEditing ? t('common.edit') : t('common.create')}
          </Button>
        </div>
      </div>
    </div>
  );
}
