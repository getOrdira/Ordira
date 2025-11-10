// src/components/ui/data-display/key-value.tsx
'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/utils';
import { 
  ClipboardDocumentIcon,
  EyeIcon,
  EyeSlashIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const keyValueVariants = cva(
  "font-satoshi",
  {
    variants: {
      variant: {
        default: "",
        card: "bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-4",
        inline: "inline-flex items-center space-x-2",
        stack: "space-y-1"
      },
      size: {
        sm: "text-sm",
        md: "text-base", 
        lg: "text-lg"
      },
      layout: {
        horizontal: "flex items-center justify-between",
        vertical: "space-y-1",
        grid: "grid grid-cols-2 gap-2"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      layout: "horizontal"
    }
  }
);

export interface KeyValueProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof keyValueVariants> {
  label: string;
  value: React.ReactNode;
  
  // Visual styling
  icon?: React.ReactNode;
  tooltip?: string;
  
  // Interaction features
  copyable?: boolean;
  sensitive?: boolean; // For passwords, tokens, etc.
  
  // Formatting
  valueClassName?: string;
  labelClassName?: string;
  
  // Loading/error states
  loading?: boolean;
  error?: string;
  
  // Custom render functions
  renderValue?: (value: any) => React.ReactNode;
  renderLabel?: (label: string) => React.ReactNode;
}

const KeyValue = React.forwardRef<HTMLDivElement, KeyValueProps>(
  ({
    label,
    value,
    icon,
    tooltip,
    copyable = false,
    sensitive = false,
    valueClassName,
    labelClassName,
    loading = false,
    error,
    renderValue,
    renderLabel,
    variant = "default",
    size = "md",
    layout = "horizontal",
    className,
    ...props
  }, ref) => {
    const [showSensitive, setShowSensitive] = React.useState(false);
    const [copied, setCopied] = React.useState(false);

    // Handle copy functionality
    const handleCopy = async () => {
      if (!copyable || !value) return;
      
      try {
        const textValue = typeof value === 'string' ? value : value?.toString() || '';
        await navigator.clipboard.writeText(textValue);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    };

    // Render the value with appropriate formatting
    const renderValueContent = () => {
      if (loading) {
        return (
          <div className="animate-pulse">
            <div className="h-4 bg-[var(--background-secondary)] rounded w-24"></div>
          </div>
        );
      }

      if (error) {
        return (
          <span className="text-[var(--error)] text-sm flex items-center space-x-1">
            <InformationCircleIcon className="w-4 h-4" />
            <span>Error: {error}</span>
          </span>
        );
      }

      if (renderValue) {
        return renderValue(value);
      }

      if (sensitive && !showSensitive) {
        return (
          <span className="font-mono text-[var(--muted)]">
            {'•'.repeat(8)}
          </span>
        );
      }

      // Handle different value types
      if (value === null || value === undefined) {
        return <span className="text-[var(--muted)] italic">Not set</span>;
      }

      if (typeof value === 'boolean') {
        return (
          <span className={cn(
            "font-medium",
            value ? "text-[var(--success)]" : "text-[var(--error)]"
          )}>
            {value ? 'Yes' : 'No'}
          </span>
        );
      }

      if (typeof value === 'number') {
        return <span className="font-mono">{value.toLocaleString()}</span>;
      }

      if (React.isValidElement(value)) {
        return value;
      }

      return <span>{String(value)}</span>;
    };

    // Render the label
    const renderLabelContent = () => {
      if (renderLabel) {
        return renderLabel(label);
      }

      return (
        <div className="flex items-center space-x-2">
          {icon && (
            <div className="text-[var(--muted)] flex-shrink-0">
              {icon}
            </div>
          )}
          <span>{label}</span>
          {tooltip && (
            <div title={tooltip} className="text-[var(--muted)]">
              <InformationCircleIcon className="w-4 h-4" />
            </div>
          )}
        </div>
      );
    };

    return (
      <div
        ref={ref}
        className={cn(keyValueVariants({ variant, size, layout }), className)}
        {...props}
      >
        {/* Label */}
        <div className={cn(
          "text-[var(--caption-color)] font-satoshi-medium",
          layout === 'vertical' && "mb-1",
          labelClassName
        )}>
          {renderLabelContent()}
        </div>

        {/* Value with controls */}
        <div className={cn(
          "flex items-center space-x-2",
          layout === 'vertical' && "mt-1"
        )}>
          <div className={cn(
            "text-[var(--heading-color)] font-satoshi-regular min-w-0 flex-1",
            sensitive && "font-mono",
            valueClassName
          )}>
            {renderValueContent()}
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-1 flex-shrink-0">
            {/* Sensitive toggle */}
            {sensitive && (
              <button
                type="button"
                onClick={() => setShowSensitive(!showSensitive)}
                className="p-1 rounded-md text-[var(--muted)] hover:text-[var(--heading-color)] hover:bg-[var(--hover-overlay)] transition-colors"
                aria-label={showSensitive ? "Hide value" : "Show value"}
              >
                {showSensitive ? (
                  <EyeSlashIcon className="w-4 h-4" />
                ) : (
                  <EyeIcon className="w-4 h-4" />
                )}
              </button>
            )}

            {/* Copy button */}
            {copyable && value && (
              <button
                type="button"
                onClick={handleCopy}
                className={cn(
                  "p-1 rounded-md transition-colors",
                  copied 
                    ? "text-[var(--success)] bg-[var(--success)]/10"
                    : "text-[var(--muted)] hover:text-[var(--heading-color)] hover:bg-[var(--hover-overlay)]"
                )}
                aria-label="Copy value"
              >
                <ClipboardDocumentIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
);

KeyValue.displayName = "KeyValue";

// KeyValueList - for displaying multiple key-value pairs
export interface KeyValueListProps {
  items: Array<{
    label: string;
    value: React.ReactNode;
    icon?: React.ReactNode;
    copyable?: boolean;
    sensitive?: boolean;
    error?: string;
  }>;
  
  variant?: VariantProps<typeof keyValueVariants>['variant'];
  size?: VariantProps<typeof keyValueVariants>['size'];
  layout?: VariantProps<typeof keyValueVariants>['layout'];
  
  className?: string;
  itemClassName?: string;
  
  // Grid layout options
  columns?: 1 | 2 | 3 | 4;
  
  // Card options
  title?: string;
  description?: string;
}

export const KeyValueList = React.forwardRef<HTMLDivElement, KeyValueListProps>(
  ({
    items,
    variant = "default",
    size = "md",
    layout = "horizontal",
    className,
    itemClassName,
    columns = 1,
    title,
    description,
    ...props
  }, ref) => {
    const gridCols = {
      1: "grid-cols-1",
      2: "grid-cols-1 md:grid-cols-2",
      3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
      4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
    };

    const content = (
      <div className={cn(
        variant === 'card' && "space-y-4",
        variant !== 'card' && columns > 1 && cn("grid gap-4", gridCols[columns]),
        variant !== 'card' && columns === 1 && "space-y-3"
      )}>
        {items.map((item, index) => (
          <KeyValue
            key={index}
            label={item.label}
            value={item.value}
            icon={item.icon}
            copyable={item.copyable}
            sensitive={item.sensitive}
            error={item.error}
            variant={variant}
            size={size}
            layout={layout}
            className={itemClassName}
          />
        ))}
      </div>
    );

    if (variant === 'card') {
      return (
        <div
          ref={ref}
          className={cn(
            "bg-[var(--card-bg)] border border-[var(--card-border)] rounded-lg p-6",
            className
          )}
          {...props}
        >
          {(title || description) && (
            <div className="mb-4">
              {title && (
                <h3 className="font-satoshi-bold text-lg text-[var(--heading-color)]">
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-sm text-[var(--caption-color)] mt-1">
                  {description}
                </p>
              )}
            </div>
          )}
          {content}
        </div>
      );
    }

    return (
      <div ref={ref} className={cn("font-satoshi", className)} {...props}>
        {(title || description) && (
          <div className="mb-4">
            {title && (
              <h3 className="font-satoshi-bold text-lg text-[var(--heading-color)]">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-sm text-[var(--caption-color)] mt-1">
                {description}
              </p>
            )}
          </div>
        )}
        {content}
      </div>
    );
  }
);

KeyValueList.displayName = "KeyValueList";

// Pre-configured components for common use cases

// Profile KeyValue - for user/business profiles
export interface ProfileKeyValueProps extends Omit<KeyValueProps, 'variant'> {}

export const ProfileKeyValue = React.forwardRef<HTMLDivElement, ProfileKeyValueProps>(
  (props, ref) => (
    <KeyValue
      ref={ref}
      variant="default"
      layout="horizontal"
      {...props}
    />
  )
);

ProfileKeyValue.displayName = "ProfileKeyValue";

// Settings KeyValue - for configuration settings
export interface SettingsKeyValueProps extends Omit<KeyValueProps, 'variant'> {}

export const SettingsKeyValue = React.forwardRef<HTMLDivElement, SettingsKeyValueProps>(
  (props, ref) => (
    <KeyValue
      ref={ref}
      variant="card"
      layout="horizontal"
      copyable={true}
      {...props}
    />
  )
);

SettingsKeyValue.displayName = "SettingsKeyValue";

// Analytics KeyValue - for metrics and data
export interface AnalyticsKeyValueProps extends Omit<KeyValueProps, 'variant' | 'layout'> {}

export const AnalyticsKeyValue = React.forwardRef<HTMLDivElement, AnalyticsKeyValueProps>(
  (props, ref) => (
    <KeyValue
      ref={ref}
      variant="default"
      layout="vertical"
      size="lg"
      {...props}
    />
  )
);

AnalyticsKeyValue.displayName = "AnalyticsKeyValue";

export { KeyValue };
export default KeyValue;