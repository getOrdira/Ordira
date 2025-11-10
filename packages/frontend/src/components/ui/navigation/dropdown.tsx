// src/components/ui/navigation/dropdown.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/utils';

const dropdownVariants = cva(
  // Base dropdown panel styles - clean, generic design
  "absolute bg-white border border-gray-200 rounded-2xl shadow-xl z-50 backdrop-blur-sm",
  {
    variants: {
      size: {
        xs: "min-w-[120px] py-1",
        sm: "min-w-[160px] py-2",
        md: "min-w-[200px] py-2",
        lg: "min-w-[240px] py-2",
        xl: "min-w-[280px] py-3",
        auto: "w-auto py-2"
      },
      position: {
        "bottom-left": "top-full left-0 mt-2",
        "bottom-right": "top-full right-0 mt-2", 
        "bottom-center": "top-full left-1/2 transform -translate-x-1/2 mt-2",
        "top-left": "bottom-full left-0 mb-2",
        "top-right": "bottom-full right-0 mb-2",
        "top-center": "bottom-full left-1/2 transform -translate-x-1/2 mb-2",
        "left": "right-full top-0 mr-2",
        "right": "left-full top-0 ml-2"
      }
    },
    defaultVariants: {
      size: "md",
      position: "bottom-right"
    }
  }
);

const dropdownItemVariants = cva(
  // Base item styles with Ordira branding
  "flex items-center space-x-3 px-3 py-2 text-sm font-satoshi-regular transition-all duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 rounded-lg mx-2 relative",
  {
    variants: {
      variant: {
        default: "text-[var(--ordira-accent)] hover:bg-gray-50 hover:text-[var(--primary)]",
        primary: "text-[var(--primary)] hover:bg-[var(--primary)]/10",
        success: "text-[var(--success)] hover:bg-[var(--success)]/10",
        warning: "text-[var(--warning)] hover:bg-[var(--warning)]/10",
        destructive: "text-[var(--error)] hover:bg-[var(--error)]/5"
      },
      size: {
        sm: "px-2 py-1.5 text-xs",
        md: "px-3 py-2 text-sm",
        lg: "px-4 py-3 text-base"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
  }
);

export interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  href?: string;
  shortcut?: string;
  badge?: string | number;
  dividerAfter?: boolean;
}

export interface DropdownProps extends VariantProps<typeof dropdownVariants> {
  trigger: React.ReactNode;
  items?: DropdownItem[];
  children?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  panelClassName?: string;
  triggerClassName?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  closeOnItemClick?: boolean;
  align?: 'start' | 'center' | 'end';
}

const Dropdown = React.forwardRef<HTMLDivElement, DropdownProps>(
  ({
    trigger,
    items = [],
    children,
    disabled = false,
    className,
    panelClassName,
    triggerClassName,
    open: controlledOpen,
    defaultOpen = false,
    size,
    position,
    onOpenChange,
    closeOnItemClick = true,
    align = 'end',
    ...props
  }, ref) => {
    const [internalOpen, setInternalOpen] = useState(defaultOpen);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    
    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
    
    // Handle clicking outside to close dropdown
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          dropdownRef.current && 
          !dropdownRef.current.contains(event.target as Node) &&
          triggerRef.current &&
          !triggerRef.current.contains(event.target as Node)
        ) {
          setInternalOpen(false);
          onOpenChange?.(false);
        }
      };
      
      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
      }
      
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onOpenChange]);
    
    // Handle escape key
    useEffect(() => {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && isOpen) {
          setInternalOpen(false);
          onOpenChange?.(false);
        }
      };
      
      if (isOpen) {
        document.addEventListener('keydown', handleEscape);
      }
      
      return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onOpenChange]);
    
    const handleToggle = () => {
      if (!disabled) {
        const newState = !isOpen;
        setInternalOpen(newState);
        onOpenChange?.(newState);
      }
    };
    
    const handleItemClick = (item: DropdownItem) => {
      if (!item.disabled) {
        item.onClick?.();
        if (closeOnItemClick && !item.href) {
          setInternalOpen(false);
          onOpenChange?.(false);
        }
      }
    };

    return (
      <div className={cn("relative inline-block", className)} {...props}>
        {/* Trigger */}
        <div
          ref={triggerRef}
          onClick={handleToggle}
          className={cn(
            "cursor-pointer",
            disabled && "cursor-not-allowed opacity-50",
            triggerClassName
          )}
          role="button"
          aria-expanded={isOpen}
          aria-haspopup="menu"
          tabIndex={disabled ? -1 : 0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleToggle();
            }
          }}
        >
          {trigger}
        </div>
        
        {/* Dropdown Panel */}
        {isOpen && (
          <div
            ref={dropdownRef}
            className={cn(
              dropdownVariants({ size, position }),
              panelClassName
            )}
            role="menu"
            aria-orientation="vertical"
          >
            {/* Custom children content */}
            {children}
            
            {/* Generated items */}
            {items.map((item, index) => (
              <React.Fragment key={item.id}>
                {item.href ? (
                  <a
                    href={item.href}
                    className={cn(dropdownItemVariants({ 
                      variant: item.variant, 
                      size: item.size 
                    }))}
                    role="menuitem"
                    tabIndex={0}
                  >
                    {item.icon && (
                      <div className="w-4 h-4 text-current flex-shrink-0">
                        {item.icon}
                      </div>
                    )}
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.shortcut && (
                      <span className="text-xs text-[var(--muted)] font-satoshi-medium">
                        {item.shortcut}
                      </span>
                    )}
                    {item.badge && (
                      <span className="text-xs bg-gray-100 text-[var(--muted)] px-1.5 py-0.5 rounded-full font-satoshi-medium">
                        {item.badge}
                      </span>
                    )}
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleItemClick(item)}
                    disabled={item.disabled}
                    className={cn(
                      dropdownItemVariants({ 
                        variant: item.variant, 
                        size: item.size 
                      }),
                      "w-full text-left"
                    )}
                    role="menuitem"
                    tabIndex={0}
                  >
                    {item.icon && (
                      <div className="w-4 h-4 text-current flex-shrink-0">
                        {item.icon}
                      </div>
                    )}
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.shortcut && (
                      <span className="text-xs text-[var(--muted)] font-satoshi-medium">
                        {item.shortcut}
                      </span>
                    )}
                    {item.badge && (
                      <span className="text-xs bg-gray-100 text-[var(--muted)] px-1.5 py-0.5 rounded-full font-satoshi-medium">
                        {item.badge}
                      </span>
                    )}
                  </button>
                )}
                
                {/* Divider after item if specified */}
                {item.dividerAfter && index < items.length - 1 && (
                  <DropdownDivider />
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    );
  }
);

Dropdown.displayName = "Dropdown";

// Utility Components for building custom dropdowns

// Dropdown Divider Component
const DropdownDivider = ({ className }: { className?: string }) => (
  <div className={cn("border-t border-gray-100 my-2 mx-2", className)} />
);

// Dropdown Header Component
export interface DropdownHeaderProps {
  children: React.ReactNode;
  className?: string;
}

const DropdownHeader = ({ children, className }: DropdownHeaderProps) => (
  <div className={cn("px-3 py-2 text-xs font-satoshi-medium text-[var(--muted)] uppercase tracking-wide", className)}>
    {children}
  </div>
);

// Dropdown Item Component for custom content
export interface DropdownItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const DropdownItem = React.forwardRef<HTMLButtonElement, DropdownItemProps>(
  ({ children, onClick, href, disabled, variant, size, className, ...props }, ref) => {
    const baseClassName = cn(dropdownItemVariants({ variant, size }), className);

    if (href) {
      return (
        <a
          href={href}
          className={baseClassName}
          role="menuitem"
          tabIndex={0}
          {...props}
        >
          {children}
        </a>
      );
    }

    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(baseClassName, "w-full text-left")}
        role="menuitem"
        tabIndex={0}
        {...props}
      >
        {children}
      </button>
    );
  }
);

DropdownItem.displayName = "DropdownItem";

// Dropdown Content wrapper for custom layouts
export interface DropdownContentProps {
  children: React.ReactNode;
  className?: string;
}

const DropdownContent = ({ children, className }: DropdownContentProps) => (
  <div className={cn("px-1", className)}>
    {children}
  </div>
);

export { 
  Dropdown, 
  DropdownDivider, 
  DropdownHeader,
  DropdownItem,
  DropdownContent,
  dropdownVariants,
  dropdownItemVariants
};