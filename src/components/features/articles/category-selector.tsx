'use client';

import { useState } from 'react';
import { Hash, ArrowRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Category } from '@/stores';

interface CategorySelectorProps {
  categories: Category[];
  selectedCategoryIds: string[];
  onCategoryToggle: (categoryId: string) => void;
}

export function CategorySelector({
  categories,
  selectedCategoryIds,
  onCategoryToggle,
}: CategorySelectorProps) {
  const [_expandedCategoryId, _setExpandedCategoryId] = useState<string | null>(null);

  const isSelected = (id: string) => selectedCategoryIds.includes(id);

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Root Categories - Horizontal Layout */}
      <div className="scrollbar-hide -mx-3 flex gap-2 overflow-x-auto rounded-xl bg-white/80 px-3 py-4 shadow-lg shadow-gray-200/50 backdrop-blur-sm sm:mx-0 sm:gap-3 sm:px-0 sm:py-4">
        {categories.map((category) => (
          <div key={category.id} className="relative">
            {category.children && category.children.length > 0 ? (
              <div className="relative">
                <Button
                  size="sm"
                  variant="back"
                  className={`pr-10 pl-4 transition-colors ${
                    isSelected(category.id) ? 'bg-brand/40 font-semibold shadow-sm' : ''
                  }`}
                  onClick={() => onCategoryToggle(category.id)}
                >
                  <div className="flex items-center">
                    <div
                      className="mr-2 h-2 w-2 rounded-full"
                      style={{
                        backgroundColor: isSelected(category.id) ? 'white' : category.color,
                      }}
                    />
                    <span>{category.name}</span>
                    {category._count && (
                      <span
                        className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          isSelected(category.id)
                            ? 'bg-brand/40 text-white'
                            : 'bg-gray-100 text-gray-600'
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
                className={`px-4 transition-colors ${
                  isSelected(category.id) ? 'bg-brand/40 font-semibold shadow-sm' : ''
                }`}
                onClick={() => onCategoryToggle(category.id)}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  ></div>
                  <span className="text-brand">{category.name}</span>
                  {category._count && (
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        isSelected(category.id)
                          ? 'bg-brand/40 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {category._count.articles}
                    </span>
                  )}
                </div>
              </Button>
            )}
          </div>
        ))}
      </div>

      {categories.length === 0 && (
        <div className="flex w-full items-center justify-center py-16 text-gray-500">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 p-4">
              <Hash className="h-8 w-8 text-gray-400" />
            </div>
            <p className="mb-2 text-lg font-semibold">No topics available</p>
            <p className="text-sm text-gray-400">Topics will appear here once they are created.</p>
          </div>
        </div>
      )}
    </div>
  );
}
