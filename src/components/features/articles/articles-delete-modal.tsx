'use client';

import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { useI18n } from '@/components/providers';

interface ArticlesDeleteModalProps {
  open: boolean;
  articleTitle?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function ArticlesDeleteModal({
  open,
  articleTitle,
  onClose,
  onConfirm,
}: ArticlesDeleteModalProps) {
  useI18n();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold">Delete Article</h2>
        <p className="mb-6 text-gray-700">
          Are you sure you want to delete &quot;{articleTitle}&quot;? This action cannot be undone
          and will also delete all comments and likes.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="back" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="back"
            onClick={onConfirm}
            className="border-red-600 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
