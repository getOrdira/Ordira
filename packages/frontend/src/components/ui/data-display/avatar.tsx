// src/components/ui/data-display/avatar.tsx
'use client';

import React, { useState, useRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { 
  UserIcon, 
  CameraIcon, 
  PencilIcon,
  XMarkIcon,
  CheckIcon 
} from '@heroicons/react/24/outline';

const avatarVariants = cva(
  // Base styles
  "relative inline-flex items-center justify-center overflow-hidden bg-[var(--background-secondary)] select-none",
  {
    variants: {
      size: {
        xs: "w-6 h-6 text-xs",
        sm: "w-8 h-8 text-sm", 
        md: "w-10 h-10 text-sm",
        lg: "w-12 h-12 text-base",
        xl: "w-16 h-16 text-lg",
        "2xl": "w-20 h-20 text-xl",
        "3xl": "w-24 h-24 text-2xl",
        "4xl": "w-32 h-32 text-3xl",
      },
      shape: {
        circle: "rounded-full",
        square: "rounded-lg",
        rounded: "rounded-md",
      },
      variant: {
        default: "bg-[var(--background-secondary)] text-[var(--muted)]",
        primary: "bg-[var(--primary)]/10 text-[var(--primary)]",
        success: "bg-[var(--success)]/10 text-[var(--success)]", 
        warning: "bg-[var(--warning)]/10 text-[var(--warning)]",
        error: "bg-[var(--error)]/10 text-[var(--error)]",
        neutral: "bg-[var(--background-tertiary)] text-[var(--foreground-secondary)]",
      }
    },
    defaultVariants: {
      size: "md",
      shape: "circle", 
      variant: "default",
    },
  }
);

const avatarImageVariants = cva(
  "w-full h-full object-cover",
  {
    variants: {
      shape: {
        circle: "rounded-full",
        square: "rounded-lg",
        rounded: "rounded-md",
      }
    }
  }
);

const uploadOverlayVariants = cva(
  // Upload overlay styles
  "absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity cursor-pointer",
  {
    variants: {
      shape: {
        circle: "rounded-full",
        square: "rounded-lg", 
        rounded: "rounded-md",
      },
      interactive: {
        true: "hover:opacity-100 focus:opacity-100",
        false: "pointer-events-none",
      }
    }
  }
);

export interface AvatarProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {
  src?: string;
  alt?: string;
  fallback?: string;
  initials?: string;
  name?: string;
  editable?: boolean;
  onUpload?: (file: File) => void | Promise<void>;
  uploading?: boolean;
  uploadError?: string;
  maxFileSize?: number; // in bytes
  acceptedFileTypes?: string[];
  placeholder?: React.ReactNode;
  className?: string;
  imageClassName?: string;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ 
    src,
    alt,
    fallback,
    initials, 
    name,
    size = "md",
    shape = "circle",
    variant = "default",
    editable = false,
    onUpload,
    uploading = false,
    uploadError,
    maxFileSize = 5 * 1024 * 1024, // 5MB default
    acceptedFileTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    placeholder,
    className,
    imageClassName,
    ...props 
  }, ref) => {
    const [imageError, setImageError] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Generate initials from name if not provided
    const getInitials = () => {
      if (initials) return initials;
      if (name) {
        return name
          .split(' ')
          .map(part => part.charAt(0))
          .slice(0, 2)
          .join('')
          .toUpperCase();
      }
      return '';
    };

    // Generate alt text
    const getAltText = () => {
      if (alt) return alt;
      if (name) return `${name}'s avatar`;
      return 'User avatar';
    };

    // Generate fallback content
    const getFallbackContent = () => {
      if (fallback) return fallback;
      
      const avatarInitials = getInitials();
      if (avatarInitials) {
        return avatarInitials;
      }
      
      if (placeholder) {
        return placeholder;
      }
      
      return <UserIcon className="w-1/2 h-1/2" />;
    };

    // Handle file selection
    const handleFileSelect = (file: File) => {
      // Validate file type
      if (!acceptedFileTypes.includes(file.type)) {
        console.error('Invalid file type:', file.type);
        return;
      }

      // Validate file size
      if (file.size > maxFileSize) {
        console.error('File too large:', file.size);
        return;
      }

      onUpload?.(file);
    };

    // Handle file input change
    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
      // Reset input value to allow same file selection
      e.target.value = '';
    };

    // Handle drag and drop
    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    };

    // Handle upload click
    const handleUploadClick = () => {
      fileInputRef.current?.click();
    };

    // Handle image load error
    const handleImageError = () => {
      setImageError(true);
    };

    // Handle image load success
    const handleImageLoad = () => {
      setImageError(false);
    };

    // Render content
    const renderContent = () => {
      // Show image if available and no error
      if (src && !imageError) {
        return (
          <img
            src={src}
            alt={getAltText()}
            className={cn(
              avatarImageVariants({ shape }),
              imageClassName
            )}
            onError={handleImageError}
            onLoad={handleImageLoad}
          />
        );
      }

      // Show fallback content
      return (
        <span className="font-medium">
          {getFallbackContent()}
        </span>
      );
    };

    // Render upload overlay
    const renderUploadOverlay = () => {
      if (!editable || !onUpload) return null;

      return (
        <div
          className={cn(
            uploadOverlayVariants({ 
              shape, 
              interactive: true 
            }),
            dragOver && "opacity-100",
            uploading && "opacity-100"
          )}
          onClick={handleUploadClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {uploading ? (
            <div className="flex flex-col items-center space-y-1">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-white font-medium">Uploading...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-1">
              <CameraIcon className="w-4 h-4 text-white" />
              <span className="text-xs text-white font-medium">Change</span>
            </div>
          )}
        </div>
      );
    };

    return (
      <div className="relative inline-block">
        <div
          ref={ref}
          className={cn(
            avatarVariants({ size, shape, variant }),
            dragOver && "ring-2 ring-[var(--primary)] ring-offset-2",
            uploadError && "ring-2 ring-[var(--error)] ring-offset-2",
            className
          )}
          {...props}
        >
          {renderContent()}
          {renderUploadOverlay()}
        </div>

        {/* Hidden file input */}
        {editable && onUpload && (
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFileTypes.join(',')}
            onChange={handleFileInputChange}
            className="hidden"
          />
        )}

        {/* Error message */}
        {uploadError && (
          <div className="absolute top-full left-0 mt-1 text-xs text-[var(--error)] whitespace-nowrap">
            {uploadError}
          </div>
        )}
      </div>
    );
  }
);

Avatar.displayName = "Avatar";

// Avatar Group Component for displaying multiple avatars
export interface AvatarGroupProps {
  avatars: Array<{
    src?: string;
    alt?: string;
    name?: string;
    initials?: string;
  }>;
  max?: number;
  size?: VariantProps<typeof avatarVariants>['size'];
  shape?: VariantProps<typeof avatarVariants>['shape'];
  className?: string;
  spacing?: 'tight' | 'normal' | 'loose';
  showTooltip?: boolean;
}

export const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ 
    avatars,
    max = 5,
    size = "md",
    shape = "circle",
    className,
    spacing = "normal",
    showTooltip = true,
    ...props 
  }, ref) => {
    const visibleAvatars = avatars.slice(0, max);
    const hiddenCount = Math.max(0, avatars.length - max);

    const spacingClasses = {
      tight: "-space-x-1",
      normal: "-space-x-2", 
      loose: "-space-x-1",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center",
          spacingClasses[spacing],
          className
        )}
        {...props}
      >
        {visibleAvatars.map((avatar, index) => (
          <div key={index} className="ring-2 ring-[var(--background)]">
            <Avatar
              src={avatar.src}
              alt={avatar.alt}
              name={avatar.name}
              initials={avatar.initials}
              size={size}
              shape={shape}
            />
          </div>
        ))}
        
        {hiddenCount > 0 && (
          <div className="ring-2 ring-[var(--background)]">
            <Avatar
              size={size}
              shape={shape}
              variant="neutral"
              fallback={`+${hiddenCount}`}
            />
          </div>
        )}
      </div>
    );
  }
);

AvatarGroup.displayName = "AvatarGroup";

// Upload Avatar Component - Specifically for profile settings
export interface UploadAvatarProps extends Omit<AvatarProps, 'editable' | 'onUpload'> {
  onUpload: (file: File) => Promise<void>;
  currentImageUrl?: string;
  userName?: string;
  uploadingText?: string;
  changeText?: string;
  removeText?: string;
  onRemove?: () => Promise<void>;
  showRemoveButton?: boolean;
}

export const UploadAvatar = React.forwardRef<HTMLDivElement, UploadAvatarProps>(
  ({ 
    onUpload,
    currentImageUrl,
    userName,
    uploadingText = "Uploading...",
    changeText = "Change Avatar", 
    removeText = "Remove Avatar",
    onRemove,
    showRemoveButton = true,
    uploading = false,
    uploadError,
    className,
    ...props 
  }, ref) => {
    const [isUploading, setIsUploading] = useState(false);

    const handleUpload = async (file: File) => {
      try {
        setIsUploading(true);
        await onUpload(file);
      } catch (error) {
        console.error('Upload failed:', error);
      } finally {
        setIsUploading(false);
      }
    };

    const handleRemove = async () => {
      if (!onRemove) return;
      
      try {
        setIsUploading(true);
        await onRemove();
      } catch (error) {
        console.error('Remove failed:', error);
      } finally {
        setIsUploading(false);
      }
    };

    return (
      <div className={cn("flex items-center space-x-6", className)}>
        <Avatar
          ref={ref}
          src={currentImageUrl}
          name={userName}
          size="3xl"
          editable
          onUpload={handleUpload}
          uploading={isUploading || uploading}
          uploadError={uploadError}
          {...props}
        />
        
        <div className="space-y-2">
          <div>
            <label className="block text-sm font-medium text-[var(--heading-color)] mb-1">
              Profile Picture
            </label>
            <p className="text-sm text-[var(--body-color)]">
              JPG, PNG or WebP. Max size 5MB.
            </p>
          </div>
          
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/jpeg,image/png,image/webp';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) handleUpload(file);
                };
                input.click();
              }}
              disabled={isUploading || uploading}
              className="inline-flex items-center px-3 py-2 border border-[var(--border)] rounded-md text-sm font-medium text-[var(--foreground-secondary)] bg-[var(--background)] hover:bg-[var(--background-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PencilIcon className="w-4 h-4 mr-2" />
              {isUploading || uploading ? uploadingText : changeText}
            </button>
            
            {showRemoveButton && currentImageUrl && onRemove && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={isUploading || uploading}
                className="inline-flex items-center px-3 py-2 border border-[var(--border)] rounded-md text-sm font-medium text-[var(--error)] bg-[var(--background)] hover:bg-[var(--error)]/5 focus:outline-none focus:ring-2 focus:ring-[var(--error)] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XMarkIcon className="w-4 h-4 mr-2" />
                {removeText}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
);

UploadAvatar.displayName = "UploadAvatar";

export { Avatar };
export default Avatar;