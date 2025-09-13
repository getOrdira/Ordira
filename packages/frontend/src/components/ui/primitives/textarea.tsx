// src/components/ui/primitives/textarea.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const textareaVariants = cva(
  // Base styles - clean white box with rounded corners like your image
  "flex w-full rounded-2xl border bg-white px-4 py-3 text-base font-satoshi-regular transition-all duration-200 placeholder:text-[var(--muted)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-none text-[var(--ordira-accent)]",
  {
    variants: {
      variant: {
        // Default textarea style (matches your image with orange focus)
        default: [
          "border-gray-200",
          "focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20",
          "hover:border-gray-300"
        ].join(" "),
        
        // Error state with red border
        error: [
          "border-[var(--error)] ring-2 ring-[var(--error)]/20",
          "focus:border-[var(--error)] focus:ring-[var(--error)]/30"
        ].join(" "),
        
        // Success state (like your green border in image)
        success: [
          "border-[var(--success)] ring-2 ring-[var(--success)]/20",
          "focus:border-[var(--success)] focus:ring-[var(--success)]/30"
        ].join(" "),
        
        // Ghost variant with minimal styling
        ghost: [
          "border-transparent bg-gray-50",
          "focus:border-[var(--primary)] focus:bg-white focus:ring-2 focus:ring-[var(--primary)]/20",
          "hover:bg-gray-100"
        ].join(" ")
      },
      size: {
        // Small - for names, titles, short inputs
        xs: "min-h-[60px] px-3 py-2 text-sm rounded-xl",
        sm: "min-h-[80px] px-3 py-2 text-sm rounded-xl",
        // Medium - default size like your image
        md: "min-h-[120px] px-4 py-3 text-base rounded-2xl",
        // Large - for descriptions, comments
        lg: "min-h-[160px] px-5 py-4 text-base rounded-2xl",
        // Extra large - for long content
        xl: "min-h-[240px] px-6 py-5 text-base rounded-2xl"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
);

export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>,
    VariantProps<typeof textareaVariants> {
  label?: string;
  description?: string;
  error?: string;
  success?: string;
  helper?: string;
  showCharacterCount?: boolean;
  maxLength?: number;
  autoResize?: boolean;
  icon?: React.ReactNode;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ 
    className, 
    variant, 
    size,
    label,
    description,
    error,
    success,
    helper,
    showCharacterCount = false,
    maxLength,
    autoResize = false,
    icon,
    value,
    defaultValue,
    onChange,
    disabled,
    id,
    ...props 
  }, ref) => {
    const [internalValue, setInternalValue] = useState(
      (value || defaultValue || '').toString()
    );
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    
    // Use external ref if provided, otherwise use internal ref
    const finalRef = (ref as React.RefObject<HTMLTextAreaElement>) || textareaRef;
    
    const currentValue = value !== undefined ? value.toString() : internalValue;
    const characterCount = currentValue.length;
    const isOverLimit = maxLength ? characterCount > maxLength : false;
    
    // Determine variant based on error/success state
    const currentVariant = error ? 'error' : success ? 'success' : variant;
    
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      
      // Enforce maxLength if provided
      if (maxLength && newValue.length > maxLength) {
        return;
      }
      
      setInternalValue(newValue);
      onChange?.(e);
      
      // Auto-resize functionality
      if (autoResize && finalRef.current) {
        finalRef.current.style.height = 'auto';
        finalRef.current.style.height = `${finalRef.current.scrollHeight}px`;
      }
    };

    // Auto-resize on mount and value changes
    useEffect(() => {
      if (autoResize && finalRef.current) {
        finalRef.current.style.height = 'auto';
        finalRef.current.style.height = `${finalRef.current.scrollHeight}px`;
      }
    }, [currentValue, autoResize]);

    const textareaElement = (
      <div className="relative">
        {/* Icon */}
        {icon && (
          <div className="absolute left-4 top-4 text-[var(--muted)] pointer-events-none z-10">
            <div className="w-5 h-5">
              {icon}
            </div>
          </div>
        )}
        
        {/* Textarea */}
        <textarea
          ref={finalRef}
          id={textareaId}
          className={cn(
            textareaVariants({ variant: currentVariant, size, className }),
            icon && "pl-12"
          )}
          value={currentValue}
          onChange={handleChange}
          maxLength={maxLength}
          disabled={disabled}
          {...props}
        />
        
        {/* Character Counter - styled like your image */}
        {(showCharacterCount || maxLength) && (
          <div className="absolute bottom-3 right-4 flex items-center space-x-1">
            <div className="w-4 h-4 text-[var(--muted)]">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-full h-full">
                <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
              </svg>
            </div>
            <span className={cn(
              "text-sm font-satoshi-medium",
              isOverLimit ? "text-[var(--error)]" : "text-[var(--muted)]"
            )}>
              {characterCount}
              {maxLength && `/${maxLength}`}
            </span>
          </div>
        )}
      </div>
    );

    // If no label, error, success, helper, or description, return just the textarea
    if (!label && !error && !success && !helper && !description) {
      return textareaElement;
    }

    return (
      <div className="space-y-2">
        {/* Label */}
        {label && (
          <label 
            htmlFor={textareaId}
            className="text-base font-satoshi-medium text-[var(--ordira-accent)] block"
          >
            {label}
          </label>
        )}
        
        {/* Description */}
        {description && (
          <p className="text-sm font-satoshi-regular text-[var(--muted)]">
            {description}
          </p>
        )}
        
        {/* Textarea */}
        {textareaElement}
        
        {/* Error Message */}
        {error && (
          <p className="text-sm font-satoshi-regular text-[var(--error)] flex items-center gap-1">
            <span className="w-4 h-4">⚠</span>
            {error}
          </p>
        )}
        
        {/* Success Message */}
        {success && (
          <p className="text-sm font-satoshi-regular text-[var(--success)] flex items-center gap-1">
            <span className="w-4 h-4">✓</span>
            {success}
          </p>
        )}
        
        {/* Helper Text */}
        {helper && !error && !success && (
          <p className="text-sm font-satoshi-regular text-[var(--muted)]">
            {helper}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

// Name Textarea - Small textarea for names, titles, etc.
export interface NameTextareaProps extends Omit<TextareaProps, 'size' | 'maxLength' | 'showCharacterCount'> {
  maxLength?: number;
}

const NameTextarea = React.forwardRef<HTMLTextAreaElement, NameTextareaProps>(
  ({ maxLength = 100, ...props }, ref) => {
    return (
      <Textarea
        ref={ref}
        size="xs"
        maxLength={maxLength}
        showCharacterCount
        autoResize
        {...props}
      />
    );
  }
);

NameTextarea.displayName = "NameTextarea";

// Description Textarea - Larger textarea for product descriptions, etc.
export interface DescriptionTextareaProps extends Omit<TextareaProps, 'size' | 'maxLength' | 'showCharacterCount'> {
  maxLength?: number;
}

const DescriptionTextarea = React.forwardRef<HTMLTextAreaElement, DescriptionTextareaProps>(
  ({ maxLength = 500, ...props }, ref) => {
    return (
      <Textarea
        ref={ref}
        size="lg"
        maxLength={maxLength}
        showCharacterCount
        {...props}
      />
    );
  }
);

DescriptionTextarea.displayName = "DescriptionTextarea";

// AI Prompt Textarea - Specialized for AI interactions (like your image)
export interface AITextareaProps extends Omit<TextareaProps, 'icon' | 'placeholder' | 'variant' | 'onSubmit'> {
  onSubmit?: (value: string) => void;
  isLoading?: boolean;
  submitOnEnter?: boolean;
  showAIIcon?: boolean;
  suggestions?: string[];
}

const AITextarea = React.forwardRef<HTMLTextAreaElement, AITextareaProps>(
  ({ 
    onSubmit,
    isLoading = false,
    submitOnEnter = true,
    showAIIcon = true,
    suggestions = [],
    value,
    onChange,
    onKeyDown,
    maxLength = 500,
    ...props 
  }, ref) => {
    const [internalValue, setInternalValue] = useState(value?.toString() || '');
    const currentValue = value !== undefined ? value.toString() : internalValue;
    
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInternalValue(e.target.value);
      onChange?.(e);
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (submitOnEnter && e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (currentValue.trim() && !isLoading) {
          onSubmit?.(currentValue);
        }
      }
      onKeyDown?.(e);
    };
    
    const handleSubmit = () => {
      if (currentValue.trim() && !isLoading) {
        onSubmit?.(currentValue);
      }
    };

    return (
      <div className="space-y-3">
        <Textarea
          ref={ref}
          variant="success"
          value={currentValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="What would you like our AI to know about you to provide better responses?"
          showCharacterCount
          maxLength={maxLength}
          autoResize
          disabled={isLoading}
          icon={showAIIcon ? (
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423L16.5 15.75l.394 1.183a2.25 2.25 0 001.423 1.423L19.5 18.75l-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          ) : undefined}
          {...props}
        />
        
        {/* AI Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-satoshi-medium text-[var(--muted)]">Suggestions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setInternalValue(suggestion)}
                  className="text-xs font-satoshi-medium px-3 py-1 rounded-full border border-[var(--success)]/30 text-[var(--success)] hover:bg-[var(--success)]/10 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Submit Button */}
        {onSubmit && (
          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={!currentValue.trim() || isLoading}
              className="px-4 py-2 bg-[var(--success)] text-white rounded-xl hover:bg-[var(--success-dark)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-satoshi-medium"
            >
              {isLoading ? 'Processing...' : 'Submit'}
            </button>
          </div>
        )}
      </div>
    );
  }
);

AITextarea.displayName = "AITextarea";

// Comment Textarea - For comments and feedback
export interface CommentTextareaProps extends Omit<TextareaProps, 'onSubmit'> {
  authorName?: string;
  authorAvatar?: string;
  onSubmit?: (value: string) => void;
  showSubmitButton?: boolean;
  submitButtonText?: string;
}

const CommentTextarea = React.forwardRef<HTMLTextAreaElement, CommentTextareaProps>(
  ({ 
    authorName,
    authorAvatar,
    onSubmit,
    showSubmitButton = true,
    submitButtonText = "Post Comment",
    value,
    onChange,
    ...props 
  }, ref) => {
    const [internalValue, setInternalValue] = useState(value?.toString() || '');
    const currentValue = value !== undefined ? value.toString() : internalValue;
    
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInternalValue(e.target.value);
      onChange?.(e);
    };
    
    const handleSubmit = () => {
      if (currentValue.trim()) {
        onSubmit?.(currentValue);
        setInternalValue('');
      }
    };

    return (
      <div className="space-y-3">
        {/* Author Info */}
        {(authorName || authorAvatar) && (
          <div className="flex items-center space-x-2">
            {authorAvatar && (
              <img 
                src={authorAvatar} 
                alt={authorName || 'User'} 
                className="w-8 h-8 rounded-full object-cover"
              />
            )}
            {authorName && (
              <span className="text-sm font-satoshi-medium text-[var(--ordira-accent)]">
                {authorName}
              </span>
            )}
          </div>
        )}
        
        <Textarea
          ref={ref}
          value={currentValue}
          onChange={handleChange}
          placeholder="Add a comment..."
          size="sm"
          showCharacterCount
          maxLength={1000}
          {...props}
        />
        
        {/* Submit Button */}
        {showSubmitButton && (
          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={!currentValue.trim()}
              className="px-4 py-2 bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-satoshi-medium"
            >
              {submitButtonText}
            </button>
          </div>
        )}
      </div>
    );
  }
);

CommentTextarea.displayName = "CommentTextarea";

export { 
  Textarea, 
  NameTextarea,
  DescriptionTextarea,
  AITextarea, 
  CommentTextarea, 
  textareaVariants 
};