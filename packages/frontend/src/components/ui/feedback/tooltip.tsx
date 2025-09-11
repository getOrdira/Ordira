// src/components/ui/feedback/tooltip.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';

const tooltipVariants = cva(
  // Base styles for tooltip container
  "absolute z-50 rounded-lg shadow-lg border transition-all duration-200 pointer-events-none",
  {
    variants: {
      variant: {
        default: "bg-[var(--foreground)] text-[var(--background)] border-[var(--border-dark)]",
        light: "bg-[var(--card-bg)] text-[var(--foreground)] border-[var(--card-border)] shadow-md",
        success: "bg-[var(--success-dark)] text-[var(--success-foreground)] border-[var(--success)]",
        warning: "bg-[var(--warning-dark)] text-[var(--warning-foreground)] border-[var(--warning)]",
        error: "bg-[var(--error-dark)] text-[var(--error-foreground)] border-[var(--error)]",
        info: "bg-[var(--info-dark)] text-[var(--info-foreground)] border-[var(--info)]",
      },
      size: {
        sm: "px-2 py-1 text-xs max-w-32",
        md: "px-3 py-1.5 text-sm max-w-48",
        lg: "px-4 py-2 text-sm max-w-64",
      },
      placement: {
        top: "mb-1",
        bottom: "mt-1", 
        left: "mr-1",
        right: "ml-1",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      placement: "top",
    },
  }
);

const arrowVariants = cva(
  "absolute w-2 h-2 rotate-45",
  {
    variants: {
      variant: {
        default: "bg-[var(--foreground)] border-[var(--border-dark)]",
        light: "bg-[var(--card-bg)] border-[var(--card-border)]",
        success: "bg-[var(--success-dark)] border-[var(--success)]",
        warning: "bg-[var(--warning-dark)] border-[var(--warning)]", 
        error: "bg-[var(--error-dark)] border-[var(--error)]",
        info: "bg-[var(--info-dark)] border-[var(--info)]",
      },
      placement: {
        top: "-bottom-1 left-1/2 -translate-x-1/2 border-l border-b",
        bottom: "-top-1 left-1/2 -translate-x-1/2 border-r border-t",
        left: "-right-1 top-1/2 -translate-y-1/2 border-t border-r", 
        right: "-left-1 top-1/2 -translate-y-1/2 border-b border-l",
      }
    }
  }
);

export interface TooltipProps 
  extends VariantProps<typeof tooltipVariants> {
  children: React.ReactNode;
  content: React.ReactNode;
  delay?: number;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  trigger?: 'hover' | 'click' | 'focus' | 'manual';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  offset?: number;
  arrow?: boolean;
}

const Tooltip = React.forwardRef<HTMLDivElement, TooltipProps>(
  ({ 
    children,
    content,
    variant = "default",
    size = "md", 
    placement = "top",
    delay = 300,
    disabled = false,
    className,
    contentClassName,
    trigger = "hover",
    open: controlledOpen,
    onOpenChange,
    offset = 8,
    arrow = true,
    ...props 
  }, ref) => {
    const [isOpen, setIsOpen] = useState(false);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [actualPlacement, setActualPlacement] = useState(placement);
    
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout>();

    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : isOpen;

    const updatePosition = () => {
      if (!triggerRef.current || !tooltipRef.current) return;

      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      let newPlacement = placement;
      let x = 0;
      let y = 0;

      // Calculate initial position based on placement
      switch (placement) {
        case 'top':
          x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
          y = triggerRect.top - tooltipRect.height - offset;
          
          // Check if tooltip would go off screen
          if (y < 0) {
            newPlacement = 'bottom';
            y = triggerRect.bottom + offset;
          }
          break;

        case 'bottom':
          x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
          y = triggerRect.bottom + offset;
          
          if (y + tooltipRect.height > viewport.height) {
            newPlacement = 'top';
            y = triggerRect.top - tooltipRect.height - offset;
          }
          break;

        case 'left':
          x = triggerRect.left - tooltipRect.width - offset;
          y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
          
          if (x < 0) {
            newPlacement = 'right';
            x = triggerRect.right + offset;
          }
          break;

        case 'right':
          x = triggerRect.right + offset;
          y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
          
          if (x + tooltipRect.width > viewport.width) {
            newPlacement = 'left';
            x = triggerRect.left - tooltipRect.width - offset;
          }
          break;
      }

      // Keep tooltip within viewport bounds
      x = Math.max(8, Math.min(x, viewport.width - tooltipRect.width - 8));
      y = Math.max(8, Math.min(y, viewport.height - tooltipRect.height - 8));

      setPosition({ x, y });
      setActualPlacement(newPlacement);
    };

    const handleOpenChange = (newOpen: boolean) => {
      if (disabled) return;
      
      if (!isControlled) {
        setIsOpen(newOpen);
      }
      onOpenChange?.(newOpen);
    };

    const handleMouseEnter = () => {
      if (trigger !== 'hover') return;
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        handleOpenChange(true);
      }, delay);
    };

    const handleMouseLeave = () => {
      if (trigger !== 'hover') return;
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      handleOpenChange(false);
    };

    const handleClick = () => {
      if (trigger !== 'click') return;
      handleOpenChange(!open);
    };

    const handleFocus = () => {
      if (trigger !== 'focus') return;
      handleOpenChange(true);
    };

    const handleBlur = () => {
      if (trigger !== 'focus') return;
      handleOpenChange(false);
    };

    // Update position when tooltip opens or window resizes
    useEffect(() => {
      if (open) {
        updatePosition();
        
        const handleResize = () => updatePosition();
        const handleScroll = () => updatePosition();
        
        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleScroll, true);
        
        return () => {
          window.removeEventListener('resize', handleResize);
          window.removeEventListener('scroll', handleScroll, true);
        };
      }
    }, [open, content]);

    // Cleanup timeout on unmount
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
        {/* Trigger element */}
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

        {/* Tooltip portal */}
        {open && (
          <div
            ref={tooltipRef}
            className={cn(
              tooltipVariants({ variant, size, placement: actualPlacement }),
              contentClassName
            )}
            style={{
              position: 'fixed',
              left: position.x,
              top: position.y,
              zIndex: 9999,
            }}
            role="tooltip"
            aria-hidden={!open}
          >
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

Tooltip.displayName = "Tooltip";

// Convenience components for common use cases
export const HelpTooltip = ({ children, ...props }: Omit<TooltipProps, 'content' | 'children'> & { content: React.ReactNode; children?: React.ReactNode }) => (
  <Tooltip
    variant="light"
    size="md"
    trigger="hover"
    {...props}
  >
    {children || (
      <span className="inline-flex items-center justify-center w-4 h-4 text-xs text-[var(--muted)] border border-[var(--border)] rounded-full hover:text-[var(--foreground)] hover:border-[var(--border-dark)] cursor-help">
        ?
      </span>
    )}
  </Tooltip>
);

export const StatusTooltip = ({ 
  status, 
  children, 
  ...props 
}: Omit<TooltipProps, 'variant'> & { 
  status: 'success' | 'warning' | 'error' | 'info' 
}) => (
  <Tooltip
    variant={status}
    {...props}
  >
    {children}
  </Tooltip>
);

export { Tooltip };
export default Tooltip;