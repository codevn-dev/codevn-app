'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { AvatarWithDropdown } from '@/components/ui/avatar-with-dropdown';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Users,
  Tag,
  Edit,
  Trash2,
  Search,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  XCircle,
} from 'lucide-react';
import { useAuthState } from '@/hooks/use-auth-state';
import { ClientOnly } from '@/components/layout';
import { isAdmin } from '@/lib/utils';
import { Category } from '@/types/shared/category';
import { User } from '@/types/shared/auth';
import { UserListResponse } from '@/types/shared/user';
import { SuccessResponse } from '@/types/shared/common';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/utils/api-client';

function AdminPageContent() {
  const { user, isAuthenticated, isLoading } = useAuthState();
  const router = useRouter();
  const currentUserId = user?.id;
  const [activeTab, setActiveTab] = useState<'categories' | 'users' | 'articles'>('users');
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'joined'>('joined');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    parentId: '',
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Category | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create stable reference for user to prevent unnecessary re-renders
  const stableUser = useMemo(() => user, [user]);

  // Fetch data function for manual calls
  const fetchData = useCallback(async () => {
    // Check if user is admin before making API calls
    if (!user || user.role !== 'admin') {
      setLoading(false);
      return;
    }

    try {
      if (activeTab === 'users') {
        // Only fetch users data when on users tab
        const params = new URLSearchParams({
          search: searchTerm,
          sortBy: sortBy,
          sortOrder: sortOrder,
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
        });

        const usersData = await apiGet<UserListResponse>(`/api/admin/users?${params}`);
        setUsers(usersData.users);
        setPagination({
          currentPage: usersData.pagination.page,
          totalPages: usersData.pagination.totalPages,
          totalItems: usersData.pagination.total,
          itemsPerPage: usersData.pagination.limit,
          hasNextPage: usersData.pagination.page < usersData.pagination.totalPages,
          hasPrevPage: usersData.pagination.page > 1,
        });
      } else if (activeTab === 'categories') {
        // Only fetch categories data when on categories tab
        const categoriesData = await apiGet<Category[]>('/api/admin/categories');
        setCategories(categoriesData);
      }
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }, [user, activeTab, searchTerm, sortBy, sortOrder, currentPage, itemsPerPage]);

  // Reset to first page when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, sortOrder]);

  // Fetch data when any relevant state changes
  useEffect(() => {
    if (stableUser && isAdmin(stableUser.role)) {
      fetchData();
    }
  }, [activeTab, searchTerm, sortBy, sortOrder, currentPage, stableUser, fetchData]);

  useEffect(() => {
    // Wait for auth state to be determined
    if (isLoading) {
      return;
    }

    // If not authenticated, redirect to home
    if (!isAuthenticated) {
      router.push('/');
      return;
    }

    // If authenticated, check role
    if (user) {
      if (user.role !== 'admin') {
        router.push('/');
      }
    } else {
      router.push('/');
    }
  }, [user, isAuthenticated, isLoading, router]);

  // Show loading while auth state is being determined
  if (isLoading) {
    return <LoadingScreen />;
  }

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || user.role !== 'admin') {
      setCategoryError('Only admin can create categories');
      return;
    }

    setIsSubmitting(true);
    setCategoryError(null);

    try {
      const _res = await apiPost<Category>('/api/admin/categories', categoryForm);
      setCategoryForm({ name: '', description: '', color: '#3B82F6', parentId: '' });
      setShowCategoryForm(false);
      setCategoryError(null);
      fetchData();
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
      description: category.description || '',
      color: category.color,
      parentId: category.parentId || '',
    });
    setShowCategoryForm(true);
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingCategory) return;

    if (!user || user.role !== 'admin') {
      setCategoryError('Only admin can update categories');
      return;
    }

    setIsSubmitting(true);
    setCategoryError(null);

    try {
      const _res = await apiPut<Category>('/api/admin/categories', {
        id: editingCategory.id,
        ...categoryForm,
      });
      setCategoryForm({ name: '', description: '', color: '#3B82F6', parentId: '' });
      setShowCategoryForm(false);
      setEditingCategory(null);
      setCategoryError(null);
      fetchData();
    } catch (error: any) {
      const errorMessage =
        error?.response?.error || error?.message || 'Network error. Please try again.';
      setCategoryError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (!user || user.role !== 'admin') {
      setDeleteError('Only admin can delete categories');
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const _res = await apiDelete<SuccessResponse>(`/api/admin/categories?id=${category.id}`);
      setShowDeleteConfirm(null);
      setDeleteError(null);
      fetchData();
    } catch {
      setDeleteError('Network error. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const resetForm = () => {
    setCategoryForm({ name: '', description: '', color: '#3B82F6', parentId: '' });
    setShowCategoryForm(false);
    setEditingCategory(null);
    setCategoryError(null);
  };

  // Server-side pagination - users are already filtered and paginated by API
  const currentUsers = users;
  const totalPages = pagination.totalPages;

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!user || user.role !== 'admin') {
      alert('Only admin can change user roles');
      return;
    }

    // Find the target user to check their current role
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) {
      alert('User not found');
      return;
    }

    // Prevent admin from updating another admin's role
    if (isAdmin(targetUser.role) && userId !== currentUserId) {
      alert('You cannot change the role of another admin');
      return;
    }

    try {
      const _res = await apiPut<User>('/api/admin/users', { userId, role: newRole });
      // Update local state immediately for better UX
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === userId ? { ...u, role: newRole as 'user' | 'admin' } : u))
      );
      // Also refresh data from server
      fetchData();
    } catch {
      alert('Error updating user role. Please try again.');
    }
  };

  // Show loading while auth state is being determined
  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="text-center">
          <p className="text-gray-600">Access denied. Admin privileges required.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-white p-6 shadow-2xl">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Admin Panel</h1>
          </div>

          {/* Simple Tab Navigation */}
          <div className="mb-6 sm:mb-8">
            <div className="rounded-xl bg-white/80 p-4 shadow-xl shadow-gray-300/60 backdrop-blur-sm">
              <nav className="no-scrollbar -mb-px flex space-x-6 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('users')}
                  className={`border-b-2 px-1 py-2 text-sm font-medium ${
                    activeTab === 'users'
                      ? 'border-[#B8956A] text-[#B8956A]'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center">
                    <Users className="mr-2 h-4 w-4" />
                    Users ({pagination.totalItems})
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('categories')}
                  className={`border-b-2 px-1 py-2 text-sm font-medium ${
                    activeTab === 'categories'
                      ? 'border-[#B8956A] text-[#B8956A]'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center">
                    <Tag className="mr-2 h-4 w-4" />
                    Categories
                  </div>
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'users' && (
            <div className="mt-6">
              <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold sm:text-xl">Users Management</h2>
                <div className="text-xs text-gray-500 sm:text-sm">
                  Showing: {currentUsers.length} user(s) on page {pagination.currentPage} of{' '}
                  {pagination.totalPages} ({pagination.totalItems} total)
                </div>
              </div>

              {/* Search and Sort Controls */}
              <div className="mb-6 rounded-lg bg-white p-4">
                <div className="flex flex-col gap-4 sm:flex-row">
                  {/* Search Input */}
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                      <Input
                        placeholder="Search by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 focus:ring-2 focus:ring-[#B8956A]/20"
                      />
                    </div>
                  </div>

                  {/* Sort Controls */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (sortBy === 'name') {
                          // Toggle order for name
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          // Switch to name with asc order
                          setSortBy('name');
                          setSortOrder('asc');
                        }
                      }}
                      className={`px-3 transition-colors ${
                        sortBy === 'name'
                          ? 'bg-[#B8956A]/10 text-[#A6825A]'
                          : 'bg-white text-gray-700'
                      }`}
                    >
                      <ArrowUpDown className="mr-1 h-4 w-4" />
                      Name
                      {sortBy === 'name' && (
                        <span className="ml-1">
                          {sortOrder === 'asc' ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </span>
                      )}
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (sortBy === 'joined') {
                          // Toggle order for joined
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          // Switch to joined with asc order
                          setSortBy('joined');
                          setSortOrder('asc');
                        }
                      }}
                      className={`px-3 transition-colors ${
                        sortBy === 'joined'
                          ? 'bg-[#B8956A]/10 text-[#A6825A]'
                          : 'bg-white text-gray-700'
                      }`}
                    >
                      <ArrowUpDown className="mr-1 h-4 w-4" />
                      Joined
                      {sortBy === 'joined' && (
                        <span className="ml-1">
                          {sortOrder === 'asc' ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </span>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {users.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                    <Users className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="mb-2 text-lg font-medium text-gray-900">No users found</h3>
                  <p className="text-gray-500">Users will appear here once they register</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg bg-white/90 shadow-xl shadow-gray-300/60 backdrop-blur-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-[10px] font-medium tracking-wider text-gray-500 uppercase sm:px-6 sm:py-4 sm:text-xs">
                            User
                          </th>
                          <th className="px-4 py-3 text-left text-[10px] font-medium tracking-wider text-gray-500 uppercase sm:px-6 sm:py-4 sm:text-xs">
                            Role
                          </th>
                          <th className="px-4 py-3 text-left text-[10px] font-medium tracking-wider text-gray-500 uppercase sm:px-6 sm:py-4 sm:text-xs">
                            Joined
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white/90 backdrop-blur-sm">
                        {currentUsers.map((user, _index) => (
                          <tr key={user.id} className="transition-colors hover:bg-gray-50/50">
                            <td className="px-4 py-3 whitespace-nowrap sm:px-6 sm:py-4">
                              <div className="flex items-center">
                                <div className="h-10 w-10 flex-shrink-0 sm:h-12 sm:w-12">
                                  <AvatarWithDropdown
                                    user={{
                                      id: user.id,
                                      name: user.name,
                                      email: user.email,
                                      avatar: user.avatar || undefined,
                                      role: user.role,
                                      createdAt: user.createdAt,
                                    }}
                                    size="lg"
                                    className="shadow-sm ring-2 ring-white"
                                  />
                                </div>
                                <div className="ml-3 sm:ml-4">
                                  <div className="line-clamp-1 max-w-[160px] text-sm font-semibold text-gray-900 sm:max-w-none">
                                    <button
                                      onClick={() => router.push(`/users/${user.id}`)}
                                      className="transition-colors hover:text-[#B8956A] hover:underline"
                                    >
                                      {user.name}
                                    </button>
                                  </div>
                                  <div className="line-clamp-1 max-w-[200px] text-xs text-gray-500 sm:max-w-none sm:text-sm">
                                    {user.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap sm:px-6 sm:py-4">
                              <Select
                                value={user.role}
                                onValueChange={(newRole) => {
                                  handleRoleChange(user.id, newRole);
                                }}
                                disabled={
                                  user.id === currentUserId ||
                                  (isAdmin(user.role) && user.id !== currentUserId)
                                }
                              >
                                <SelectTrigger
                                  className={`h-9 w-36 transition-colors focus:ring-2 focus:ring-[#B8956A]/20 sm:h-10 sm:w-40 ${
                                    user.id === currentUserId ||
                                    (isAdmin(user.role) && user.id !== currentUserId)
                                      ? 'cursor-not-allowed bg-gray-100 opacity-60'
                                      : 'bg-white hover:border-gray-400'
                                  }`}
                                >
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="z-50 min-w-[160px]">
                                  <SelectItem value="user">
                                    <div className="flex items-center space-x-2">
                                      <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                      <span>User</span>
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="admin">
                                    <div className="flex items-center space-x-2">
                                      <div className="h-2 w-2 rounded-full bg-[#B8956A]"></div>
                                      <span>Admin</span>
                                    </div>
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap sm:px-6 sm:py-4">
                              <span className="text-xs font-medium text-gray-600 sm:text-sm">
                                {new Date(user.createdAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex flex-col items-start justify-between gap-3 bg-white px-4 py-4 sm:flex-row sm:items-center sm:px-6">
                      <div className="flex items-center text-sm text-gray-700">
                        <span>
                          Page {pagination.currentPage} of {pagination.totalPages} |{' '}
                          {pagination.itemsPerPage} users per page
                        </span>
                      </div>
                      <div className="flex w-full items-center space-x-2 overflow-x-auto sm:w-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(pagination.currentPage - 1)}
                          disabled={!pagination.hasPrevPage}
                          className="px-3 py-1"
                        >
                          Previous
                        </Button>

                        <div className="flex items-center space-x-1">
                          {(() => {
                            const pages = [];
                            const currentPage = pagination.currentPage;
                            const totalPages = pagination.totalPages;
                            const maxVisiblePages = 5;

                            if (totalPages <= maxVisiblePages + 1) {
                              // Show all pages if total is less than or equal to 6
                              for (let i = 1; i <= totalPages; i++) {
                                pages.push(i);
                              }
                            } else {
                              // Calculate start and end pages around current page
                              let startPage = Math.max(1, currentPage - 2);
                              const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

                              // Adjust start page if we're near the end
                              if (endPage - startPage < maxVisiblePages - 1) {
                                startPage = Math.max(1, endPage - maxVisiblePages + 1);
                              }

                              // Add first page if not included
                              if (startPage > 1) {
                                pages.push(1);
                                if (startPage > 2) {
                                  pages.push('...');
                                }
                              }

                              // Add pages around current page
                              for (let i = startPage; i <= endPage; i++) {
                                pages.push(i);
                              }

                              // Add last page if not included
                              if (endPage < totalPages) {
                                if (endPage < totalPages - 1) {
                                  pages.push('...');
                                }
                                pages.push(totalPages);
                              }
                            }

                            return pages.map((page, index) => {
                              if (page === '...') {
                                return (
                                  <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                                    ...
                                  </span>
                                );
                              }

                              return (
                                <Button
                                  key={page}
                                  variant={pagination.currentPage === page ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => handlePageChange(page as number)}
                                  className={`min-w-[40px] px-3 py-1 ${
                                    pagination.currentPage === page
                                      ? 'bg-[#B8956A] text-white hover:bg-[#A6825A]'
                                      : 'hover:bg-gray-50'
                                  }`}
                                >
                                  {page}
                                </Button>
                              );
                            });
                          })()}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePageChange(pagination.currentPage + 1)}
                          disabled={!pagination.hasNextPage}
                          className="px-3 py-1"
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="mt-6">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold sm:text-xl">Categories Management</h2>
                <Button className="w-full sm:w-auto" onClick={() => setShowCategoryForm(true)}>
                  <Plus className="mr-1 h-4 w-4" />
                  New Category
                </Button>
              </div>

              {showCategoryForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                  <div className="w-full max-w-lg rounded-lg bg-white p-6">
                    <div className="mb-4">
                      <h2 className="text-lg font-semibold">
                        {editingCategory ? 'Edit Category' : 'Create New Category'}
                      </h2>
                    </div>
                    <div>
                      <form
                        id="category-form"
                        onSubmit={editingCategory ? handleUpdateCategory : handleCreateCategory}
                        className="space-y-4"
                      >
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Name</label>
                          <Input
                            placeholder="Enter category name"
                            value={categoryForm.name}
                            onChange={(e) =>
                              setCategoryForm({ ...categoryForm, name: e.target.value })
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Description</label>
                          <Input
                            placeholder="Enter category description"
                            value={categoryForm.description}
                            onChange={(e) =>
                              setCategoryForm({ ...categoryForm, description: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Color</label>
                          <Input
                            type="color"
                            value={categoryForm.color}
                            onChange={(e) =>
                              setCategoryForm({ ...categoryForm, color: e.target.value })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Parent Category</label>
                          <Select
                            value={categoryForm.parentId || 'none'}
                            onValueChange={(value) =>
                              setCategoryForm({
                                ...categoryForm,
                                parentId: value === 'none' ? '' : value,
                              })
                            }
                          >
                            <SelectTrigger className="bg-white transition-colors focus:ring-2 focus:ring-[#B8956A]/20">
                              <SelectValue placeholder="Select a parent category (optional)" />
                            </SelectTrigger>
                            <SelectContent className="z-50">
                              <SelectItem value="none">No parent (Root category)</SelectItem>
                              {categories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Error Message */}
                        {categoryError && <p className="text-sm text-red-600">{categoryError}</p>}
                      </form>
                    </div>

                    <div className="mt-6 flex justify-end gap-2">
                      <Button variant="outline" onClick={resetForm}>
                        Cancel
                      </Button>
                      <Button type="submit" form="category-form" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            {editingCategory ? 'Updating...' : 'Creating...'}
                          </>
                        ) : editingCategory ? (
                          'Update'
                        ) : (
                          'Create'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:gap-6">
                {categories.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                      <Tag className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="mb-2 text-lg font-medium text-gray-900">No categories yet</h3>
                    <p className="mb-4 text-gray-500">
                      Get started by creating your first category
                    </p>
                    <Button onClick={() => setShowCategoryForm(true)}>
                      <Plus className="mr-1 h-4 w-4" />
                      New Category
                    </Button>
                  </div>
                ) : (
                  categories.map((category) => (
                    <Card
                      key={category.id}
                      className="shadow-xl shadow-gray-300/60 transition-all duration-300 hover:shadow-2xl hover:shadow-gray-400/70"
                    >
                      <CardHeader className="pb-4">
                        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                          <div className="flex flex-1 items-center">
                            <div
                              className="mr-3 h-5 w-5 rounded-full shadow-sm sm:mr-4"
                              style={{ backgroundColor: category.color }}
                            ></div>
                            <div className="flex-1">
                              <div className="mb-2 flex items-center gap-2 sm:gap-3">
                                <h3 className="line-clamp-2 text-lg font-bold text-gray-900 sm:text-xl">
                                  {category.name}
                                </h3>
                                <Badge>Root Category</Badge>
                              </div>
                              {category.description && (
                                <p className="mb-3 text-sm text-gray-600">{category.description}</p>
                              )}
                              <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-500 sm:text-sm">
                                <span className="font-medium">
                                  Created by {category.createdBy.name}
                                </span>
                                <span className="mx-2 hidden sm:inline">•</span>
                                <span>
                                  {new Date(category.createdAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                                {category.children && category.children.length > 0 && (
                                  <>
                                    <span className="mx-2 hidden sm:inline">•</span>
                                    <span className="font-medium text-[#B8956A]">
                                      {category.children.length} Sub Categories
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="ml-0 flex space-x-2 sm:ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditCategory(category)}
                            >
                              <Edit className="mr-1 h-4 w-4" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowDeleteConfirm(category)}
                              className="border-red-600 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="mr-1 h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      {/* Children Categories */}
                      {category.children && category.children.length > 0 && (
                        <CardBody className="pt-0">
                          <div className="rounded-lg bg-gray-50/50 p-6">
                            <h4 className="mb-4 flex items-center text-sm font-semibold text-gray-700">
                              <div className="mr-2 h-2 w-2 rounded-full bg-gray-400"></div>
                              Sub Categories ({category.children.length})
                            </h4>
                            <div className="grid gap-3">
                              {category.children.map((child: Category) => (
                                <Card
                                  key={child.id}
                                  className="bg-white/90 shadow-lg shadow-gray-300/60 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-gray-400/70"
                                >
                                  <CardBody className="p-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                      <div className="flex items-center">
                                        <div
                                          className="mr-3 h-4 w-4 rounded-full shadow-sm"
                                          style={{ backgroundColor: child.color }}
                                        ></div>
                                        <div>
                                          <h5 className="line-clamp-2 font-semibold text-gray-900">
                                            {child.name}
                                          </h5>
                                          {child.description && (
                                            <p className="mt-1 text-sm text-gray-600">
                                              {child.description}
                                            </p>
                                          )}
                                          <div className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
                                            <span>Created by {child.createdBy.name}</span>
                                            <span className="mx-2 hidden sm:inline">•</span>
                                            <span>
                                              {new Date(child.createdAt).toLocaleDateString(
                                                'en-US',
                                                {
                                                  year: 'numeric',
                                                  month: 'short',
                                                  day: 'numeric',
                                                }
                                              )}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex space-x-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleEditCategory(child)}
                                        >
                                          <Edit className="mr-1 h-3 w-3" />
                                          Edit
                                        </Button>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => setShowDeleteConfirm(child)}
                                          className="border-red-600 text-red-600 hover:bg-red-50"
                                        >
                                          <Trash2 className="mr-1 h-3 w-3" />
                                          Delete
                                        </Button>
                                      </div>
                                    </div>
                                  </CardBody>
                                </Card>
                              ))}
                            </div>
                          </div>
                        </CardBody>
                      )}
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-lg bg-white p-6">
                <h2 className="mb-4 text-lg font-semibold">Delete Category</h2>
                <p className="mb-6 text-gray-600">
                  Are you sure you want to delete &quot;{showDeleteConfirm?.name}&quot;? This action
                  cannot be undone.
                </p>

                {/* Error Message */}
                {deleteError && (
                  <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <XCircle className="h-5 w-5 text-red-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">Cannot Delete Category</h3>
                        <div className="mt-2 text-sm text-red-700">
                          <p>{deleteError}</p>
                          {deleteError.includes('articles') && (
                            <div className="mt-2">
                              <p className="font-medium">To delete this category:</p>
                              <ul className="mt-1 list-inside list-disc space-y-1">
                                <li>Move all articles to another category, or</li>
                                <li>Delete all articles in this category first</li>
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
                    Cancel
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
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-1 h-4 w-4" />
                        Delete
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <ClientOnly
      fallback={<LoadingScreen message="Loading admin panel..." size="lg" variant="default" />}
    >
      <AdminPageContent />
    </ClientOnly>
  );
}
