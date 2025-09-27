'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Users, Edit, Trash2 } from 'lucide-react';
import { useAuthState } from '@/hooks/use-auth-state';
import { RoleLevel } from '@/types/shared/roles';
import { SystemUserResponse } from '@/types/shared/auth';
import { SuccessResponse } from '@/types/shared/common';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/utils/api-client';
import { useI18n } from '@/components/providers';
import { AvatarUpload } from '@/components/features/upload';
import { formatDateTime } from '@/lib/utils/time-format';

interface SystemUsersProps {
  onDataChange?: () => void;
}

export function SystemUsers({ onDataChange }: SystemUsersProps) {
  const { t } = useI18n();
  const { user } = useAuthState();

  const [systemUsers, setSystemUsers] = useState<SystemUserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSystemUserForm, setShowSystemUserForm] = useState(false);
  const [editingSystemUser, setEditingSystemUser] = useState<SystemUserResponse | null>(null);
  const [systemUserForm, setSystemUserForm] = useState({
    name: '',
    email: '',
    avatar: '',
  });
  const [systemUserError, setSystemUserError] = useState<string | null>(null);
  const [isSubmittingSystemUser, setIsSubmittingSystemUser] = useState(false);
  const [showDeleteSystemUserConfirm, setShowDeleteSystemUserConfirm] =
    useState<SystemUserResponse | null>(null);
  const [isDeletingSystemUser, setIsDeletingSystemUser] = useState(false);
  const [_, setIsUploadingAvatar] = useState(false);

  // Fetch system users data
  const fetchSystemUsers = useCallback(async () => {
    if (!user || user.role !== RoleLevel.admin) {
      setLoading(false);
      return;
    }

    try {
      const systemUsersData = await apiGet<SystemUserResponse[]>('/api/system-users');
      setSystemUsers(systemUsersData);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch data when component mounts
  useEffect(() => {
    if (user && user.role === RoleLevel.admin) {
      fetchSystemUsers();
    }
  }, [fetchSystemUsers, user]);

  // System user management functions
  const handleCreateSystemUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || user.role !== RoleLevel.admin) {
      setSystemUserError(t('admin.systemUser.createError'));
      return;
    }

    setIsSubmittingSystemUser(true);
    setSystemUserError(null);

    try {
      await apiPost<SystemUserResponse>('/api/system-users', systemUserForm);
      setSystemUserForm({ name: '', email: '', avatar: '' });
      setShowSystemUserForm(false);
      setSystemUserError(null);
      fetchSystemUsers();
      onDataChange?.();
    } catch (error: any) {
      const errorMessage =
        error?.response?.error || error?.message || 'Network error. Please try again.';
      setSystemUserError(errorMessage);
    } finally {
      setIsSubmittingSystemUser(false);
    }
  };

  const handleEditSystemUser = (systemUser: SystemUserResponse) => {
    setEditingSystemUser(systemUser);
    setSystemUserForm({
      name: systemUser.name,
      email: systemUser.email,
      avatar: systemUser.avatar || '',
    });
    setShowSystemUserForm(true);
  };

  const handleUpdateSystemUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingSystemUser) return;

    if (!user || user.role !== RoleLevel.admin) {
      setSystemUserError(t('admin.systemUser.updateError'));
      return;
    }

    setIsSubmittingSystemUser(true);
    setSystemUserError(null);

    try {
      await apiPut<SystemUserResponse>(`/api/system-users/${editingSystemUser.id}`, systemUserForm);
      setSystemUserForm({ name: '', email: '', avatar: '' });
      setShowSystemUserForm(false);
      setEditingSystemUser(null);
      setSystemUserError(null);
      fetchSystemUsers();
      onDataChange?.();
    } catch (error: any) {
      const errorMessage =
        error?.response?.error || error?.message || 'Network error. Please try again.';
      setSystemUserError(errorMessage);
    } finally {
      setIsSubmittingSystemUser(false);
    }
  };

  const handleDeleteSystemUser = async (systemUser: SystemUserResponse) => {
    if (!user || user.role !== RoleLevel.admin) {
      alert('Only admin can delete system users');
      return;
    }

    setIsDeletingSystemUser(true);

    try {
      await apiDelete<SuccessResponse>(`/api/system-users/${systemUser.id}`);
      setShowDeleteSystemUserConfirm(null);
      fetchSystemUsers();
      onDataChange?.();
    } catch {
      alert(t('admin.systemUser.deleteError'));
    } finally {
      setIsDeletingSystemUser(false);
    }
  };

  const resetSystemUserForm = () => {
    setSystemUserForm({ name: '', email: '', avatar: '' });
    setShowSystemUserForm(false);
    setEditingSystemUser(null);
    setSystemUserError(null);
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
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold sm:text-xl">{t('admin.systemUsersManagement')}</h2>
        <Button className="w-full sm:w-auto" onClick={() => setShowSystemUserForm(true)}>
          <Plus className="mr-1 h-4 w-4" />
          {t('admin.newSystemUser')}
        </Button>
      </div>

      {/* System User Form Modal */}
      {showSystemUserForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/20 pt-8 backdrop-blur-sm">
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4">
              <h2 className="text-lg font-semibold">
                {editingSystemUser ? `${t('admin.updateSystemUser')}` : t('admin.newSystemUser')}
              </h2>
            </div>

            {/* Avatar Upload Section */}
            <div className="mb-6 flex justify-center">
              <AvatarUpload
                isSystemUser={true}
                systemUserId={editingSystemUser?.id || 'new'}
                currentAvatar={systemUserForm.avatar || editingSystemUser?.avatar}
                onAvatarChange={(avatar) =>
                  setSystemUserForm({ ...systemUserForm, avatar: avatar || '' })
                }
                onUploadStart={() => setIsUploadingAvatar(true)}
                onUploadEnd={() => setIsUploadingAvatar(false)}
                size="lg"
              />
            </div>

            <form
              id="system-user-form"
              onSubmit={editingSystemUser ? handleUpdateSystemUser : handleCreateSystemUser}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('common.name')}</label>
                <Input
                  placeholder={t('admin.systemUser.namePlaceholder')}
                  value={systemUserForm.name}
                  onChange={(e) => setSystemUserForm({ ...systemUserForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('common.email')}</label>
                <Input
                  type="email"
                  placeholder={t('admin.systemUser.emailPlaceholder')}
                  value={systemUserForm.email}
                  onChange={(e) => setSystemUserForm({ ...systemUserForm, email: e.target.value })}
                  required
                />
              </div>

              {systemUserError && <p className="text-sm text-red-600">{systemUserError}</p>}

              <div className="mt-6 flex justify-end gap-2">
                <Button variant="back" onClick={resetSystemUserForm}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" variant="primary" disabled={isSubmittingSystemUser}>
                  {isSubmittingSystemUser ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {editingSystemUser ? t('common.saving') : t('common.saving')}
                    </>
                  ) : editingSystemUser ? (
                    t('common.update')
                  ) : (
                    t('common.create')
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:gap-6">
        {systemUsers.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-gray-900">
              {t('admin.systemUser.noUsersYet')}
            </h3>
            <p className="mb-4 text-gray-500">{t('admin.systemUser.getStarted')}</p>
            <Button onClick={() => setShowSystemUserForm(true)}>
              <Plus className="mr-1 h-4 w-4" />
              {t('admin.newSystemUser')}
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6">
            {systemUsers.map((systemUser) => (
              <Card key={systemUser.id} className="transition-all duration-300">
                <CardHeader className="pb-4">
                  <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="flex flex-1 items-center">
                      <div className="h-10 w-10 flex-shrink-0 sm:h-12 sm:w-12">
                        <Avatar className="h-10 w-10 shadow-sm ring-2 ring-white sm:h-12 sm:w-12">
                          <AvatarImage src={systemUser.avatar || undefined} />
                          <AvatarFallback className="from-brand to-brand-600 bg-gradient-to-br text-white">
                            {systemUser.name?.charAt(0).toUpperCase() || 'S'}
                          </AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="ml-3 flex-1 sm:ml-4">
                        <div className="mb-2 flex items-center gap-2 sm:gap-3">
                          <h3 className="line-clamp-2 text-lg font-bold text-gray-900 sm:text-xl">
                            {systemUser.name}
                          </h3>
                          <Badge className="bg-blue-100 text-blue-800">
                            {t('common.role.system')}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-500 sm:text-sm">
                          <span>{systemUser.email}</span>
                          <span className="mx-2 hidden sm:inline">•</span>
                          <span>Created: {formatDateTime(systemUser.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="ml-0 flex space-x-2 sm:ml-4">
                      <Button
                        variant="back"
                        size="sm"
                        onClick={() => handleEditSystemUser(systemUser)}
                      >
                        <Edit className="mr-1 h-4 w-4" />
                        {t('common.edit')}
                      </Button>
                      <Button
                        variant="back"
                        size="sm"
                        onClick={() => setShowDeleteSystemUserConfirm(systemUser)}
                        className="border-red-600 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="mr-1 h-4 w-4" />
                        {t('common.delete')}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* System User Delete Confirmation Modal */}
      {showDeleteSystemUserConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="mb-4">
              <h2 className="text-lg font-semibold">{t('admin.systemUser.deleteTitle')}</h2>
            </div>
            <p className="mb-6 text-gray-600">
              {t('admin.systemUser.deleteConfirm')} &quot;{showDeleteSystemUserConfirm.name}
              &quot;
              {t('admin.systemUser.deleteConfirmSuffix')}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteSystemUserConfirm(null)}
                disabled={isDeletingSystemUser}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDeleteSystemUser(showDeleteSystemUserConfirm)}
                className="border-red-600 text-red-600 hover:bg-red-50"
                disabled={isDeletingSystemUser}
              >
                {isDeletingSystemUser ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-red-600 border-t-transparent" />
                    {t('common.saving')}
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-1 h-4 w-4" />
                    {t('common.delete')}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
