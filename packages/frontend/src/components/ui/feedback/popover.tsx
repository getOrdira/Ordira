// src/components/ui/feedback/popover.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';
import { XMarkIcon } from '@heroicons/react/24/outline';

const popoverVariants = cva(
  // Base styles
  "absolute z-50 rounded-lg border shadow-lg bg-[var(--card-bg)] transition-all duration-200 focus:outline-none",
  {
    variants: {
      size: {
        sm: "p-3 min-w-48 max-w-64",
        md: "p-4 min-w-56 max-w-80", 
        lg: "p-5 min-w-64 max-w-96",
        xl: "p-6 min-w-72 max-w-[32rem]",
      },
      variant: {
        default: "border-[var(--card-border)] shadow-md",
        elevated: "border-[var(--card-border)] shadow-lg",
        minimal: "border-[var(--border)] shadow-sm",
      },
      placement: {
        top: "mb-2",
        bottom: "mt-2",
        left: "mr-2", 
        right: "ml-2",
      }
    },
    defaultVariants: {
      size: "md",
      variant: "default",
      placement: "bottom",
    },
  }
);

const arrowVariants = cva(
  "absolute w-3 h-3 bg-[var(--card-bg)] border rotate-45",
  {
    variants: {
      variant: {
        default: "border-[var(--card-border)]",
        elevated: "border-[var(--card-border)]", 
        minimal: "border-[var(--border)]",
      },
      placement: {
        top: "-bottom-1.5 left-1/2 -translate-x-1/2 border-l border-b",
        bottom: "-top-1.5 left-1/2 -translate-x-1/2 border-r border-t", 
        left: "-right-1.5 top-1/2 -translate-y-1/2 border-t border-r",
        right: "-left-1.5 top-1/2 -translate-y-1/2 border-b border-l",
      }
    }
  }
);

export interface PopoverProps 
  extends VariantProps<typeof popoverVariants> {
  children: React.ReactNode;
  content: React.ReactNode;
  trigger?: 'click' | 'hover' | 'focus' | 'manual';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  arrow?: boolean;
  closeOnClickOutside?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  offset?: number;
  className?: string;
  contentClassName?: string;
  modal?: boolean;
  trapFocus?: boolean;
}

const Popover = React.forwardRef<HTMLDivElement, PopoverProps>(
  ({ 
    children,
    content,
    size = "md",
    variant = "default", 
    placement = "bottom",
    trigger = "click",
    open: controlledOpen,
    onOpenChange,
    disabled = false,
    arrow = true,
    closeOnClickOutside = true,
    closeOnEscape = true,
    showCloseButton = false,
    offset = 8,
    className,
    contentClassName,
    modal = false,
    trapFocus = false,
    ...props 
  }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [actualPlacement, setActualPlacement] = useState(placement);
    
    const triggerRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout>();
    const previousActiveElement = useRef<Element | null>(null);

    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : isOpen;

    const updatePosition = () => {
      if (!triggerRef.current || !popoverRef.current) return;

      const triggerRect = triggerRef.current.getBoundingClientRect();
      const popoverRect = popoverRef.current.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      let newPlacement = placement;
      let x = 0;
      let y = 0;

      // Calculate position based on placement
      switch (placement) {
        case 'top':
          x = triggerRect.left + triggerRect.width / 2 - popoverRect.width / 2;
          y = triggerRect.top - popoverRect.height - offset;
          
          if (y < 8) {
            newPlacement = 'bottom';
            y = triggerRect.bottom + offset;
          }
          break;

        case 'bottom':
          x = triggerRect.left + triggerRect.width / 2 - popoverRect.width / 2;
          y = triggerRect.bottom + offset;
          
          if (y + popoverRect.height > viewport.height - 8) {
            newPlacement = 'top';
            y = triggerRect.top - popoverRect.height - offset;
          }
          break;

        case 'left':
          x = triggerRect.left - popoverRect.width - offset;
          y = triggerRect.top + triggerRect.height / 2 - popoverRect.height / 2;
          
          if (x < 8) {
            newPlacement = 'right';
            x = triggerRect.right + offset;
          }
          break;

        case 'right':
          x = triggerRect.right + offset;
          y = triggerRect.top + triggerRect.height / 2 - popoverRect.height / 2;
          
          if (x + popoverRect.width > viewport.width - 8) {
            newPlacement = 'left';
            x = triggerRect.left - popoverRect.width - offset;
          }
          break;
      }

      // Keep within viewport
      x = Math.max(8, Math.min(x, viewport.width - popoverRect.width - 8));
      y = Math.max(8, Math.min(y, viewport.height - popoverRect.height - 8));

      setPosition({ x, y });
      setActualPlacement(newPlacement);
    };

    const handleOpenChange = (newOpen: boolean) => {
      if (disabled) return;
      
      if (!isControlled) {
        setIsOpen(newOpen);
      }
      onOpenChange?.(newOpen);

      // Focus management
      if (newOpen && trapFocus) {
        previousActiveElement.current = document.activeElement;
        // Focus first focusable element in popover
        setTimeout(() => {
          const firstFocusable = popoverRef.current?.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          ) as HTMLElement;
          firstFocusable?.focus();
        }, 0);
      } else if (!newOpen && trapFocus && previousActiveElement.current) {
        (previousActiveElement.current as HTMLElement).focus();
      }
    };

    const handleMouseEnter = () => {
      if (trigger !== 'hover') return;
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      handleOpenChange(true);
    };

    const handleMouseLeave = () => {
      if (trigger !== 'hover') return;
      
      timeoutRef.current = setTimeout(() => {
        handleOpenChange(false);
      }, 100);
    };

    const handleClick = (e: React.MouseEvent) => {
      if (trigger !== 'click') return;
      e.stopPropagation();
      handleOpenChange(!open);
    };

    const handleFocus = () => {
      if (trigger !== 'focus') return;
      handleOpenChange(true);
    };

    const handleBlur = (e: React.FocusEvent) => {
      if (trigger !== 'focus') return;
      
      // Don't close if focus is moving to popover content
      setTimeout(() => {
        if (!popoverRef.current?.contains(document.activeElement)) {
          handleOpenChange(false);
        }
      }, 0);
    };

    // Click outside handler
    useEffect(() => {
      if (!open || !closeOnClickOutside) return;

      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        if (
          triggerRef.current && !triggerRef.current.contains(target) &&
          popoverRef.current && !popoverRef.current.contains(target)
        ) {
          handleOpenChange(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open, closeOnClickOutside]);

    // Escape key handler
    useEffect(() => {
      if (!open || !closeOnEscape) return;

      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          handleOpenChange(false);
        }
      };

      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }, [open, closeOnEscape]);

    // Position update
    useEffect(() => {
      if (open) {
        updatePosition();
        
        const handleUpdate = () => updatePosition();
        window.addEventListener('resize', handleUpdate);
        window.addEventListener('scroll', handleUpdate, true);
        
        return () => {
          window.removeEventListener('resize', handleUpdate);
          window.removeEventListener('scroll', handleUpdate, true);
        };
      }
    }, [open, content]);

    // Cleanup
    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    if (disabled || !content) {
      return <>{children}</>;
    }

    return (
      <>
        {/* Backdrop for modal variant */}
        {open && modal && (
          <div 
            className="fixed inset-0 bg-black/20 z-40"
            onClick={() => closeOnClickOutside && handleOpenChange(false)}
          />
        )}

        {/* Trigger */}
        <div
          ref={triggerRef}
          className="inline-block"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...props}
        >
          {children}
        </div>

        {/* Popover content */}
        {open && (
          <div
            ref={popoverRef}
            className={cn(
              popoverVariants({ size, variant, placement: actualPlacement }),
              contentClassName
            )}
            style={{
              position: 'fixed',
              left: position.x,
              top: position.y,
              zIndex: modal ? 50 : 30,
            }}
            role="dialog"
            aria-modal={modal}
            tabIndex={-1}
            onMouseEnter={() => trigger === 'hover' && timeoutRef.current && clearTimeout(timeoutRef.current)}
            onMouseLeave={() => trigger === 'hover' && handleMouseLeave()}
          >
            {/* Close button */}
            {showCloseButton && (
              <button
                onClick={() => handleOpenChange(false)}
                className="absolute top-2 right-2 p-1 text-[var(--muted)] hover:text-[var(--foreground)] rounded-md hover:bg-[var(--hover-overlay)] transition-colors"
                aria-label="Close"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}

            {content}

            {/* Arrow */}
            {arrow && (
              <div
                className={cn(
                  arrowVariants({ variant, placement: actualPlacement })
                )}
              />
            )}
          </div>
        )}
      </>
    );
  }
);

Popover.displayName = "Popover";

// Popover header component
export const PopoverHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-between pb-3 mb-3 border-b border-[var(--border)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

PopoverHeader.displayName = "PopoverHeader";

// Popover footer component  
export const PopoverFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-end space-x-2 pt-3 mt-3 border-t border-[var(--border)]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

PopoverFooter.displayName = "PopoverFooter";

// Quick info popover for simple content
export const InfoPopover = ({ 
  title, 
  description, 
  children, 
  ...props 
}: Omit<PopoverProps, 'content'> & { 
  title: string; 
  description: string;
  children?: React.ReactNode;
}) => (
  <Popover
    trigger="hover"
    size="sm"
    content={
      <div className="space-y-2">
        <h4 className="font-medium text-[var(--heading-color)]">{title}</h4>
        <p className="text-sm text-[var(--body-color)]">{description}</p>
      </div>
    }
    {...props}
  >
    {children}
  </Popover>
);

export { Popover };
export default Popover;