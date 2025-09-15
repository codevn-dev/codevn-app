'use client';

import { useState, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { Camera } from 'lucide-react';
import { useAuthStore } from '@/stores';

interface AvatarUploadProps {
  onAvatarChange?: (avatar: string | null) => void;
  size?: 'sm' | 'md' | 'lg';
  showUploadButton?: boolean;
}

export function AvatarUpload({
  onAvatarChange,
  size = 'md',
  showUploadButton = true,
}: AvatarUploadProps) {
  const { user, updateUser } = useAuthStore();
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: 'h-16 w-16',
    md: 'h-24 w-24',
    lg: 'h-32 w-32',
  };

  const buttonSizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    uploadAvatar(file);
  };

  const uploadAvatar = async (file: File) => {
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();

      // Update user in store with the file path
      updateUser({ avatar: result.avatar });

      // Call callback if provided
      onAvatarChange?.(result.avatar);

      setPreview(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Upload failed');
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const currentAvatar = preview || user?.avatar || null;

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="group relative">
        <Avatar className={`${sizeClasses[size]} cursor-pointer`}>
          <AvatarImage src={currentAvatar || undefined} />
          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-lg font-bold text-white">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>

        {isUploading && (
          <div className="bg-opacity-50 absolute inset-0 flex items-center justify-center rounded-full bg-black">
            <Spinner size="sm" color="current" />
          </div>
        )}

        {showUploadButton && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={`absolute -right-1 -bottom-1 ${buttonSizeClasses[size]} flex items-center justify-center rounded-full bg-blue-500 text-white shadow-lg transition-colors hover:bg-blue-600 disabled:opacity-50`}
          >
            <Camera className="h-3 w-3" />
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
