// src/components/ui/primitives/button.tsx
'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base styles
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden",
  {
    variants: {
      variant: {
        // Primary blue button (main CTA)
        primary: [
          "text-white shadow-lg hover:shadow-xl",
          "bg-[var(--accent)] hover:bg-[var(--accent-dark)]",
          "focus-visible:ring-[var(--accent)]",
          "active:scale-95"
        ].join(" "),
        
        // Secondary dark button
        secondary: [
          "text-white shadow-md hover:shadow-lg",
          "bg-[var(--dark)] hover:opacity-90",
          "focus-visible:ring-[var(--dark)]",
          "active:scale-95"
        ].join(" "),
        
        // Outline button (light background with border)
        outline: [
          "border-2 shadow-sm hover:shadow-md",
          "bg-white/80 backdrop-blur-sm",
          "border-[var(--accent)] text-[var(--accent)]",
          "hover:bg-[var(--accent)] hover:text-white",
          "focus-visible:ring-[var(--accent)]",
          "active:scale-95"
        ].join(" "),
        
        // Ghost/text button (no background)
        ghost: [
          "text-[var(--dark)] hover:text-[var(--accent)]",
          "hover:bg-[var(--accent)]/10",
          "focus-visible:ring-[var(--accent)]"
        ].join(" "),
        
        // Destructive button (errors/danger)
        destructive: [
          "text-white shadow-lg hover:shadow-xl",
          "bg-[var(--error)] hover:bg-[var(--error-dark)]",
          "focus-visible:ring-[var(--error)]",
          "active:scale-95"
        ].join(" "),
        
        // Success button
        success: [
          "text-white shadow-lg hover:shadow-xl",
          "bg-[var(--success)] hover:bg-[var(--success-dark)]",
          "focus-visible:ring-[var(--success)]",
          "active:scale-95"
        ].join(" "),
        
        // Warning button
        warning: [
          "text-white shadow-lg hover:shadow-xl",
          "bg-[var(--warning)] hover:bg-[var(--warning-dark)]",
          "focus-visible:ring-[var(--warning)]",
          "active:scale-95"
        ].join(" ")
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-6 text-base",
        lg: "h-14 px-8 text-lg",
        xl: "h-16 px-10 text-xl",
        icon: "h-11 w-11"
      },
      fullWidth: {
        true: "w-full",
        false: "w-auto"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      fullWidth: false
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
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    fullWidth,
    asChild = false, 
    loading = false,
    leftIcon,
    rightIcon,
    children,
    disabled,
    ...props 
  }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <button
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        ref={ref}
        disabled={isDisabled}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        
        {/* Content wrapper - hidden when loading */}
        <div className={cn("flex items-center gap-2", loading && "opacity-0")}>
          {leftIcon && (
            <span className="flex-shrink-0">
              {leftIcon}
            </span>
          )}
          
          {children && (
            <span className="truncate">
              {children}
            </span>
          )}
          
          {rightIcon && (
            <span className="flex-shrink-0">
              {rightIcon}
            </span>
          )}
        </div>
      </button>
    );
  }
);

Button.displayName = "Button";

// Icon button variant for cleaner API
export interface IconButtonProps extends Omit<ButtonProps, 'leftIcon' | 'rightIcon' | 'children'> {
  icon: React.ReactNode;
  'aria-label': string;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        size="icon"
        {...props}
      >
        {icon}
      </Button>
    );
  }
);

IconButton.displayName = "IconButton";

export { Button, IconButton, buttonVariants };