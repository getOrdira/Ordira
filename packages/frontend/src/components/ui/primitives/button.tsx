// src/components/ui/primitives/button.tsx
'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/utils';

const buttonVariants = cva(
  // Base styles
  "inline-flex items-center justify-center gap-3 rounded-full font-satoshi-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden cursor-pointer",
  {
    variants: {
      variant: {
        // Primary orange button (main CTA) - matches the filled blue button in image
        primary: [
          "text-white shadow-lg hover:shadow-xl",
          "bg-[var(--primary)] hover:bg-[var(--primary-dark)]",
          "focus-visible:ring-[var(--primary)]",
          "active:scale-[0.98] active:shadow-md",
          "transform hover:scale-[1.02]"
        ].join(" "),
        
        // Secondary dark button - matches the dark button in image
        secondary: [
          "text-white shadow-md hover:shadow-lg",
          "bg-[var(--ordira-accent)] hover:bg-[var(--ordira-black)]",
          "focus-visible:ring-[var(--ordira-accent)]",
          "active:scale-[0.98]",
          "transform hover:scale-[1.01]"
        ].join(" "),
        
        // Outline button - matches the outline button in image
        outline: [
          "border-2 shadow-sm hover:shadow-md backdrop-blur-sm",
          "bg-white/80 border-[var(--primary)]",
          "text-[var(--primary)] hover:text-white",
          "hover:bg-[var(--primary)] hover:border-[var(--primary)]",
          "focus-visible:ring-[var(--primary)]",
          "active:scale-[0.98]",
          "transform hover:scale-[1.01]"
        ].join(" "),
        
        // Ghost/text button - matches the text-only button in image
        ghost: [
          "text-[var(--ordira-accent)] hover:text-[var(--primary)]",
          "hover:bg-[var(--primary)]/10",
          "focus-visible:ring-[var(--primary)]",
          "active:scale-[0.98]"
        ].join(" "),
        
        // Gradient button - using your brand gradient
        gradient: [
          "text-white shadow-lg hover:shadow-xl",
          "ordira-gradient hover:ordira-gradient-hover",
          "focus-visible:ring-[var(--primary)]",
          "active:scale-[0.98]",
          "transform hover:scale-[1.02]",
          "relative before:absolute before:inset-0 before:opacity-0 before:transition-opacity",
          "before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent",
          "hover:before:opacity-100 before:animate-shimmer"
        ].join(" "),
        
        // Light background variant
        light: [
          "text-[var(--primary)] shadow-sm hover:shadow-md",
          "bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20",
          "focus-visible:ring-[var(--primary)]",
          "active:scale-[0.98]",
          "transform hover:scale-[1.01]"
        ].join(" "),
        
        // Destructive button (errors/danger)
        destructive: [
          "text-white shadow-lg hover:shadow-xl",
          "bg-[var(--error)] hover:bg-[var(--error-dark)]",
          "focus-visible:ring-[var(--error)]",
          "active:scale-[0.98]",
          "transform hover:scale-[1.01]"
        ].join(" "),
        
        // Success button
        success: [
          "text-white shadow-lg hover:shadow-xl",
          "bg-[var(--success)] hover:bg-[var(--success-dark)]",
          "focus-visible:ring-[var(--success)]",
          "active:scale-[0.98]",
          "transform hover:scale-[1.01]"
        ].join(" ")
      },
      size: {
        sm: "h-10 px-4 text-sm gap-2",
        md: "h-12 px-6 text-base gap-3",
        lg: "h-14 px-8 text-lg gap-3",
        xl: "h-16 px-10 text-xl gap-4",
        icon: "h-12 w-12 p-0"
      },
      fullWidth: {
        true: "w-full",
        false: "w-auto"
      },
      rounded: {
        default: "rounded-full",
        md: "rounded-xl",
        lg: "rounded-2xl",
        none: "rounded-none"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false,
      rounded: "default"
    }
  }
);

export interface ButtonProps 
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  iconOnly?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    fullWidth,
    rounded,
    asChild = false, 
    loading = false,
    leftIcon,
    rightIcon,
    iconOnly = false,
    children,
    disabled,
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading;
    
    // Only use explicitly provided icons
    const getDefaultIcons = () => {
      return {
        leftIcon: leftIcon,
        rightIcon: rightIcon
      };
    };

    const icons = getDefaultIcons();

    return (
      <button
        className={cn(buttonVariants({ variant, size, fullWidth, rounded, className }))}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-inherit rounded-full">
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        
        {/* Content wrapper - hidden when loading */}
        <div className={cn("flex items-center gap-3", loading && "opacity-0")}>
          {!iconOnly && icons.leftIcon && (
            <span className="flex-shrink-0">
              {icons.leftIcon}
            </span>
          )}
          
          {iconOnly && (leftIcon || icons.leftIcon) && (
            <span className="flex-shrink-0">
              {leftIcon || icons.leftIcon}
            </span>
          )}
          
          {!iconOnly && children && (
            <span className="truncate font-satoshi-medium">
              {children}
            </span>
          )}
          
          {!iconOnly && icons.rightIcon && (
            <span className="flex-shrink-0">
              {icons.rightIcon}
            </span>
          )}
        </div>
        
        {/* Shimmer effect for gradient variant */}
        {variant === 'gradient' && (
          <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
          </div>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

// Icon button variant for cleaner API
export interface IconButtonProps extends Omit<ButtonProps, 'leftIcon' | 'rightIcon' | 'children' | 'iconOnly'> {
  icon: React.ReactNode;
  'aria-label': string;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, className, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        size="icon"
        iconOnly
        leftIcon={icon}
        className={cn("!gap-0", className)}
        {...props}
      />
    );
  }
);

IconButton.displayName = "IconButton";

// Button Group Component
export interface ButtonGroupProps {
  children: React.ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  spacing?: 'none' | 'sm' | 'md' | 'lg';
}

const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ children, className, orientation = 'horizontal', spacing = 'sm' }, ref) => {
    const spacingClasses = {
      none: 'gap-0',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6'
    };

    const orientationClasses = {
      horizontal: 'flex-row',
      vertical: 'flex-col'
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex',
          orientationClasses[orientation],
          spacingClasses[spacing],
          className
        )}
      >
        {children}
      </div>
    );
  }
);

ButtonGroup.displayName = "ButtonGroup";

export { Button, IconButton, ButtonGroup, buttonVariants };