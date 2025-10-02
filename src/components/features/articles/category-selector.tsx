'use client';

import { useState, useEffect } from 'react';
import { Hash, ArrowRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Category } from '@/stores';
import { useI18n } from '@/components/providers';

interface CategorySelectorProps {
  categories: Category[];
  selectedCategoryIds: string[];
  onCategoryToggle: (categoryId: string) => void;
}

// Utility function to divide categories into rows of equal length
function chunkArrayIntoRows<T>(array: T[], itemsPerRow: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += itemsPerRow) {
    result.push(array.slice(i, i + itemsPerRow));
  }
  return result;
}

export function CategorySelector({
  categories,
  selectedCategoryIds,
  onCategoryToggle,
}: CategorySelectorProps) {
  const { t } = useI18n();
  const [_expandedCategoryId, _setExpandedCategoryId] = useState<string | null>(null);
  const [itemsPerRow, setItemsPerRow] = useState(4); // default for SSR
  const [mounted, setMounted] = useState(false);

  const isSelected = (id: string) => selectedCategoryIds.includes(id);

  // Calculate items per row based on screen size
  // Responsive: 1 item on small mobile, 2 on large mobile, 3 on tablet, 4 on desktop
  const updateItemsPerRow = () => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 480) {
        setItemsPerRow(1); // small mobile
      } else if (window.innerWidth < 640) {
        setItemsPerRow(2); // mobile
      } else if (window.innerWidth < 1024) {
        setItemsPerRow(3); // tablet
      } else {
        setItemsPerRow(4); // desktop
      }
    }
  };

  useEffect(() => {
    setMounted(true);
    updateItemsPerRow();
    window.addEventListener('resize', updateItemsPerRow);
    return () => window.removeEventListener('resize', updateItemsPerRow);
  }, []);

  // Use old layout for SSR, new layout for client
  const categoryRows = mounted ? chunkArrayIntoRows(categories, itemsPerRow) : [categories];

  const renderCategory = (
    category: Category,
    isLastRow: boolean = false,
    _itemsInRow: number = 0
  ) => (
    <div
      key={category.id}
      className={`relative ${mounted && !isLastRow ? 'flex-1' : ''}`}
      style={
        mounted && isLastRow
          ? { width: `calc((100% - ${(itemsPerRow - 1) * 0.5}rem) / ${itemsPerRow})` }
          : {}
      }
    >
      {category.children && category.children.length > 0 ? (
        <div className="relative">
          <Button
            size="sm"
            variant="back"
            className={`${mounted ? 'w-full' : ''} border-2 py-2 pr-8 pl-3 text-xs transition-colors sm:pr-10 sm:pl-4 sm:text-sm ${
              isSelected(category.id)
                ? 'bg-brand/40 border-brand/60 font-semibold'
                : 'border-brand/20 hover:border-brand/40'
            }`}
            onClick={() => onCategoryToggle(category.id)}
          >
            <div className="flex min-w-0 items-center">
              <div
                className="mr-1.5 h-2 w-2 flex-shrink-0 rounded-full sm:mr-2"
                style={{
                  backgroundColor: isSelected(category.id) ? 'white' : category.color,
                }}
              />
              <span className="truncate">{category.name}</span>
              {category._count && (
                <span
                  className={`ml-1.5 flex-shrink-0 rounded-full px-1.5 py-0.5 text-xs font-semibold sm:ml-2 sm:px-2 ${
                    isSelected(category.id) ? 'bg-brand/40 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {category._count.articles}
                </span>
              )}
            </div>
            {/* Vertical divider */}
            <span
              className={`pointer-events-none absolute top-1/2 right-8 h-4 w-px -translate-y-1/2 ${
                isSelected(category.id) ? 'bg-white/30' : 'bg-gray-200'
              }`}
            />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={`absolute top-1/2 right-1 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg transition-colors ${
                  isSelected(category.id)
                    ? 'text-white hover:bg-white/10'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                aria-label="Open subcategories"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="shadow-brand/40 z-[100] w-64 rounded-2xl bg-white/95 shadow-2xl drop-shadow-2xl backdrop-blur-md">
              {(category.children || []).map((child) => (
                <DropdownMenuItem
                  key={child.id}
                  onClick={() => onCategoryToggle(child.id)}
                  className={`group flex items-center rounded-lg px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-all duration-300 hover:scale-[1.02] sm:text-sm ${
                    isSelected(child.id) ? 'bg-brand/40 font-semibold' : 'hover:bg-brand/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: child.color }}
                    />
                    <span className="text-brand">{child.name}</span>
                    {child._count && (
                      <span
                        className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          isSelected(child.id)
                            ? 'bg-brand/40 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {child._count.articles}
                      </span>
                    )}
                  </div>
                  {isSelected(child.id) && (
                    <ArrowRight className="ml-2 h-3 w-3 transition-transform group-hover:translate-x-1" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <Button
          size="sm"
          variant="back"
          className={`${mounted ? 'w-full' : ''} border-2 px-3 py-2 text-xs transition-colors sm:px-4 sm:text-sm ${
            isSelected(category.id)
              ? 'bg-brand/40 border-brand/60 font-semibold'
              : 'border-brand/20 hover:border-brand/40'
          }`}
          onClick={() => onCategoryToggle(category.id)}
        >
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <div
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full sm:h-3 sm:w-3"
              style={{ backgroundColor: category.color }}
            ></div>
            <span className="text-brand truncate">{category.name}</span>
            {category._count && (
              <span
                className={`ml-1 flex-shrink-0 rounded-full px-1.5 py-0.5 text-xs font-semibold sm:ml-2 sm:px-2 ${
                  isSelected(category.id) ? 'bg-brand/40 text-white' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {category._count.articles}
              </span>
            )}
          </div>
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Root Categories - Multi-row Layout */}
      <div
        className={`rounded-xl bg-white/80 px-2 py-3 shadow-lg shadow-gray-200/50 backdrop-blur-sm sm:px-4 sm:py-4 ${!mounted ? 'scrollbar-hide -mx-2 sm:mx-0 sm:px-0' : ''}`}
      >
        {mounted ? (
          <div className="space-y-1.5 sm:space-y-3" suppressHydrationWarning>
            {categoryRows.map((row, rowIndex) => {
              const isLastRow = rowIndex === categoryRows.length - 1;
              return (
                <div key={rowIndex} className="flex gap-1.5 sm:gap-3">
                  {row.map((category) => renderCategory(category, isLastRow, row.length))}
                </div>
              );
            })}
          </div>
        ) : (
          // SSR fallback - horizontal layout
          <div className="flex gap-1.5 overflow-x-auto sm:gap-3">
            {categories.map((category) => renderCategory(category, false, 0))}
          </div>
        )}
      </div>

      {categories.length === 0 && (
        <div className="flex w-full items-center justify-center py-16 text-gray-500">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 p-4">
              <Hash className="h-8 w-8 text-gray-400" />
            </div>
            <p className="mb-2 text-lg font-semibold">{t('home.noTopicsAvailable')}</p>
            <p className="text-sm text-gray-400">{t('home.topicsWillAppearHere')}</p>
          </div>
        </div>
      )}
    </div>
  );
}
