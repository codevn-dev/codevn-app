'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Camera, Settings, Crop, Check, X } from 'lucide-react';
import { useAuthStore } from '@/stores';
import { imageCompressionUtils, CompressionSettings } from '@/lib/utils/image-compression';
import ReactCrop, {
  Crop as CropType,
  PixelCrop,
  centerCrop,
  makeAspectCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { apiUpload } from '@/lib/utils/api-client';
import { useI18n } from '@/components/providers';

interface AvatarUploadProps {
  onAvatarChange?: (avatar: string | null) => void;
  size?: 'sm' | 'md' | 'lg';
  showUploadButton?: boolean;
  showCompressionSettings?: boolean;
  customCompressionSettings?: CompressionSettings;
}

export function AvatarUpload({
  onAvatarChange,
  size = 'md',
  showUploadButton = true,
  showCompressionSettings = false,
  customCompressionSettings,
}: AvatarUploadProps) {
  const { t } = useI18n();
  const { user, updateUser } = useAuthStore();
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showCrop, setShowCrop] = useState(false);
  const [crop, setCrop] = useState<CropType>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [compressionSettings, setCompressionSettings] = useState<CompressionSettings>({
    enabled: true,
    quality: 0.8,
    maxSizeMB: 1.0,
    maxWidthOrHeight: 400,
    fileType: 'image/jpeg',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Update compression settings when custom settings are provided
  useEffect(() => {
    if (customCompressionSettings) {
      setCompressionSettings(customCompressionSettings);
    }
  }, [customCompressionSettings]);

  // Function to create a square crop in the center
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        1, // 1:1 aspect ratio for square
        width,
        height
      ),
      width,
      height
    );
    setCrop(crop);
  }, []);

  // Function to get cropped image as canvas
  const getCroppedImg = (image: HTMLImageElement, crop: PixelCrop): Promise<File> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    canvas.width = crop.width;
    canvas.height = crop.height;

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], 'cropped-avatar.jpg', { type: 'image/jpeg' });
            resolve(file);
          }
        },
        'image/jpeg',
        0.9
      );
    });
  };

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

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 10MB before compression)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    // Store original file and show crop interface
    setOriginalFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
      setShowCrop(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async () => {
    if (!imgRef.current || !completedCrop || !originalFile) return;

    try {
      // Get cropped image
      const croppedFile = await getCroppedImg(imgRef.current, completedCrop);

      // Compress image if needed
      let fileToUpload = croppedFile;
      setIsCompressing(true);

      if (compressionSettings.enabled) {
        const compressionResult = await imageCompressionUtils.compressImage(croppedFile, {
          maxSizeMB: compressionSettings.maxSizeMB,
          maxWidthOrHeight: compressionSettings.maxWidthOrHeight,
          quality: compressionSettings.quality,
          fileType: compressionSettings.fileType,
        });
        fileToUpload = compressionResult.compressedFile;
      }

      // Upload file
      uploadAvatar(fileToUpload);
    } catch (error) {
      console.error('Crop or compression failed:', error);
      alert('Failed to process image. Please try again.');
    } finally {
      setIsCompressing(false);
      setShowCrop(false);
      setOriginalFile(null);
    }
  };

  const handleCropCancel = () => {
    setShowCrop(false);
    setPreview(null);
    setOriginalFile(null);
    setCrop(undefined);
    setCompletedCrop(undefined);
  };

  const uploadAvatar = async (file: File) => {
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const result = await apiUpload<{ avatar: string }>('/api/profile/avatar', formData);

      updateUser({ avatar: result.avatar });
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
      {/* Crop Interface */}
      {showCrop && preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCropCancel}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mb-4">
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={1} // Square aspect ratio
                minWidth={100}
                minHeight={100}
              >
                <img
                  ref={imgRef}
                  alt="Crop me"
                  src={preview}
                  onLoad={onImageLoad}
                  className="max-h-96 w-full object-contain"
                />
              </ReactCrop>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={handleCropCancel}>
                {t('profile.cancel')}
              </Button>
              <Button onClick={handleCropComplete} disabled={!completedCrop}>
                <Check className="mr-2 h-4 w-4" />
                {t('profile.upload')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Compression Settings */}
      {showCompressionSettings && (
        <div className="w-full max-w-xs">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium">Compression Settings</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="h-6 w-6 p-0"
            >
              <Settings className="h-3 w-3" />
            </Button>
          </div>

          {showSettings && (
            <div className="space-y-3 rounded-lg border p-3">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between">
                <span className="text-xs">Enable Compression</span>
                <Button
                  variant={compressionSettings.enabled ? 'default' : 'outline'}
                  size="sm"
                  onClick={() =>
                    setCompressionSettings((prev) => ({ ...prev, enabled: !prev.enabled }))
                  }
                  className="h-6 px-2 text-xs"
                >
                  {compressionSettings.enabled ? 'ON' : 'OFF'}
                </Button>
              </div>

              {compressionSettings.enabled && (
                <>
                  {/* Quality */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium">
                      Quality: {Math.round(compressionSettings.quality * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={compressionSettings.quality}
                      onChange={(e) =>
                        setCompressionSettings((prev) => ({
                          ...prev,
                          quality: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full"
                    />
                  </div>

                  {/* Max Size */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium">
                      Max Size: {compressionSettings.maxSizeMB}MB
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="2"
                      step="0.1"
                      value={compressionSettings.maxSizeMB}
                      onChange={(e) =>
                        setCompressionSettings((prev) => ({
                          ...prev,
                          maxSizeMB: parseFloat(e.target.value),
                        }))
                      }
                      className="w-full"
                    />
                  </div>

                  {/* Max Resolution */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium">
                      Max Resolution: {compressionSettings.maxWidthOrHeight}px
                    </label>
                    <input
                      type="range"
                      min="100"
                      max="500"
                      step="50"
                      value={compressionSettings.maxWidthOrHeight}
                      onChange={(e) =>
                        setCompressionSettings((prev) => ({
                          ...prev,
                          maxWidthOrHeight: parseInt(e.target.value),
                        }))
                      }
                      className="w-full"
                    />
                  </div>

                  {/* File Type */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium">Format</label>
                    <div className="flex space-x-1">
                      {(['image/jpeg', 'image/png', 'image/webp'] as const).map((type) => (
                        <Button
                          key={type}
                          variant={compressionSettings.fileType === type ? 'default' : 'outline'}
                          size="sm"
                          onClick={() =>
                            setCompressionSettings((prev) => ({ ...prev, fileType: type }))
                          }
                          className="h-6 px-2 text-xs"
                        >
                          {type.split('/')[1].toUpperCase()}
                        </Button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <div className="group relative">
        <Avatar className={`${sizeClasses[size]} cursor-pointer`}>
          <AvatarImage src={currentAvatar || undefined} />
          <AvatarFallback className="from-brand to-brand-600 bg-gradient-to-br text-lg font-bold text-white">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>

        {(isUploading || isCompressing) && (
          <div className="bg-opacity-50 absolute inset-0 flex items-center justify-center rounded-full bg-black">
            <Spinner size="sm" color="current" />
          </div>
        )}

        {showCrop && (
          <div className="bg-opacity-50 absolute inset-0 flex items-center justify-center rounded-full bg-[#B8956A]">
            <Crop className="h-4 w-4 text-white" />
          </div>
        )}

        {showUploadButton && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isCompressing || showCrop}
            className={`absolute -right-1 -bottom-1 ${buttonSizeClasses[size]} bg-brand hover:bg-brand-600 flex items-center justify-center rounded-full text-white shadow-lg transition-colors disabled:opacity-50`}
          >
            {showCrop ? <Crop className="h-3 w-3" /> : <Camera className="h-3 w-3" />}
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
