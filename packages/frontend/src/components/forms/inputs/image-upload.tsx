// src/components/forms/inputs/image-upload.tsx

import React, { forwardRef, useCallback, useState } from 'react';
import { FieldWrapper, type FieldWrapperProps } from '../elements/field-wrapper';
import { useFieldState, type BaseFieldProps } from '../adapters/rhf/field';
import { cn } from '@/lib/utils/utils';

export interface ImageUploadProps
  extends Omit<FieldWrapperProps, 'children'>,
    BaseFieldProps {
  // Image constraints
  maxSize?: number; // in bytes
  maxImages?: number;
  aspectRatio?: number; // width/height ratio
  
  // Display options
  variant?: 'grid' | 'single' | 'avatar' | 'banner';
  showPreview?: boolean;
  showProgress?: boolean;
  
  // Upload handling
  onUpload?: (files: File[]) => Promise<any>;
  uploadUrl?: string;
  
  // Image processing
  enableCropping?: boolean;
  resizeOnUpload?: { width: number; height: number };
  
  className?: string;
}

export const ImageUpload = forwardRef<HTMLInputElement, ImageUploadProps>(({
  name,
  control,
  label,
  help,
  tooltip,
  required,
  optional,
  error,
  maxSize = 5 * 1024 * 1024, // 5MB default
  maxImages = 1,
  aspectRatio,
  variant = 'single',
  showPreview = true,
  showProgress = true,
  onUpload,
  uploadUrl,
  enableCropping = false,
  resizeOnUpload,
  transformError,
  className,
  ...props
}, ref) => {
  const {
    field,
    error: fieldError,
    isLoading
  } = useFieldState(name, control);

  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const displayError = error || fieldError;
  const images = Array.isArray(field.value) ? field.value : field.value ? [field.value] : [];

  // Generate preview URLs for uploaded files
  React.useEffect(() => {
    const urls = images.map((image: any) => {
      if (typeof image === 'string') return image; // URL
      if (image instanceof File) return URL.createObjectURL(image);
      return image.url || image.src || '';
    });
    setPreviewUrls(urls);
    
    // Cleanup object URLs
    return () => {
      urls.forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [images]);

  // Validate image files
  const validateImages = useCallback((files: File[]): { valid: File[], invalid: Array<{file: File, error: string}> } => {
    const valid: File[] = [];
    const invalid: Array<{file: File, error: string}> = [];

    files.forEach(file => {
      // Check if it's an image
      if (!file.type.startsWith('image/')) {
        invalid.push({ file, error: 'Only image files are allowed' });
        return;
      }

      // Check file size
      if (file.size > maxSize) {
        invalid.push({ file, error: `Image size exceeds ${(maxSize / 1024 / 1024).toFixed(1)}MB limit` });
        return;
      }

      valid.push(file);
    });

    return { valid, invalid };
  }, [maxSize]);

  // Handle image selection
  const handleImageSelect = useCallback((selectedFiles: File[]) => {
    const { valid } = validateImages(selectedFiles);
    
    // Limit number of images
    const finalImages = maxImages > 1 
      ? [...images, ...valid].slice(0, maxImages)
      : valid.slice(0, 1);

    field.onChange(maxImages > 1 ? finalImages : finalImages[0] || null);

    // Auto-upload if configured
    if (onUpload && valid.length > 0) {
      handleUpload(valid);
    }
  }, [field, images, maxImages, validateImages, onUpload]);

  // Handle upload
  const handleUpload = useCallback(async (filesToUpload: File[]) => {
    if (!onUpload) return;

    for (const file of filesToUpload) {
      try {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
        await onUpload([file]);
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }
  }, [onUpload]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleImageSelect(droppedFiles);
  }, [handleImageSelect]);

  // File input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    handleImageSelect(selectedFiles);
  }, [handleImageSelect]);

  // Remove image
  const removeImage = useCallback((index: number) => {
    const newImages = images.filter((_: any, i: number) => i !== index);
    field.onChange(maxImages > 1 ? newImages : null);
  }, [images, field, maxImages]);

  // Variant-specific rendering
  const renderUploadArea = () => {
    const commonProps = {
      onDragOver: handleDragOver,
      onDragLeave: handleDragLeave,
      onDrop: handleDrop,
    };

    switch (variant) {
      case 'avatar':
        return (
          <div className="flex flex-col items-center space-y-4">
            <div
              {...commonProps}
              className={cn(
                'relative w-32 h-32 rounded-full border-2 border-dashed transition-all duration-200 overflow-hidden',
                'hover:border-[var(--primary)] hover:bg-[var(--primary)]/5',
                isDragActive ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)]'
              )}
            >
              {previewUrls[0] ? (
                <img
                  src={previewUrls[0]}
                  alt="Avatar preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full">
                  <svg className="w-8 h-8 text-[var(--muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
              
              <input
                ref={ref}
                type="file"
                accept="image/*"
                onChange={handleInputChange}
                disabled={isLoading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            
            <p className="text-sm text-[var(--caption-color)] font-satoshi text-center">
              Click or drop to upload avatar
            </p>
          </div>
        );

      case 'banner':
        return (
          <div
            {...commonProps}
            className={cn(
              'relative w-full h-32 rounded-xl border-2 border-dashed transition-all duration-200 overflow-hidden',
              'hover:border-[var(--primary)] hover:bg-[var(--primary)]/5',
              isDragActive ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)]'
            )}
          >
            {previewUrls[0] ? (
              <img
                src={previewUrls[0]}
                alt="Banner preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center justify-center w-full h-full">
                <svg className="w-8 h-8 text-[var(--muted)] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm text-[var(--muted)] font-satoshi">Drop banner image here</p>
              </div>
            )}
            
            <input
              ref={ref}
              type="file"
              accept="image/*"
              onChange={handleInputChange}
              disabled={isLoading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        );

      case 'grid':
        return (
          <div className="space-y-4">
            {/* Upload Area */}
            <div
              {...commonProps}
              className={cn(
                'relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200',
                'hover:border-[var(--primary)] hover:bg-[var(--primary)]/5',
                isDragActive ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)]'
              )}
            >
              <input
                ref={ref}
                type="file"
                accept="image/*"
                multiple={maxImages > 1}
                onChange={handleInputChange}
                disabled={isLoading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              
              <div className="flex flex-col items-center space-y-4">
                <div className="w-12 h-12 bg-[var(--primary)]/10 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                
                <div>
                  <p className="text-sm font-satoshi-medium text-[var(--heading-color)]">
                    Drop images here or click to browse
                  </p>
                  <p className="text-xs text-[var(--caption-color)] font-satoshi mt-1">
                    Max size: {(maxSize / 1024 / 1024).toFixed(1)}MB
                    {maxImages > 1 && ` • Max images: ${maxImages}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Image Grid */}
            {showPreview && previewUrls.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden bg-[var(--background-secondary)]">
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-[var(--error)] text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default: // single
        return (
          <div
            {...commonProps}
            className={cn(
              'relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200',
              'hover:border-[var(--primary)] hover:bg-[var(--primary)]/5',
              isDragActive ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-[var(--border)]'
            )}
          >
            {previewUrls[0] ? (
              <div className="space-y-4">
                <img
                  src={previewUrls[0]}
                  alt="Preview"
                  className="max-w-full max-h-48 mx-auto rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removeImage(0)}
                  className="text-sm text-[var(--error)] hover:text-[var(--error-dark)] font-satoshi-medium"
                >
                  Remove Image
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <div className="w-12 h-12 bg-[var(--primary)]/10 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                
                <div>
                  <p className="text-sm font-satoshi-medium text-[var(--heading-color)]">
                    Drop image here or click to browse
                  </p>
                  <p className="text-xs text-[var(--caption-color)] font-satoshi mt-1">
                    Max size: {(maxSize / 1024 / 1024).toFixed(1)}MB
                  </p>
                </div>
              </div>
            )}
            
            <input
              ref={ref}
              type="file"
              accept="image/*"
              onChange={handleInputChange}
              disabled={isLoading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        );
    }
  };

  return (
    <FieldWrapper
      label={label}
      help={help}
      tooltip={tooltip}
      required={required}
      optional={optional}
      error={typeof displayError === 'string' ? displayError : Array.isArray(displayError) ? displayError.join(', ') : displayError?.message}
      className={className}
    >
      {renderUploadArea()}
    </FieldWrapper>
  );
});

ImageUpload.displayName = 'ImageUpload';