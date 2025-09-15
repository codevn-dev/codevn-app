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
  selectedCategoryId: string | null;
  onCategorySelect: (categoryId: string | null) => void;
}

export function CategorySelector({
  categories,
  selectedCategoryId,
  onCategorySelect,
}: CategorySelectorProps) {
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  const isCategorySelected = (category: Category) => {
    if (selectedCategoryId === category.id) return true;
    if (category.children) {
      return category.children.some((child) => selectedCategoryId === child.id);
    }
    return false;
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Root Categories - Horizontal Layout */}
      <div className="scrollbar-hide -mx-3 flex gap-2 overflow-x-auto px-3 py-1 sm:mx-0 sm:gap-3 sm:px-0 sm:py-0">
        {categories.map((category) => (
          <div key={category.id} className="relative">
            {category.children && category.children.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className={`group flex transform items-center rounded-xl px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-all duration-300 hover:scale-[1.02] sm:px-4 sm:py-3 sm:text-sm ${
                      isCategorySelected(category)
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                        : 'border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 hover:shadow-md'
                    } `}
                    variant={isCategorySelected(category) ? 'default' : 'outline'}
                  >
                    <div className="flex items-center">
                      <div
                        className="mr-2 h-2 w-2 rounded-full"
                        style={{ backgroundColor: isCategorySelected(category) ? 'white' : category.color }}
                      ></div>
                      <span>{category.name}</span>
                      {category._count && (
                        <span
                          className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                            isCategorySelected(category)
                              ? 'bg-white/20 text-white'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {category._count.articles}
                        </span>
                      )}
                    </div>
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="z-50 w-64 rounded-xl border border-gray-200 bg-white shadow-lg">
                  {(category.children || []).map((child) => (
                    <DropdownMenuItem
                      key={child.id}
                      onClick={() => onCategorySelect(child.id)}
                      className={`group flex transform items-center rounded-lg px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-all duration-300 hover:scale-[1.02] sm:text-sm ${
                        selectedCategoryId === child.id
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center">
                        <div
                          className="mr-2 h-2 w-2 rounded-full"
                          style={{ backgroundColor: selectedCategoryId === child.id ? 'white' : child.color }}
                        ></div>
                        <span className="ml-2">{child.name}</span>
                        {child._count && (
                          <span
                            className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                              selectedCategoryId === child.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {child._count.articles}
                          </span>
                        )}
                      </div>
                      {selectedCategoryId === child.id && (
                        <ArrowRight className="ml-2 h-3 w-3 transition-transform group-hover:translate-x-1" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                className={`group flex transform items-center rounded-xl px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-all duration-300 hover:scale-[1.02] sm:px-4 sm:py-3 sm:text-sm ${
                  isCategorySelected(category)
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25'
                    : 'border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 hover:shadow-md'
                } `}
                onClick={() => onCategorySelect(category.id)}
                variant={isCategorySelected(category) ? 'default' : 'outline'}
              >
                <div className="flex items-center">
                  <div
                    className="mr-2 h-2 w-2 rounded-full"
                    style={{ backgroundColor: isCategorySelected(category) ? 'white' : category.color }}
                  ></div>
                  <span>{category.name}</span>
                  {category._count && (
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-xs font-semibold ${
                        isCategorySelected(category)
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {category._count.articles}
                    </span>
                  )}
                </div>
                {isCategorySelected(category) && (
                  <ArrowRight className="ml-2 h-3 w-3 transition-transform group-hover:translate-x-1" />
                )}
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
