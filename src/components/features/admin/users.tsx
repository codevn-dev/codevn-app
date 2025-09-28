'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, ArrowUpDown, ChevronUp, ChevronDown, Users } from 'lucide-react';
import { AvatarWithDropdown } from '@/components/ui/avatar-with-dropdown';
import { useAuthState } from '@/hooks/use-auth-state';
import { isAdmin } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils/time-format';
import { User } from '@/types/shared/auth';
import { UserListResponse } from '@/types/shared/user';
import { RoleLevel, UserRole } from '@/types/shared/roles';
import { apiGet, apiPut } from '@/lib/utils/api-client';
import { useI18n } from '@/components/providers';

interface UsersProps {
  onDataChange?: (total: number) => void;
}

export function UsersManagement({ onDataChange }: UsersProps) {
  const { t } = useI18n();
  const { user } = useAuthState();
  const router = useRouter();
  const currentUserId = user?.id;

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'joined'>('joined');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'member'>('all');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Fetch users data
  const fetchUsers = useCallback(async () => {
    if (!user || user.role !== RoleLevel.admin) {
      setLoading(false);
      return;
    }

    try {
      const params = new URLSearchParams({
        search: searchTerm,
        sortBy: sortBy,
        sortOrder: sortOrder,
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        role: roleFilter === 'all' ? '' : roleFilter,
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

      // Notify parent component about total users
      if (onDataChange) {
        onDataChange(usersData.pagination.total);
      }
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }, [user, searchTerm, sortBy, sortOrder, currentPage, itemsPerPage, roleFilter, onDataChange]);

  // Reset to first page when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy, sortOrder, roleFilter]);

  // Fetch data when any relevant state changes
  useEffect(() => {
    if (user && isAdmin(user.role)) {
      fetchUsers();
    }
  }, [fetchUsers, user]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!user || user.role !== RoleLevel.admin) {
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
      await apiPut<User>('/api/admin/users', { userId, role: newRole });

      // Update local state immediately for better UX
      setUsers((prevUsers) =>
        prevUsers.map((u) => (u.id === userId ? { ...u, role: newRole as UserRole } : u))
      );
    } catch {
      alert('Error updating user role. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="border-brand h-8 w-8 animate-spin rounded-full border-2 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold sm:text-xl">{t('admin.userManagement')}</h2>
        <div className="text-xs text-gray-500 sm:text-sm">
          {t('admin.showing')} {users.length} {t('admin.usersAbbrev')} {t('admin.onPage')}{' '}
          {pagination.currentPage} {t('admin.of')} {pagination.totalPages} ({pagination.totalItems}{' '}
          {t('admin.totalSuffix')})
        </div>
      </div>

      {/* Search, Filter and Sort Controls */}
      <div className="shadow-brand/20 mb-6 rounded-lg bg-white p-4 shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row">
          {/* Search Input */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
              <Input
                placeholder={t('admin.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="focus:ring-brand/20 pl-10 focus:ring-2"
              />
            </div>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <Select value={roleFilter} onValueChange={(value: any) => setRoleFilter(value)}>
              <SelectTrigger className="focus:ring-brand/20 bg-brand/10 text-brand-600 focus:ring-2">
                <SelectValue>
                  {roleFilter === 'all'
                    ? t('admin.table.role')
                    : roleFilter === 'admin'
                      ? t('common.role.admin')
                      : roleFilter === 'member'
                        ? t('common.role.member')
                        : 'Filter by role'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.table.role')}</SelectItem>
                <SelectItem value="admin">{t('common.role.admin')}</SelectItem>
                <SelectItem value="member">{t('common.role.member')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort Controls */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="back"
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
                sortBy === 'name' ? 'bg-brand/10 text-brand-600' : ''
              }`}
            >
              {sortBy === 'name' ? (
                sortOrder === 'asc' ? (
                  <ChevronUp className="mr-1 h-4 w-4" />
                ) : (
                  <ChevronDown className="mr-1 h-4 w-4" />
                )
              ) : (
                <ArrowUpDown className="mr-1 h-4 w-4" />
              )}
              {t('admin.sort.name')}
            </Button>

            <Button
              variant="back"
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
                sortBy === 'joined' ? 'bg-brand/10 text-brand-600' : ''
              }`}
            >
              {sortBy === 'joined' ? (
                sortOrder === 'asc' ? (
                  <ChevronUp className="mr-1 h-4 w-4" />
                ) : (
                  <ChevronDown className="mr-1 h-4 w-4" />
                )
              ) : (
                <ArrowUpDown className="mr-1 h-4 w-4" />
              )}
              {t('admin.sort.joined')}
            </Button>
          </div>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <Users className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">{t('common.noUsersFound')}</h3>
          <p className="text-gray-500">{t('common.usersWillAppearHere')}</p>
        </div>
      ) : (
        <div className="shadow-brand/30 overflow-hidden rounded-lg bg-white/90 shadow-2xl drop-shadow-2xl backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-4 py-3 text-left text-[10px] font-medium tracking-wider text-gray-500 uppercase sm:px-6 sm:py-4 sm:text-xs">
                    {t('common.role.member')}
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-medium tracking-wider text-gray-500 uppercase sm:px-6 sm:py-4 sm:text-xs">
                    {t('admin.table.role')}
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-medium tracking-wider text-gray-500 uppercase sm:px-6 sm:py-4 sm:text-xs">
                    {t('admin.table.joined')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/90 backdrop-blur-sm">
                {users.map((user) => (
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
                              className="hover:text-brand transition-colors hover:underline"
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
                          className={`focus:ring-brand/20 h-9 w-36 transition-colors focus:ring-2 sm:h-10 sm:w-40 ${
                            user.id === currentUserId ||
                            (isAdmin(user.role) && user.id !== currentUserId)
                              ? 'cursor-not-allowed bg-gray-100 opacity-60'
                              : 'bg-white hover:border-gray-400'
                          }`}
                        >
                          <SelectValue>
                            {user.role === 'admin' ? (
                              <div className="flex items-center space-x-2">
                                <div className="bg-brand h-2 w-2 rounded-full"></div>
                                <span>{t('common.role.admin')}</span>
                              </div>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                <span>{t('common.role.member')}</span>
                              </div>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="z-50 min-w-[160px]">
                          <SelectItem value="member">
                            <div className="flex items-center space-x-2">
                              <div className="h-2 w-2 rounded-full bg-green-500"></div>
                              <span>{t('common.role.member')}</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="admin">
                            <div className="flex items-center space-x-2">
                              <div className="bg-brand h-2 w-2 rounded-full"></div>
                              <span>{t('common.role.admin')}</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap sm:px-6 sm:py-4">
                      <span className="text-xs font-medium text-gray-600 sm:text-sm">
                        {formatDateTime(user.createdAt)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-col items-start justify-between gap-3 border-t border-gray-100 bg-white px-4 py-5 sm:flex-row sm:items-center sm:px-6">
              <div className="flex items-center text-sm text-gray-700">
                <span>
                  {t('admin.page')} {pagination.currentPage} {t('admin.of')} {pagination.totalPages}{' '}
                  | {pagination.itemsPerPage} {t('admin.usersPerPage')}
                </span>
              </div>
              <div className="flex w-full flex-wrap items-center gap-2 overflow-x-auto sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={!pagination.hasPrevPage}
                  className="border-transparent bg-transparent px-3 py-1 shadow-none hover:bg-gray-50"
                >
                  {t('admin.previous')}
                </Button>

                <div className="flex flex-wrap items-center gap-1">
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
                              ? 'bg-brand hover:bg-brand-600 shadow-brand/30 text-white shadow-2xl drop-shadow-2xl'
                              : 'border-transparent bg-transparent shadow-none hover:bg-gray-50'
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
                  className="border-transparent bg-transparent px-3 py-1 shadow-none hover:bg-gray-50"
                >
                  {t('admin.next')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
