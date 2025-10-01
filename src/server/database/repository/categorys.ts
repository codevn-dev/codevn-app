import { getDb } from '..';
import { categories, articleCategories } from '../schema';
import { eq, count, and, isNull, sql } from 'drizzle-orm';
import { CategoryWithCounts } from '@/types/shared/category';

export class CategoryRepository {
  async findById(id: string) {
    return await getDb().query.categories.findFirst({
      where: and(eq(categories.id, id), isNull(categories.deletedAt)),
      with: {
        createdBy: {
          columns: {
            name: true,
          },
        },
        parent: {
          columns: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  async findBySlug(slug: string) {
    return await getDb().query.categories.findFirst({
      where: and(eq(categories.slug, slug), isNull(categories.deletedAt)),
      with: {
        createdBy: {
          columns: {
            name: true,
          },
        },
        parent: {
          columns: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
  }

  async findAllWithCounts(): Promise<CategoryWithCounts[]> {
    const allCategories = await getDb().query.categories.findMany({
      where: isNull(categories.deletedAt),
      with: {
        createdBy: {
          columns: {
            name: true,
          },
        },
        parent: {
          columns: {
            id: true,
            name: true,
            slug: true,
          },
        },
        children: {
          columns: {
            id: true,
            name: true,
            slug: true,
            color: true,
            order: true,
            createdAt: true,
            updatedAt: true,
          },
          with: {
            createdBy: {
              columns: {
                name: true,
              },
            },
            parent: {
              columns: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
          orderBy: (categories, { asc }) => [asc(categories.order)],
        },
      },
      orderBy: (categories, { asc }) => [asc(categories.order)],
    });

    // Get article counts and children counts for each category
    const categoriesWithCounts = await Promise.all(
      allCategories.map(async (category) => {
        const [articleCount, childrenCount] = await Promise.all([
          getDb()
            .select({ count: count() })
            .from(articleCategories)
            .where(eq(articleCategories.categoryId, category.id)),
          getDb()
            .select({ count: count() })
            .from(categories)
            .where(eq(categories.parentId, category.id)),
        ]);

        // Get article counts for children categories
        const childrenWithCounts = await Promise.all(
          (category.children || []).map(async (child) => {
            const childArticleCount = await getDb()
              .select({ count: count() })
              .from(articleCategories)
              .where(eq(articleCategories.categoryId, child.id));

            return {
              ...child,
              _count: {
                articles: childArticleCount[0]?.count || 0,
                children: 0, // Children categories don't have sub-children in this structure
              },
            };
          })
        );

        return {
          ...category,
          children: childrenWithCounts,
          _count: {
            articles: articleCount[0]?.count || 0,
            children: childrenCount[0]?.count || 0,
          },
        };
      })
    );

    // Filter to only return root categories (categories without parentId)
    return categoriesWithCounts.filter((category) => !category.parentId);
  }

  async findAllForAdmin(): Promise<CategoryWithCounts[]> {
    const allCategories = await getDb().query.categories.findMany({
      where: isNull(categories.deletedAt),
      with: {
        createdBy: {
          columns: {
            name: true,
          },
        },
        parent: {
          columns: {
            id: true,
            name: true,
            slug: true,
          },
        },
        children: {
          columns: {
            id: true,
            name: true,
            slug: true,
            color: true,
            order: true,
            createdAt: true,
            updatedAt: true,
          },
          with: {
            createdBy: {
              columns: {
                name: true,
              },
            },
            parent: {
              columns: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
          orderBy: (categories, { asc }) => [asc(categories.order)],
        },
      },
      orderBy: (categories, { asc }) => [asc(categories.order)],
    });

    // Filter to only return root categories (categories without parentId)
    const filtered = allCategories.filter((category) => !category.parentId);
    // Add _count shape to satisfy CategoryWithCounts
    return filtered.map((category) => ({
      ...category,
      _count: {
        articles: 0,
        children: (category.children || []).length,
      },
      children: (category.children || []).map((child) => ({
        ...child,
        _count: {
          articles: 0,
          children: 0,
        },
      })),
    }));
  }

  async create(categoryData: {
    name: string;
    color?: string;
    parentId?: string;
    order?: string;
    createdById: string;
  }): Promise<
    Array<{
      id: string;
      name: string;
      slug: string;
      color: string;
      parentId: string | null;
      order: string;
      createdById: string;
      createdAt: Date;
      updatedAt: Date | null;
    }>
  > {
    const slug = categoryData.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // If no order is provided, generate one based on existing categories
    let order = categoryData.order;
    if (!order) {
      const existingCategories = await getDb()
        .select({ order: categories.order })
        .from(categories)
        .where(
          categoryData.parentId
            ? eq(categories.parentId, categoryData.parentId)
            : isNull(categories.parentId)
        )
        .orderBy(categories.order);

      // Generate next order value
      const lastOrder = existingCategories[existingCategories.length - 1]?.order || '0';
      const nextOrderNum = parseInt(lastOrder) + 1;
      order = nextOrderNum.toString();
    }

    return await getDb()
      .insert(categories)
      .values({
        name: categoryData.name,
        slug,
        color: categoryData.color || '#3B82F6',
        parentId: categoryData.parentId || null,
        order,
        createdById: categoryData.createdById,
      })
      .returning();
  }

  async checkNameExists(name: string, excludeId?: string): Promise<boolean> {
    const nameLower = name.toLowerCase();
    const whereCondition = excludeId
      ? and(
          isNull(categories.deletedAt),
          sql`lower(${categories.name}) = ${nameLower}`,
          sql`${categories.id} != ${excludeId}`
        )
      : and(isNull(categories.deletedAt), sql`lower(${categories.name}) = ${nameLower}`);

    const existing = await getDb().query.categories.findFirst({ where: whereCondition });
    return !!existing;
  }

  async update(
    id: string,
    updateData: {
      name?: string;
      color?: string;
      parentId?: string | null;
      order?: string;
    }
  ): Promise<
    Array<{
      id: string;
      name: string;
      slug: string;
      color: string;
      parentId: string | null;
      order: string;
      createdById: string;
      createdAt: Date;
      updatedAt: Date | null;
    }>
  > {
    const dataToUpdate: any = { ...updateData };

    // Generate new slug from name if name is being updated
    if (updateData.name) {
      dataToUpdate.slug = updateData.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    }

    if (Object.keys(dataToUpdate).length > 0) {
      dataToUpdate.updatedAt = new Date();
    }

    return await getDb()
      .update(categories)
      .set(dataToUpdate)
      .where(eq(categories.id, id))
      .returning();
  }

  async delete(id: string) {
    // Soft delete: set deleted_at timestamp instead of actually deleting
    return await getDb()
      .update(categories)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(categories.id, id));
  }

  async getChildrenCount(categoryId: string) {
    const result = await getDb()
      .select({ count: count() })
      .from(categories)
      .where(eq(categories.parentId, categoryId));

    return result[0]?.count || 0;
  }

  async getArticlesCount(categoryId: string) {
    const result = await getDb()
      .select({ count: count() })
      .from(articleCategories)
      .where(eq(articleCategories.categoryId, categoryId));

    return result[0]?.count || 0;
  }

  async findChildrenIds(parentId: string): Promise<string[]> {
    const rows = await getDb()
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.parentId, parentId), isNull(categories.deletedAt)));
    return rows.map((r) => r.id);
  }

  async reorderCategories(
    reorderData: Array<{ id: string; order: string; parentId?: string | null }>
  ): Promise<void> {
    const db = getDb();

    // Use transaction to ensure all updates succeed or fail together
    await db.transaction(async (tx) => {
      for (const item of reorderData) {
        await tx
          .update(categories)
          .set({
            order: item.order,
            parentId: item.parentId,
            updatedAt: new Date(),
          })
          .where(eq(categories.id, item.id));
      }
    });
  }
}

export const categoryRepository = new CategoryRepository();
