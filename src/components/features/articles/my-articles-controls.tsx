'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, ArrowUpDown } from 'lucide-react';
import { Category } from '@/types/shared';
import { useI18n } from '@/components/providers';

type SortBy = 'title' | 'createdAt' | 'updatedAt';
type SortOrder = 'asc' | 'desc';
type StatusFilter = 'all' | 'published' | 'draft';

interface MyArticlesControlsProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  categories: Category[];
  sortBy: SortBy;
  sortOrder: SortOrder;
  onSortChange: (sortBy: SortBy, sortOrder: SortOrder) => void;
}

export function MyArticlesControls({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  categories,
  sortBy,
  sortOrder,
  onSortChange,
}: MyArticlesControlsProps) {
  const { t } = useI18n();

  return (
    <div className="sticky top-16 z-40 mb-6 rounded-xl bg-white/80 p-4 shadow-xl shadow-gray-300/60 backdrop-blur-sm">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="lg:col-span-2">
          <div className="relative">
            <Search className="absolute top-1/2 left-3 z-10 h-4 w-4 -translate-y-1/2 transform cursor-pointer text-gray-500" />
            <Input
              placeholder={t('articles.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="focus:ring-brand/20 pl-10 focus:ring-2"
            />
          </div>
        </div>

        <Select value={statusFilter} onValueChange={(value: any) => onStatusFilterChange(value)}>
          <SelectTrigger className="focus:ring-brand/20 bg-brand/10 text-brand-600 focus:ring-2">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('articles.all')}</SelectItem>
            <SelectItem value="published">{t('articles.published')}</SelectItem>
            <SelectItem value="draft">{t('articles.draft')}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={categoryFilter || 'all'}
          onValueChange={(value) => onCategoryFilterChange(value === 'all' ? '' : value)}
        >
          <SelectTrigger className="focus:ring-brand/20 bg-brand/10 text-brand-600 focus:ring-2">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('articles.allCategories')}</SelectItem>
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

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="back"
          size="sm"
          onClick={() => {
            if (sortBy === 'title') {
              onSortChange('title', sortOrder === 'asc' ? 'desc' : 'asc');
            } else {
              onSortChange('title', 'asc');
            }
          }}
          className={`px-3 transition-colors ${sortBy === 'title' ? 'bg-brand/10 text-brand-600' : ''}`}
        >
          <ArrowUpDown className="mr-1 h-4 w-4" />
          {t('articles.sort.title')}
          {sortBy === 'title' && <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>}
        </Button>

        <Button
          variant="back"
          size="sm"
          onClick={() => {
            if (sortBy === 'createdAt') {
              onSortChange('createdAt', sortOrder === 'asc' ? 'desc' : 'asc');
            } else {
              onSortChange('createdAt', 'desc');
            }
          }}
          className={`px-3 transition-colors ${sortBy === 'createdAt' ? 'bg-brand/10 text-brand-600' : ''}`}
        >
          <ArrowUpDown className="mr-1 h-4 w-4" />
          {t('articles.sort.created')}
          {sortBy === 'createdAt' && (
            <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
          )}
        </Button>

        <Button
          variant="back"
          size="sm"
          onClick={() => {
            if (sortBy === 'updatedAt') {
              onSortChange('updatedAt', sortOrder === 'asc' ? 'desc' : 'asc');
            } else {
              onSortChange('updatedAt', 'desc');
            }
          }}
          className={`px-3 transition-colors ${sortBy === 'updatedAt' ? 'bg-brand/10 text-brand-600' : ''}`}
        >
          <ArrowUpDown className="mr-1 h-4 w-4" />
          {t('articles.sort.updated')}
          {sortBy === 'updatedAt' && (
            <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
          )}
        </Button>
      </div>
    </div>
  );
}
