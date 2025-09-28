'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CategorySelector } from '@/features/articles';
import { Category } from '@/types/shared';
import { useI18n } from '@/components/providers';
import { X } from 'lucide-react';

interface ArticlesFiltersProps {
  categories: Category[];
  selectedCategoryNames: string[];
  searchTerm: string;
  onlyMine: boolean;
  isAuthenticated: boolean;
  mounted: boolean;
  onSearchChange: (value: string) => void;
  onCategoryToggle: (id: string) => void;
  onOnlyMineToggle: () => void;
  onClearFilters: () => void;
  onCategoryClick: (categoryName: string) => void;
  getCategoryById: (id: string) => Category | null;
  getCategoryByName: (name: string) => Category | undefined;
}

export function ArticlesFilters({
  categories,
  selectedCategoryNames,
  searchTerm,
  onlyMine,
  isAuthenticated,
  mounted,
  onSearchChange,
  onCategoryToggle,
  onOnlyMineToggle,
  onClearFilters,
  onCategoryClick,
  getCategoryById: _getCategoryById,
  getCategoryByName,
}: ArticlesFiltersProps) {
  const { t } = useI18n();

  return (
    <div className="shadow-brand/30 z-40 mb-6 rounded-xl bg-white/80 p-4 shadow-2xl drop-shadow-2xl backdrop-blur-sm sm:mb-8">
      <CategorySelector
        categories={categories}
        selectedCategoryIds={selectedCategoryNames
          .map((name) => {
            const cat = getCategoryByName(name);
            return cat ? cat.id : '';
          })
          .filter(Boolean)}
        onCategoryToggle={onCategoryToggle}
      />
      <div className="mt-3" />
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="lucide lucide-search absolute top-1/2 left-3 -translate-y-1/2 transform text-gray-400"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.3-4.3"></path>
          </svg>
          <Input
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={mounted ? t('home.searchPlaceholder') : ''}
            className="focus:ring-brand/20 w-full pl-10 focus:ring-2"
          />
        </div>
        <div className="flex w-full items-center gap-2 sm:ml-auto sm:w-auto sm:justify-end">
          {isAuthenticated && (
            <Button
              size="sm"
              variant="back"
              onClick={onOnlyMineToggle}
              className={`px-3 transition-colors ${onlyMine ? 'bg-brand/10 text-brand-600' : ''}`}
            >
              <span suppressHydrationWarning>{mounted ? t('home.myArticles') : ''}</span>
            </Button>
          )}
          <Button size="sm" variant="back" onClick={onClearFilters}>
            <span suppressHydrationWarning>{mounted ? t('home.clearFilters') : ''}</span>
          </Button>
        </div>
      </div>
      {selectedCategoryNames.length > 0 && (
        <div className="mt-2 flex items-center gap-2 sm:gap-3">
          <span className="text-xs font-medium text-gray-700 sm:text-sm">Filtered by:</span>
          <div className="flex flex-wrap gap-2">
            {selectedCategoryNames.map((name) => {
              const cat = getCategoryByName(name);
              if (!cat) return null;
              return (
                <div
                  key={name}
                  className="flex items-center rounded-full px-3 py-1.5 text-xs font-semibold shadow-md shadow-gray-200/50 sm:px-4 sm:py-2 sm:text-sm"
                  style={{
                    backgroundColor: `${cat.color || '#3B82F6'}15`,
                    color: cat.color || '#3B82F6',
                  }}
                >
                  <div
                    className="mr-2 h-2 w-2 rounded-full"
                    style={{ backgroundColor: cat.color || '#3B82F6' }}
                  />
                  {cat.name}
                  <button
                    onClick={() => onCategoryClick(name)}
                    aria-label={`Remove ${cat.name}`}
                    title={`Remove ${cat.name}`}
                    className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-current hover:bg-current/10"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
