// src/components/forms/elements/form-section.tsx

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { FieldError, type FieldErrorProps } from './field-error';
import { FieldHelp, type FieldHelpProps } from './field-help';

export interface FormSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  // Section content
  title?: string;
  description?: string;
  
  // Visual styling
  variant?: 'default' | 'card' | 'bordered' | 'elevated' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  
  // Behavior
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  disabled?: boolean;
  
  // Validation
  error?: string | string[];
  errorProps?: Omit<FieldErrorProps, 'error'>;
  
  // Help/guidance
  help?: string;
  tooltip?: string;
  helpProps?: Omit<FieldHelpProps, 'help' | 'tooltip'>;
  
  // Header actions
  actions?: React.ReactNode;
  badge?: string;
  required?: boolean;
  
  // Layout
  spacing?: 'sm' | 'md' | 'lg' | 'xl';
  contentSpacing?: 'sm' | 'md' | 'lg';
  
  // Content
  children: React.ReactNode;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  variant = 'default',
  size = 'md',
  collapsible = false,
  defaultCollapsed = false,
  disabled = false,
  error,
  errorProps,
  help,
  tooltip,
  helpProps,
  actions,
  badge,
  required = false,
  spacing = 'lg',
  contentSpacing = 'md',
  className,
  children,
  ...props
}) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // Variant styling
  const variantClasses = {
    default: '',
    card: 'bg-[var(--card-bg)] rounded-2xl shadow-[var(--card-shadow)] border border-[var(--card-border)]',
    bordered: 'border border-[var(--border)] rounded-xl',
    elevated: 'bg-[var(--card-bg)] rounded-2xl shadow-[var(--card-shadow-lg)] border border-[var(--card-border)]',
    ghost: 'bg-[var(--background-secondary)]/50 rounded-xl'
  };

  // Size classes for padding
  const sizeClasses = {
    sm: variant === 'default' ? '' : 'p-4',
    md: variant === 'default' ? '' : 'p-6',
    lg: variant === 'default' ? '' : 'p-8'
  };

  // Spacing between sections
  const spacingClasses = {
    sm: 'space-y-4',
    md: 'space-y-6',
    lg: 'space-y-8',
    xl: 'space-y-12'
  };

  // Content spacing within section
  const contentSpacingClasses = {
    sm: 'space-y-3',
    md: 'space-y-4',
    lg: 'space-y-6'
  };

  const hasHeader = title || description || actions || badge;

  return (
    <section
      className={cn(
        'font-satoshi',
        variantClasses[variant],
        sizeClasses[size],
        disabled && 'opacity-60 pointer-events-none',
        className
      )}
      aria-disabled={disabled}
      {...props}
    >
      {/* Section Header */}
      {hasHeader && (
        <div className={cn(
          'flex items-start justify-between gap-4',
          variant !== 'default' ? 'mb-6' : 'mb-4'
        )}>
          <div className="flex-1 min-w-0">
            {title && (
              <div className="flex items-center gap-2 mb-1">
                <h3 className={cn(
                  'font-satoshi-semibold text-[var(--heading-color)] leading-tight',
                  size === 'sm' && 'text-base',
                  size === 'md' && 'text-lg',
                  size === 'lg' && 'text-xl'
                )}>
                  {title}
                  {required && (
                    <span className="text-[var(--error)] ml-1" aria-label="required section">
                      *
                    </span>
                  )}
                </h3>

                {badge && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-satoshi-medium bg-[var(--primary)]/10 text-[var(--primary)]">
                    {badge}
                  </span>
                )}

                {collapsible && (
                  <button
                    type="button"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="ml-auto p-1 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors rounded"
                    aria-expanded={!isCollapsed}
                    aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
                  >
                    <svg
                      className={cn(
                        'w-5 h-5 transition-transform duration-200',
                        isCollapsed && 'rotate-180'
                      )}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {description && (
              <p className="text-sm text-[var(--caption-color)] font-satoshi leading-relaxed">
                {description}
              </p>
            )}
          </div>

          {actions && !collapsible && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      )}

      {/* Section Content */}
      {(!collapsible || !isCollapsed) && (
        <div className={cn(
          contentSpacingClasses[contentSpacing],
          hasHeader && 'mt-6'
        )}>
          {children}
        </div>
      )}

      {/* Section-level Error */}
      {error && (
        <div className="mt-4">
          <FieldError error={error} {...errorProps} />
        </div>
      )}

      {/* Section-level Help */}
      {(help || tooltip) && !error && (
        <div className="mt-3">
          <FieldHelp help={help} tooltip={tooltip} {...helpProps} />
        </div>
      )}
    </section>
  );
};

/**
 * Form Section Group - For organizing multiple related sections
 * Perfect for multi-step forms or complex form layouts
 */
export interface FormSectionGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  spacing?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'steps' | 'tabs';
  children: React.ReactNode;
}

export const FormSectionGroup: React.FC<FormSectionGroupProps> = ({
  title,
  description,
  spacing = 'lg',
  variant = 'default',
  className,
  children,
  ...props
}) => {
  const spacingClasses = {
    sm: 'space-y-6',
    md: 'space-y-8',
    lg: 'space-y-12',
    xl: 'space-y-16'
  };

  return (
    <div
      className={cn(
        'font-satoshi',
        spacingClasses[spacing],
        className
      )}
      {...props}
    >
      {/* Group Header */}
      {(title || description) && (
        <div className="text-center max-w-2xl mx-auto mb-8">
          {title && (
            <h2 className="font-satoshi-bold text-2xl text-[var(--heading-color)] mb-2">
              {title}
            </h2>
          )}
          {description && (
            <p className="text-[var(--caption-color)] font-satoshi">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Sections */}
      {variant === 'steps' ? (
        <div className="relative">
          {/* Step connector line */}
          <div className="absolute left-8 top-0 bottom-0 w-px bg-[var(--border)] -z-10" />
          
          <div className="space-y-8">
            {React.Children.map(children, (child, index) => (
              <div className="relative flex gap-6">
                {/* Step number */}
                <div className="flex-shrink-0 w-16 h-16 bg-[var(--primary)] text-white rounded-full flex items-center justify-center font-satoshi-bold text-lg">
                  {index + 1}
                </div>
                {/* Step content */}
                <div className="flex-1 pt-2">
                  {child}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className={spacingClasses[spacing]}>
          {children}
        </div>
      )}
    </div>
  );
};

/**
 * Specialized sections for common form patterns
 */

/**
 * Personal Information Section - For user/profile forms
 */
export interface PersonalInfoSectionProps extends Omit<FormSectionProps, 'title' | 'description'> {
  showAvatar?: boolean;
  avatarProps?: {
    src?: string;
    alt?: string;
    onUpload?: (file: File) => void;
  };
}

export const PersonalInfoSection: React.FC<PersonalInfoSectionProps> = ({
  showAvatar = false,
  avatarProps,
  children,
  ...props
}) => {
  return (
    <FormSection
      title="Personal Information"
      description="Your basic profile information"
      badge="Required"
      required
      {...props}
    >
      {showAvatar && avatarProps && (
        <div className="flex items-center gap-4 p-4 bg-[var(--background-secondary)] rounded-xl mb-6">
          <div className="w-16 h-16 bg-[var(--muted)] rounded-full overflow-hidden">
            {avatarProps.src ? (
              <img
                src={avatarProps.src}
                alt={avatarProps.alt || 'Profile picture'}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--muted-foreground)]">
                <svg className="w-8 h-8" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 8a3 3 0 100-6 3 3 0 000 6zM3.465 14.493a1.23 1.23 0 00.41 1.412A9.957 9.957 0 0010 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 00-13.074.003z" />
                </svg>
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-satoshi-medium text-[var(--heading-color)] mb-1">
              Profile Picture
            </p>
            <button
              type="button"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file && avatarProps.onUpload) {
                    avatarProps.onUpload(file);
                  }
                };
                input.click();
              }}
              className="text-xs text-[var(--primary)] hover:text-[var(--primary-dark)] font-satoshi-medium"
            >
              Upload new picture
            </button>
          </div>
        </div>
      )}
      {children}
    </FormSection>
  );
};

/**
 * Business Information Section - For business/company forms
 */
export const BusinessInfoSection: React.FC<Omit<FormSectionProps, 'title' | 'description'>> = ({
  children,
  ...props
}) => {
  return (
    <FormSection
      title="Business Information"
      description="Company details and business profile"
      badge="Required"
      required
      {...props}
    >
      {children}
    </FormSection>
  );
};

/**
 * Settings Section - For configuration forms
 */
export const SettingsSection: React.FC<Omit<FormSectionProps, 'title' | 'description'> & {
  category: string;
}> = ({
  category,
  children,
  ...props
}) => {
  return (
    <FormSection
      title={`${category} Settings`}
      description={`Configure your ${category.toLowerCase()} preferences`}
      collapsible
      {...props}
    >
      {children}
    </FormSection>
  );
};