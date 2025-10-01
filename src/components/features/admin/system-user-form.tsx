import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { useI18n } from '@/components/providers';
import { AvatarUpload } from '@/components/features/upload';
import { SystemUserResponse, CreateSystemUserRequest } from '@/types/shared/auth';
import { apiPost, apiPut } from '@/lib/utils/api-client';

interface SystemUserFormProps {
  editingSystemUser: SystemUserResponse | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function SystemUserForm({ editingSystemUser, onClose, onSuccess }: SystemUserFormProps) {
  const { t } = useI18n();
  const [formData, setFormData] = useState<CreateSystemUserRequest>({
    name: editingSystemUser?.name || '',
    email: editingSystemUser?.email || '',
    avatar: editingSystemUser?.avatar || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [systemUserError, setSystemUserError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      setSystemUserError('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    setSystemUserError(null);

    try {
      if (editingSystemUser) {
        await apiPut(`/api/system-users/${editingSystemUser.id}`, formData);
      } else {
        await apiPost('/api/system-users', formData);
      }
      onSuccess();
      onClose();
    } catch {
      setSystemUserError(
        editingSystemUser ? 'Failed to update system user' : 'Failed to create system user'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {editingSystemUser ? t('common.edit') : t('common.create')} {t('common.role.system')}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('common.name')} *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('common.enterName')}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('common.email')} *</label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder={t('common.enterEmail')}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('common.avatar')}</label>
            <AvatarUpload
              currentAvatar={formData.avatar}
              onAvatarChange={(avatar) => setFormData({ ...formData, avatar: avatar || '' })}
              isSystemUser={true}
              systemUserId={editingSystemUser?.id || 'new'}
            />
          </div>

          {systemUserError && <p className="text-destructive text-sm">{systemUserError}</p>}

          <div className="mt-6 flex justify-end gap-2">
            <Button variant="back" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  {t('common.saving')}
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
    </div>,
    document.body
  );
}
