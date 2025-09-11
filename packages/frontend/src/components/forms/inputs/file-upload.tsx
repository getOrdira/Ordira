// src/components/forms/inputs/file-upload.tsx

import React, { forwardRef, useCallback, useState } from 'react';
import { FieldWrapper, type FieldWrapperProps } from '../elements/field-wrapper';
import { useFieldState, type BaseFieldProps } from '../adapters/rhf/field';
import { cn } from '@/lib/utils';

export interface FileUploadProps
  extends Omit<FieldWrapperProps, 'children'>,
    BaseFieldProps {
  // File constraints
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in bytes
  maxFiles?: number;
  
  // Display options
  showPreview?: boolean;
  showProgress?: boolean;
  variant?: 'dropzone' | 'button' | 'inline';
  
  // Upload handling
  onUpload?: (files: File[]) => Promise<any>;
  uploadUrl?: string;
  
  // Custom styling
  className?: string;
  dragActiveClassName?: string;
  
  // Validation
  validateFile?: (file: File) => string | null;
}

export const FileUpload = forwardRef<HTMLInputElement, FileUploadProps>(({
  name,
  control,
  label,
  help,
  tooltip,
  required,
  optional,
  error,
  accept,
  multiple = false,
  maxSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = multiple ? 5 : 1,
  showPreview = true,
  showProgress = true,
  variant = 'dropzone',
  onUpload,
  uploadUrl,
  validateFile,
  transformError,
  className,
  dragActiveClassName,
  ...props
}, ref) => {
  const {
    field,
    error: fieldError,
    isLoading
  } = useFieldState(name, control);

  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  const displayError = error || fieldError;
  const files = Array.isArray(field.value) ? field.value : field.value ? [field.value] : [];

  // File validation
  const validateFiles = useCallback((fileList: File[]): { valid: File[], invalid: Array<{file: File, error: string}> } => {
    const valid: File[] = [];
    const invalid: Array<{file: File, error: string}> = [];

    fileList.forEach(file => {
      // Check file size
      if (file.size > maxSize) {
        invalid.push({ file, error: `File size exceeds ${(maxSize / 1024 / 1024).toFixed(1)}MB limit` });
        return;
      }

      // Custom validation
      if (validateFile) {
        const customError = validateFile(file);
        if (customError) {
          invalid.push({ file, error: customError });
          return;
        }
      }

      valid.push(file);
    });

    return { valid, invalid };
  }, [maxSize, validateFile]);

  // Handle file selection
  const handleFileSelect = useCallback((selectedFiles: File[]) => {
    const { valid, invalid } = validateFiles(selectedFiles);
    
    // Handle invalid files
    if (invalid.length > 0) {
      const errors = invalid.reduce((acc, {file, error}) => {
        acc[file.name] = error;
        return acc;
      }, {} as Record<string, string>);
      setUploadErrors(errors);
    }

    // Limit number of files
    const finalFiles = multiple 
      ? [...files, ...valid].slice(0, maxFiles)
      : valid.slice(0, 1);

    field.onChange(multiple ? finalFiles : finalFiles[0] || null);

    // Auto-upload if configured
    if (onUpload && valid.length > 0) {
      handleUpload(valid);
    }
  }, [field, files, multiple, maxFiles, validateFiles, onUpload]);

  // Handle upload
  const handleUpload = useCallback(async (filesToUpload: File[]) => {
    if (!onUpload) return;

    for (const file of filesToUpload) {
      try {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
        
        // Simulate progress (replace with actual upload logic)
        const result = await onUpload([file]);
        
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
        setUploadErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[file.name];
          return newErrors;
        });
      } catch (error) {
        setUploadErrors(prev => ({
          ...prev,
          [file.name]: error instanceof Error ? error.message : 'Upload failed'
        }));
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });
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
    handleFileSelect(droppedFiles);
  }, [handleFileSelect]);

  // File input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    handleFileSelect(selectedFiles);
  }, [handleFileSelect]);

  // Remove file
  const removeFile = useCallback((index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    field.onChange(multiple ? newFiles : null);
  }, [files, field, multiple]);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <FieldWrapper
      label={label}
      help={help}
      tooltip={tooltip}
      required={required}
      optional={optional}
      error={displayError}
      className={className}
    >
      <div className="space-y-4">
        {/* Upload Area */}
        {variant === 'dropzone' ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              'relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200',
              'hover:border-[var(--primary)] hover:bg-[var(--primary)]/5',
              isDragActive 
                ? 'border-[var(--primary)] bg-[var(--primary)]/10' 
                : 'border-[var(--border)]',
              isLoading && 'opacity-50 pointer-events-none',
              dragActiveClassName && isDragActive && dragActiveClassName
            )}
          >
            <input
              ref={ref}
              type="file"
              accept={accept}
              multiple={multiple}
              onChange={handleInputChange}
              disabled={isLoading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            <div className="flex flex-col items-center space-y-4">
              <div className="w-12 h-12 bg-[var(--primary)]/10 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              
              <div>
                <p className="text-sm font-satoshi-medium text-[var(--heading-color)]">
                  Drop files here or click to browse
                </p>
                <p className="text-xs text-[var(--caption-color)] font-satoshi mt-1">
                  {accept && `Supported formats: ${accept}`}
                  {maxSize && ` • Max size: ${formatFileSize(maxSize)}`}
                  {multiple && ` • Max files: ${maxFiles}`}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-dark)] transition-colors cursor-pointer font-satoshi-medium text-sm">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Choose Files
              <input
                ref={ref}
                type="file"
                accept={accept}
                multiple={multiple}
                onChange={handleInputChange}
                disabled={isLoading}
                className="hidden"
              />
            </label>
            <span className="text-sm text-[var(--caption-color)] font-satoshi">
              {files.length > 0 ? `${files.length} file(s) selected` : 'No files selected'}
            </span>
          </div>
        )}

        {/* File Preview */}
        {showPreview && files.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-satoshi-medium text-[var(--heading-color)]">
              Selected Files
            </h4>
            
            <div className="space-y-2">
              {files.map((file, index) => (
                <div key={`${file.name}-${index}`} className="flex items-center justify-between p-3 bg-[var(--background-secondary)] rounded-lg">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <div className="w-8 h-8 bg-[var(--primary)]/10 rounded flex items-center justify-center flex-shrink-0">
                      <svg className="w-4 h-4 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-satoshi-medium text-[var(--heading-color)] truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-[var(--caption-color)] font-satoshi">
                        {formatFileSize(file.size)}
                      </p>
                      
                      {/* Upload Progress */}
                      {showProgress && uploadProgress[file.name] !== undefined && (
                        <div className="mt-1">
                          <div className="w-full bg-[var(--border)] rounded-full h-1">
                            <div 
                              className="bg-[var(--primary)] h-1 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress[file.name]}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Upload Error */}
                      {uploadErrors[file.name] && (
                        <p className="text-xs text-[var(--error)] font-satoshi mt-1">
                          {uploadErrors[file.name]}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="p-1 text-[var(--muted)] hover:text-[var(--error)] transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </FieldWrapper>
  );
});

FileUpload.displayName = 'FileUpload';