'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Settings } from 'lucide-react';

interface CompressionSettingsProps {
  onSettingsChange?: (settings: CompressionSettings) => void;
  className?: string;
}

export interface CompressionSettings {
  enabled: boolean;
  quality: number;
  maxSizeMB: number;
  maxWidthOrHeight: number;
  fileType: 'image/jpeg' | 'image/png' | 'image/webp';
}

const defaultSettings: CompressionSettings = {
  enabled: true,
  quality: 0.8,
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  fileType: 'image/jpeg',
};

const qualityPresets = [
  { label: 'Low (60%)', value: 0.6, description: 'Smallest file size' },
  { label: 'Medium (80%)', value: 0.8, description: 'Balanced quality' },
  { label: 'High (90%)', value: 0.9, description: 'Best quality' },
  { label: 'Custom', value: -1, description: 'Manual setting' },
];

const sizePresets = [
  { label: 'Small (500KB)', value: 0.5, description: 'For avatars' },
  { label: 'Medium (1MB)', value: 1, description: 'For articles' },
  { label: 'Large (2MB)', value: 2, description: 'For high quality' },
  { label: 'Custom', value: -1, description: 'Manual setting' },
];

const resolutionPresets = [
  { label: 'HD (1280px)', value: 1280, description: 'Standard HD' },
  { label: 'Full HD (1920px)', value: 1920, description: 'Full HD' },
  { label: '2K (2560px)', value: 2560, description: '2K resolution' },
  { label: 'Custom', value: -1, description: 'Manual setting' },
];

export function CompressionSettings({
  onSettingsChange,
  className = '',
}: CompressionSettingsProps) {
  const [settings, setSettings] = useState<CompressionSettings>(defaultSettings);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedQualityPreset, setSelectedQualityPreset] = useState(1); // Medium
  const [selectedSizePreset, setSelectedSizePreset] = useState(1); // Medium
  const [selectedResolutionPreset, setSelectedResolutionPreset] = useState(1); // Full HD

  useEffect(() => {
    onSettingsChange?.(settings);
  }, [settings, onSettingsChange]);

  const handleQualityChange = (presetIndex: number, customValue?: number) => {
    setSelectedQualityPreset(presetIndex);
    const value = customValue !== undefined ? customValue : qualityPresets[presetIndex].value;
    if (value !== -1) {
      setSettings((prev) => ({ ...prev, quality: value }));
    }
  };

  const handleSizeChange = (presetIndex: number, customValue?: number) => {
    setSelectedSizePreset(presetIndex);
    const value = customValue !== undefined ? customValue : sizePresets[presetIndex].value;
    if (value !== -1) {
      setSettings((prev) => ({ ...prev, maxSizeMB: value }));
    }
  };

  const handleResolutionChange = (presetIndex: number, customValue?: number) => {
    setSelectedResolutionPreset(presetIndex);
    const value = customValue !== undefined ? customValue : resolutionPresets[presetIndex].value;
    if (value !== -1) {
      setSettings((prev) => ({ ...prev, maxWidthOrHeight: value }));
    }
  };

  const resetToDefaults = () => {
    setSettings(defaultSettings);
    setSelectedQualityPreset(1);
    setSelectedSizePreset(1);
    setSelectedResolutionPreset(1);
  };

  return (
    <div className={`relative ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2"
      >
        <Settings className="h-4 w-4" />
        <span>Compression Settings</span>
      </Button>

      {isOpen && (
        <Card className="absolute top-full right-0 z-50 mt-2 w-80 p-4 shadow-lg">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Image Compression</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>

            {/* Enable/Disable */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Enable Compression</label>
                <p className="text-xs text-gray-500">Automatically compress images before upload</p>
              </div>
              <Button
                variant={settings.enabled ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSettings((prev) => ({ ...prev, enabled: !prev.enabled }))}
              >
                {settings.enabled ? 'ON' : 'OFF'}
              </Button>
            </div>

            {settings.enabled && (
              <>
                {/* Quality Settings */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Quality</label>
                  <div className="grid grid-cols-2 gap-2">
                    {qualityPresets.map((preset, index) => (
                      <Button
                        key={index}
                        variant={selectedQualityPreset === index ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleQualityChange(index)}
                        className="text-xs"
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                  {selectedQualityPreset === 3 && (
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={settings.quality}
                      onChange={(e) => handleQualityChange(3, parseFloat(e.target.value))}
                      className="w-full"
                    />
                  )}
                  <p className="text-xs text-gray-500">
                    Current: {Math.round(settings.quality * 100)}%
                  </p>
                </div>

                {/* Size Settings */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max File Size</label>
                  <div className="grid grid-cols-2 gap-2">
                    {sizePresets.map((preset, index) => (
                      <Button
                        key={index}
                        variant={selectedSizePreset === index ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleSizeChange(index)}
                        className="text-xs"
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                  {selectedSizePreset === 3 && (
                    <input
                      type="range"
                      min="0.1"
                      max="5"
                      step="0.1"
                      value={settings.maxSizeMB}
                      onChange={(e) => handleSizeChange(3, parseFloat(e.target.value))}
                      className="w-full"
                    />
                  )}
                  <p className="text-xs text-gray-500">Current: {settings.maxSizeMB}MB</p>
                </div>

                {/* Resolution Settings */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Resolution</label>
                  <div className="grid grid-cols-1 gap-2">
                    {resolutionPresets.map((preset, index) => (
                      <Button
                        key={index}
                        variant={selectedResolutionPreset === index ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => handleResolutionChange(index)}
                        className="text-xs"
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                  {selectedResolutionPreset === 3 && (
                    <input
                      type="range"
                      min="480"
                      max="3840"
                      step="160"
                      value={settings.maxWidthOrHeight}
                      onChange={(e) => handleResolutionChange(3, parseInt(e.target.value))}
                      className="w-full"
                    />
                  )}
                  <p className="text-xs text-gray-500">Current: {settings.maxWidthOrHeight}px</p>
                </div>

                {/* File Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Output Format</label>
                  <div className="flex space-x-2">
                    {(['image/jpeg', 'image/png', 'image/webp'] as const).map((type) => (
                      <Button
                        key={type}
                        variant={settings.fileType === type ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSettings((prev) => ({ ...prev, fileType: type }))}
                        className="text-xs"
                      >
                        {type.split('/')[1].toUpperCase()}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Reset Button */}
                <div className="pt-2">
                  <Button variant="outline" size="sm" onClick={resetToDefaults} className="w-full">
                    Reset to Defaults
                  </Button>
                </div>
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
