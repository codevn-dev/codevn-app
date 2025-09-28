import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Users, Trash2 } from 'lucide-react';
import { useAuthState } from '@/hooks/use-auth-state';
import { RoleLevel } from '@/types/shared/roles';
import { SystemUserResponse } from '@/types/shared/auth';
import { apiGet, apiDelete } from '@/lib/utils/api-client';
import { useI18n } from '@/components/providers';
import { SystemUserCard } from './system-user-card';
import { SystemUserForm } from './system-user-form';
import { ActionModal } from './action-modal';

interface SystemUsersProps {
  onDataChange?: () => void;
}

export function SystemUsers({ onDataChange }: SystemUsersProps) {
  const { t } = useI18n();
  const { user } = useAuthState();
  const [systemUsers, setSystemUsers] = useState<SystemUserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingSystemUser, setEditingSystemUser] = useState<SystemUserResponse | null>(null);
  const [showDeleteSystemUserConfirm, setShowDeleteSystemUserConfirm] =
    useState<SystemUserResponse | null>(null);
  const [isDeletingSystemUser, setIsDeletingSystemUser] = useState(false);
  const [showActionModal, setShowActionModal] = useState<SystemUserResponse | null>(null);

  const isAdmin = user?.role === RoleLevel.admin;

  useEffect(() => {
    fetchSystemUsers();
  }, [user, isAdmin]);

  const fetchSystemUsers = async () => {
    try {
      setLoading(true);
      const response = await apiGet<SystemUserResponse[]>('/api/system-users');
      setSystemUsers(response || []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSystemUser = () => {
    setEditingSystemUser(null);
    setShowCreateForm(true);
  };

  const handleEditSystemUser = (systemUser: SystemUserResponse) => {
    setEditingSystemUser(systemUser);
    setShowCreateForm(true);
  };

  const handleDeleteSystemUser = async (systemUser: SystemUserResponse) => {
    if (!isAdmin) {
      alert(t('admin.systemUser.onlyAdminCanDelete'));
      return;
    }

    setIsDeletingSystemUser(true);
    try {
      await apiDelete(`/api/system-users/${systemUser.id}`);
      setSystemUsers((prev) => prev.filter((u) => u.id !== systemUser.id));
      setShowDeleteSystemUserConfirm(null);
      onDataChange?.();
    } catch {
      alert(t('admin.systemUser.deleteError'));
    } finally {
      setIsDeletingSystemUser(false);
    }
  };

  const handleFormSuccess = () => {
    fetchSystemUsers();
    setShowCreateForm(false);
    setEditingSystemUser(null);
    onDataChange?.();
  };

  const handleCloseForm = () => {
    setShowCreateForm(false);
    setEditingSystemUser(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-4 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold sm:text-xl">{t('admin.systemUsers.title')}</h2>
        <Button className="w-full sm:w-auto" onClick={handleCreateSystemUser}>
          <Plus className="mr-1 h-4 w-4" />
          {t('admin.systemUsers.create')}
        </Button>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <SystemUserForm
          editingSystemUser={editingSystemUser}
          onClose={handleCloseForm}
          onSuccess={handleFormSuccess}
        />
      )}

      <div className="grid gap-4 sm:gap-6">
        {systemUsers.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <Users className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="mb-2 text-lg font-medium text-gray-900">
              {t('admin.systemUsers.noUsers')}
            </h3>
            <p className="mb-4 text-gray-500">{t('admin.systemUsers.noUsersDescription')}</p>
            <Button onClick={handleCreateSystemUser}>
              <Plus className="mr-1 h-4 w-4" />
              {t('admin.systemUsers.create')}
            </Button>
          </div>
        ) : (
          systemUsers.map((systemUser) => (
            <SystemUserCard
              key={systemUser.id}
              systemUser={systemUser}
              onEdit={handleEditSystemUser}
              onDelete={setShowDeleteSystemUserConfirm}
              onAction={setShowActionModal}
            />
          ))
        )}
      </div>

      {/* Action Modal */}
      {showActionModal && (
        <ActionModal systemUser={showActionModal} onClose={() => setShowActionModal(null)} />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteSystemUserConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
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
                className="border-destructive text-destructive hover:bg-destructive/10"
                disabled={isDeletingSystemUser}
              >
                {isDeletingSystemUser ? (
                  <>
                    <div className="border-destructive mr-2 h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" />
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
