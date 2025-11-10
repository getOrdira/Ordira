// src/components/ui/data-display/chip.tsx
'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/utils';
import { XMarkIcon } from '@heroicons/react/24/outline';

const chipVariants = cva(
  "inline-flex items-center font-satoshi-medium transition-all duration-200",
  {
    variants: {
      variant: {
        default: "bg-[var(--background-secondary)] text-[var(--foreground)] hover:bg-[var(--background-tertiary)]",
        primary: "bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20",
        secondary: "bg-[var(--muted)]/10 text-[var(--muted)] hover:bg-[var(--muted)]/20",
        success: "bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20",
        warning: "bg-[var(--warning)]/10 text-[var(--warning)] hover:bg-[var(--warning)]/20",
        error: "bg-[var(--error)]/10 text-[var(--error)] hover:bg-[var(--error)]/20",
        info: "bg-[var(--info)]/10 text-[var(--info)] hover:bg-[var(--info)]/20",
        outline: "border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--hover-overlay)]",
        solid: "bg-[var(--foreground)] text-[var(--background)] hover:bg-[var(--foreground-secondary)]"
      },
      size: {
        sm: "px-2 py-1 text-xs rounded-md gap-1",
        md: "px-3 py-1.5 text-sm rounded-lg gap-1.5",
        lg: "px-4 py-2 text-base rounded-xl gap-2"
      },
      clickable: {
        true: "cursor-pointer hover:scale-105 active:scale-95",
        false: "cursor-default"
      },
      removable: {
        true: "pr-1", // Less right padding when X button is present
        false: ""
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      clickable: false,
      removable: false
    }
  }
);

export interface ChipProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof chipVariants> {
  children: React.ReactNode;
  
  // Visual elements
  icon?: React.ReactNode;
  avatar?: React.ReactNode;
  
  // Interaction
  onRemove?: () => void;
  onChipClick?: () => void;
  disabled?: boolean;
  
  // Custom styling
  removeButtonClassName?: string;
  
  // Accessibility
  removeButtonAriaLabel?: string;
}

const Chip = React.forwardRef<HTMLDivElement, ChipProps>(
  ({
    children,
    icon,
    avatar,
    onRemove,
    onChipClick,
    disabled = false,
    removeButtonClassName,
    removeButtonAriaLabel = "Remove",
    variant = "default",
    size = "md",
    clickable,
    removable,
    className,
    onClick,
    ...props
  }, ref) => {
    // Auto-determine clickable and removable if not explicitly set
    const isClickable = clickable ?? Boolean(onChipClick || onClick);
    const isRemovable = removable ?? Boolean(onRemove);

    const handleChipClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;
      
      // Don't trigger chip click if clicking the remove button
      if ((e.target as HTMLElement).closest('[data-chip-remove]')) {
        return;
      }
      
      onChipClick?.();
      onClick?.(e);
    };

    const handleRemoveClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (disabled) return;
      onRemove?.();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return;
      
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onChipClick?.();
        onClick?.(e as any);
      }
      
      if (e.key === 'Backspace' || e.key === 'Delete') {
        if (isRemovable) {
          e.preventDefault();
          onRemove?.();
        }
      }
    };

    return (
      <div
        ref={ref}
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable && !disabled ? 0 : undefined}
        aria-disabled={disabled}
        className={cn(
          chipVariants({ 
            variant, 
            size, 
            clickable: isClickable && !disabled,
            removable: isRemovable
          }),
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        onClick={isClickable ? handleChipClick : undefined}
        onKeyDown={isClickable ? handleKeyDown : undefined}
        {...props}
      >
        {/* Avatar (if provided) */}
        {avatar && (
          <div className="flex-shrink-0">
            {avatar}
          </div>
        )}
        
        {/* Icon (if provided and no avatar) */}
        {icon && !avatar && (
          <div className="flex-shrink-0">
            {icon}
          </div>
        )}
        
        {/* Content */}
        <span className="truncate">
          {children}
        </span>
        
        {/* Remove button */}
        {isRemovable && (
          <button
            type="button"
            data-chip-remove
            onClick={handleRemoveClick}
            disabled={disabled}
            aria-label={removeButtonAriaLabel}
            className={cn(
              "flex-shrink-0 rounded-full p-0.5 hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-black/20 transition-colors",
              disabled && "cursor-not-allowed",
              removeButtonClassName
            )}
          >
            <XMarkIcon className={cn(
              size === 'sm' && "w-3 h-3",
              size === 'md' && "w-4 h-4", 
              size === 'lg' && "w-5 h-5"
            )} />
          </button>
        )}
      </div>
    );
  }
);

Chip.displayName = "Chip";

// Pre-configured chip variants for common use cases

// Tag Chip - for categories, tags, labels
export interface TagChipProps extends Omit<ChipProps, 'variant'> {
  color?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
}

export const TagChip = React.forwardRef<HTMLDivElement, TagChipProps>(
  ({ color = 'default', ...props }, ref) => (
    <Chip
      ref={ref}
      variant={color}
      size="sm"
      {...props}
    />
  )
);

TagChip.displayName = "TagChip";

// Filter Chip - for active filters
export interface FilterChipProps extends Omit<ChipProps, 'variant' | 'removable'> {
  active?: boolean;
}

export const FilterChip = React.forwardRef<HTMLDivElement, FilterChipProps>(
  ({ active = false, ...props }, ref) => (
    <Chip
      ref={ref}
      variant={active ? 'primary' : 'outline'}
      removable={active}
      clickable
      {...props}
    />
  )
);

FilterChip.displayName = "FilterChip";

// User Chip - for displaying users with avatars
export interface UserChipProps extends Omit<ChipProps, 'avatar' | 'children'> {
  name: string;
  email?: string;
  avatarUrl?: string;
  showEmail?: boolean;
}

export const UserChip = React.forwardRef<HTMLDivElement, UserChipProps>(
  ({ name, email, avatarUrl, showEmail = false, ...props }, ref) => {
    const avatar = (
      <div className="w-6 h-6 bg-[var(--background-tertiary)] rounded-full overflow-hidden flex-shrink-0">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-[var(--muted)] flex items-center justify-center">
            <span className="text-xs font-medium text-[var(--background)]">
              {name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>
    );

    return (
      <Chip
        ref={ref}
        avatar={avatar}
        {...props}
      >
        <div className="min-w-0">
          <div className="truncate font-medium">{name}</div>
          {showEmail && email && (
            <div className="text-xs text-[var(--muted)] truncate">{email}</div>
          )}
        </div>
      </Chip>
    );
  }
);

UserChip.displayName = "UserChip";

// Skill/Technology Chip - for listing skills, technologies, services
export interface SkillChipProps extends Omit<ChipProps, 'variant'> {
  level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

export const SkillChip = React.forwardRef<HTMLDivElement, SkillChipProps>(
  ({ level, ...props }, ref) => {
    const levelVariants = {
      beginner: 'default',
      intermediate: 'info',
      advanced: 'primary',
      expert: 'success'
    } as const;

    return (
      <Chip
        ref={ref}
        variant={level ? levelVariants[level] : 'default'}
        size="sm"
        {...props}
      />
    );
  }
);

SkillChip.displayName = "SkillChip";

// Status Chip - for showing states/statuses
export interface StatusChipProps extends Omit<ChipProps, 'variant' | 'children'> {
  status: 'active' | 'inactive' | 'pending' | 'approved' | 'rejected' | 'draft' | 'published';
  label?: string;
}

export const StatusChip = React.forwardRef<HTMLDivElement, StatusChipProps>(
  ({ status, label, ...props }, ref) => {
    const statusConfig = {
      active: { variant: 'success' as const, label: 'Active' },
      inactive: { variant: 'default' as const, label: 'Inactive' },
      pending: { variant: 'warning' as const, label: 'Pending' },
      approved: { variant: 'success' as const, label: 'Approved' },
      rejected: { variant: 'error' as const, label: 'Rejected' },
      draft: { variant: 'default' as const, label: 'Draft' },
      published: { variant: 'primary' as const, label: 'Published' }
    };

    const config = statusConfig[status];

    return (
      <Chip
        ref={ref}
        variant={config.variant}
        size="sm"
        {...props}
      >
        {label || config.label}
      </Chip>
    );
  }
);

StatusChip.displayName = "StatusChip";

export { Chip };
export default Chip;