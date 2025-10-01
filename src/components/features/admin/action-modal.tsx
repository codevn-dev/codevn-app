import React, { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send } from 'lucide-react';
import { useI18n } from '@/components/providers';
import { SystemUserResponse } from '@/types/shared/auth';
import { apiGet, apiPost } from '@/lib/utils/api-client';
import { UserSearchDropdown } from './user-search-dropdown';
import { SelectedUsersList } from './selected-users-list';

// Simple checkbox component
const Checkbox = ({
  id,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) => (
  <input
    type="checkbox"
    id={id}
    checked={checked}
    onChange={(e) => onCheckedChange(e.target.checked)}
    disabled={disabled}
    className="text-primary focus:ring-primary h-4 w-4 rounded border-gray-300"
  />
);

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface ActionModalProps {
  systemUser: SystemUserResponse;
  onClose: () => void;
}

export function ActionModal({ systemUser, onClose }: ActionModalProps) {
  const { t } = useI18n();

  // State for user selection
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [selectAllUsers, setSelectAllUsers] = useState(false);

  // State for message
  const [sendText, setSendText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  // State for user search
  const [candidateUsers, setCandidateUsers] = useState<User[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [userPagination, setUserPagination] = useState({ page: 1, hasMore: true });

  const fetchCandidateUsers = useCallback(
    async (searchTerm: string = '', page: number = 1, append: boolean = false) => {
      try {
        setUserSearchLoading(true);
        const params = new URLSearchParams({
          limit: '100',
          page: page.toString(),
        });

        if (searchTerm.trim()) {
          params.append('search', searchTerm.trim());
        }

        const res = await apiGet<{
          users: User[];
          pagination: { page: number; limit: number; total: number; totalPages: number };
        }>(`/api/admin/users?${params.toString()}`);

        if (append) {
          setCandidateUsers((prev) => [...prev, ...(res.users || [])]);
        } else {
          setCandidateUsers(res.users || []);
        }

        setUserPagination({
          page: res.pagination.page,
          hasMore: res.pagination.page < res.pagination.totalPages,
        });
      } catch {
        if (!append) {
          setCandidateUsers([]);
        }
      } finally {
        setUserSearchLoading(false);
      }
    },
    []
  );

  // Debounced search effect
  useEffect(() => {
    if (selectAllUsers) return;

    const timeoutId = setTimeout(() => {
      setUserPagination({ page: 1, hasMore: true });
      fetchCandidateUsers(userSearchTerm, 1, false);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [userSearchTerm, fetchCandidateUsers, selectAllUsers]);

  // Initial load when modal opens
  useEffect(() => {
    if (!selectAllUsers) {
      setUserSearchTerm('');
      setUserPagination({ page: 1, hasMore: true });
      fetchCandidateUsers('', 1, false);
    }
  }, [fetchCandidateUsers, selectAllUsers]);

  const handleUserSelection = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUserIds((prev) => [...prev, userId]);
      const user = candidateUsers.find((u) => u.id === userId);
      if (user) {
        setSelectedUsers((prev) => {
          if (!prev.find((u) => u.id === userId)) {
            return [...prev, user];
          }
          return prev;
        });
      }
    } else {
      setSelectedUserIds((prev) => prev.filter((id) => id !== userId));
      setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
    }
  };

  const handleSelectAllUsers = (checked: boolean) => {
    setSelectAllUsers(checked);
    if (checked) {
      setSelectedUserIds([]);
      setSelectedUsers([]);
    } else {
      setSelectedUserIds([]);
      setSelectedUsers([]);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sendText.trim()) {
      setSendError('Please enter a message.');
      return;
    }

    // Clear previous messages and start sending
    setSending(true);
    setSendError(null);
    setSendSuccess(null);

    try {
      let recipientCount: string | number;

      const routePath = `/api/system-users/${systemUser.id}/send-message`;
      if (selectAllUsers) {
        await apiPost(routePath, {
          isSendAll: true,
          text: sendText,
        });
        recipientCount = 'all';
      } else if (selectedUserIds.length > 0) {
        await apiPost(routePath, {
          toUserIds: selectedUserIds,
          isSendAll: false,
          text: sendText,
        });
        recipientCount = selectedUserIds.length;
      } else {
        setSendError(t('admin.systemUser.pleaseSelectUsers'));
        return;
      }

      setSendSuccess(
        t('admin.systemUser.messageSentSuccess').replace('{count}', String(recipientCount))
      );

      // Reset form for next send (but keep success message)
      setSendText('');
      setSelectedUserIds([]);
      setSelectedUsers([]);
      setSelectAllUsers(false);
      setUserSearchTerm('');
      setUserPagination({ page: 1, hasMore: true });
    } catch (err: any) {
      const msg =
        err?.response?.error || err?.message || t('admin.systemUser.failedToEnqueueMessage');
      setSendError(msg);
    } finally {
      setSending(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={systemUser.avatar} alt={systemUser.name} />
              <AvatarFallback className="text-sm font-bold">
                {systemUser.name?.charAt(0).toUpperCase() || 'S'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-lg font-semibold">{systemUser.name}</h2>
            </div>
          </div>
        </div>

        <div className="w-full">
          <div className="mb-4 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button className="border-primary text-primary border-b-2 px-1 py-2 text-sm font-medium">
                {t('common.sendMessage')}
              </button>
            </nav>
          </div>

          <div className="space-y-4">
            <form onSubmit={handleSendMessage} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('common.selectRecipients')}</label>

                {/* Select All Option */}
                <div className="flex items-center space-x-2 p-2">
                  <Checkbox
                    id="select-all"
                    checked={selectAllUsers}
                    onCheckedChange={handleSelectAllUsers}
                  />
                  <label htmlFor="select-all" className="text-sm font-medium text-gray-700">
                    {t('common.selectAll')} - {t('common.sendToAllUsers')}
                  </label>
                </div>

                {/* Search Input - Only show when not selecting all */}
                {!selectAllUsers && (
                  <UserSearchDropdown
                    searchTerm={userSearchTerm}
                    onSearchChange={setUserSearchTerm}
                    candidateUsers={candidateUsers}
                    selectedUserIds={selectedUserIds}
                    onUserSelection={handleUserSelection}
                    userSearchLoading={userSearchLoading}
                    userPagination={userPagination}
                    onLoadMore={() =>
                      fetchCandidateUsers(userSearchTerm, userPagination.page + 1, true)
                    }
                  />
                )}

                {/* Selected Users Display */}
                {!selectAllUsers && (
                  <SelectedUsersList
                    selectedUsers={selectedUsers}
                    selectedUserIds={selectedUserIds}
                    onRemoveUser={(userId) => handleUserSelection(userId, false)}
                    onClearAll={() => {
                      setSelectedUserIds([]);
                      setSelectedUsers([]);
                    }}
                  />
                )}

                {/* All Users Selected Indicator */}
                {selectAllUsers && (
                  <div className="flex items-center space-x-2 rounded-lg border border-green-200 bg-green-50 p-3">
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-green-500">
                      <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-green-700">
                      {t('common.allUsersSelected')}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{t('common.message')}</label>
                <Textarea
                  className="w-full"
                  rows={4}
                  value={sendText}
                  onChange={(e) => setSendText(e.target.value)}
                  placeholder={t('common.typeYourMessage')}
                  required
                />
              </div>

              {sendError && <p className="text-destructive text-sm">{sendError}</p>}
              {sendSuccess && (
                <div className="flex items-center space-x-2 rounded-lg border border-green-200 bg-green-50 p-3">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500">
                    <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <p className="text-primary text-sm">{sendSuccess}</p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="back" onClick={onClose}>
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={sending || (!selectAllUsers && selectedUserIds.length === 0)}
                >
                  {sending ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {t('common.sending')}
                    </>
                  ) : (
                    <>
                      <Send className="mr-1 h-4 w-4" />
                      {t('common.send')}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
