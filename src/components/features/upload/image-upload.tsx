'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { imageCompressionUtils } from '@/lib/utils/image-compression';
import { apiUpload } from '@/lib/utils';
import { UploadImageResponse } from '@/types/shared';

interface ImageUploadProps {
  onImageUploaded: (imageUrl: string) => void;
  onClose: () => void;
}

export function ImageUpload({ onImageUploaded, onClose }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.');
      return;
    }

    // Validate file size (10MB max before compression)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('File too large. Maximum size is 10MB.');
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
      alert('Failed to compress image. Uploading original file.');
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
      const errorMessage =
        error instanceof Error ? error.message : 'Error uploading image. Please try again.';
      alert(errorMessage);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Upload Image</h3>
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
                  <span className="text-sm text-gray-600">Compressing image...</span>
                </div>
              )}

              {isUploading && !isCompressing && (
                <div className="flex items-center justify-center space-x-2">
                  <Spinner size="sm" color="primary" />
                  <span className="text-sm text-gray-600">Uploading...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                <ImageIcon className="h-8 w-8 text-gray-400" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">
                  {isUploading ? 'UpLoading' : 'Drop your image here'}
                </p>
                <p className="mt-1 text-sm text-gray-500">or click to browse files</p>
                <p className="mt-2 text-xs text-gray-400">
                  PNG, JPG, GIF, WebP up to 10MB (auto-compressed)
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
                    Compressing...
                  </>
                ) : isUploading ? (
                  <>
                    <Spinner size="sm" color="primary" className="mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Choose File
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
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
