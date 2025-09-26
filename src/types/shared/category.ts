export interface Category {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  color: string;
  parentId: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  createdBy: {
    id: string;
    name: string;
  };
  parent?: Category | null;
  children?: Category[];
  _count: {
    articles: number;
    children: number;
  };
}

// Request types
export interface CreateCategoryRequest {
  name: string;
  description?: string;
  slug: string;
  color: string;
  parentId?: string;
}

export interface UpdateCategoryRequest {
  id: string;
  name?: string;
  description?: string;
  slug?: string;
  color?: string;
  parentId?: string;
}

// Response types
export interface CategoryResponse {
  category: Category;
}

export interface CategoryListResponse {
  categories: Category[];
}

export interface CreateCategoryResponse {
  message: string;
  category: Category;
}

export interface UpdateCategoryResponse {
  message: string;
  category: Category;
}

// Repository types for categories
export interface CategoryWithCounts {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  color: string;
  createdAt: Date;
  updatedAt: Date | null;
  createdBy: {
    name: string;
  };
  parent: {
    id: string;
    name: string;
    slug: string;
  } | null;
  children: Array<{
    id: string;
    name: string;
    description: string | null;
    slug: string;
    color: string;
    createdAt: Date;
    updatedAt: Date | null;
    createdBy: {
      name: string;
    };
    parent: {
      id: string;
      name: string;
      slug: string;
    } | null;
    _count: {
      articles: number;
      children: number;
    };
  }>;
  _count: {
    articles: number;
    children: number;
  };
}
