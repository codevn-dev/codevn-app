'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Upload, X, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { imageCompressionUtils } from '@/lib/utils/image-compression';
import { apiUpload } from '@/lib/utils';
import { UploadImageResponse } from '@/types/shared';
import { useI18n } from '@/components/providers';

interface ImageUploadProps {
  onImageUploaded: (imageUrl: string) => void;
  onClose: () => void;
}

export function ImageUpload({ onImageUploaded, onClose }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();

  const handleFile = async (file: File) => {
    if (!file) return;
    setErrorMessage(null);

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ];
    if (!allowedTypes.includes(file.type)) {
      setErrorMessage(t('upload.image.invalidType'));
      return;
    }

    // Validate file size (10MB max before compression)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setErrorMessage(t('upload.image.fileTooLarge'));
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Compress image if needed
    let fileToUpload = file;
    setIsCompressing(true);

    try {
      if (true) {
        // Always compress when enabled
        const compressionResult = await imageCompressionUtils.compressForArticle(file);
        fileToUpload = compressionResult.compressedFile;
      }
    } catch (error) {
      console.error('Compression failed:', error);
      setErrorMessage(t('upload.image.compressFailed'));
    } finally {
      setIsCompressing(false);
    }

    // Upload file
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', fileToUpload);

      const result = await apiUpload<UploadImageResponse>('/api/upload/image', formData);
      onImageUploaded(result.imageUrl);
      onClose();
    } catch (error) {
      const msg = error instanceof Error ? error.message : t('upload.image.uploadError');
      setErrorMessage(msg);
    } finally {
      setIsUploading(false);
      setPreview(null);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const onButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    fileInputRef.current?.click();
  };

  const onClickTextUpload = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isUploading || isCompressing) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold" suppressHydrationWarning>
            {t('upload.image.title')}
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {errorMessage && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div
          className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {preview ? (
            <div className="space-y-4">
              <img src={preview} alt="Preview" className="mx-auto max-h-48 rounded-lg" />

              {/* Loading states */}
              {isCompressing && (
                <div className="flex items-center justify-center space-x-2">
                  <Spinner size="sm" color="primary" />
                  <span className="text-sm text-gray-600" suppressHydrationWarning>
                    {t('upload.image.compressing')}
                  </span>
                </div>
              )}

              {isUploading && !isCompressing && (
                <div className="flex items-center justify-center space-x-2">
                  <Spinner size="sm" color="primary" />
                  <span className="text-sm text-gray-600" suppressHydrationWarning>
                    {t('upload.image.uploading')}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <ImageIcon className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900" suppressHydrationWarning>
                  {isUploading ? t('upload.image.uploading') : t('upload.image.dropHere')}
                </p>
                <p className="mt-1 text-sm text-gray-500" suppressHydrationWarning>
                  <button
                    type="button"
                    onClick={onClickTextUpload}
                    className="text-blue-600 hover:underline"
                    disabled={isUploading || isCompressing}
                  >
                    {t('upload.image.orClick')}
                  </button>
                </p>
                <p className="mt-2 text-xs text-gray-400" suppressHydrationWarning>
                  {t('upload.image.hint')}
                </p>
              </div>
              <Button
                onClick={onButtonClick}
                disabled={isUploading || isCompressing}
                className="mt-4"
              >
                {isCompressing ? (
                  <>
                    <Spinner size="sm" color="primary" className="mr-2" />
                    {t('upload.image.compressing')}
                  </>
                ) : isUploading ? (
                  <>
                    <Spinner size="sm" color="primary" className="mr-2" />
                    {t('upload.image.uploading')}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {t('upload.image.chooseFile')}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleChange}
          className="hidden"
        />

        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            disabled={isUploading}
          >
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    </div>
  );
}
