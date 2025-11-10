// src/components/ui/feedback/banner.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/utils';
import { 
  XMarkIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  MegaphoneIcon,
  ArrowTopRightOnSquareIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

const bannerVariants = cva(
  "w-full flex items-center justify-between font-satoshi transition-all duration-300 ease-in-out",
  {
    variants: {
      variant: {
        default: "bg-[var(--background-secondary)] text-[var(--foreground)] border-b border-[var(--border)]",
        info: "bg-[var(--info)]/10 text-[var(--info)] border-b border-[var(--info)]/20",
        success: "bg-[var(--success)]/10 text-[var(--success)] border-b border-[var(--success)]/20",
        warning: "bg-[var(--warning)]/10 text-[var(--warning)] border-b border-[var(--warning)]/20",
        error: "bg-[var(--error)]/10 text-[var(--error)] border-b border-[var(--error)]/20",
        primary: "bg-[var(--ordira-primary)]/10 text-[var(--ordira-primary)] border-b border-[var(--ordira-primary)]/20",
        gradient: "bg-gradient-to-r from-[var(--ordira-primary)]/10 to-[var(--ordira-primary-dark)]/10 text-[var(--ordira-primary)] border-b border-[var(--ordira-primary)]/20",
        announcement: "bg-[var(--ordira-primary)] text-white",
        maintenance: "bg-[var(--warning)] text-white",
        emergency: "bg-[var(--error)] text-white"
      },
      size: {
        sm: "px-4 py-2 text-sm",
        md: "px-6 py-3 text-base",
        lg: "px-8 py-4 text-lg"
      },
      position: {
        top: "sticky top-0 z-50",
        relative: "relative",
        fixed: "fixed top-0 left-0 right-0 z-50",
        bottom: "fixed bottom-0 left-0 right-0 z-50"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md",
      position: "relative"
    }
  }
);

// Icon mapping for different banner types
const bannerIcons = {
  default: InformationCircleIcon,
  info: InformationCircleIcon,
  success: CheckCircleIcon,
  warning: ExclamationTriangleIcon,
  error: ExclamationTriangleIcon,
  primary: MegaphoneIcon,
  gradient: MegaphoneIcon,
  announcement: MegaphoneIcon,
  maintenance: ExclamationTriangleIcon,
  emergency: ExclamationTriangleIcon
};

export interface BannerAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  external?: boolean;
}

export interface BannerProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof bannerVariants> {
  title?: string;
  message: string;
  
  // Visual elements
  icon?: React.ComponentType<any> | boolean;
  showIcon?: boolean;
  
  // Actions
  dismissible?: boolean;
  actions?: BannerAction[];
  onDismiss?: () => void;
  
  // Persistence
  persistKey?: string; // Key for localStorage to remember dismissal
  showUntil?: Date; // Auto-hide after date
  
  // Animation & timing
  autoHide?: boolean;
  autoHideDelay?: number; // milliseconds
  slideDown?: boolean;
  
  // Content
  children?: React.ReactNode;
  
  // External link
  linkUrl?: string;
  linkText?: string;
  linkExternal?: boolean;
}

const Banner = React.forwardRef<HTMLDivElement, BannerProps>(
  ({
    title,
    message,
    icon,
    showIcon = true,
    dismissible = true,
    actions = [],
    onDismiss,
    persistKey,
    showUntil,
    autoHide = false,
    autoHideDelay = 5000,
    slideDown = false,
    children,
    linkUrl,
    linkText,
    linkExternal = false,
    variant = "default",
    size = "md",
    position = "relative",
    className,
    ...props
  }, ref) => {
    const [isVisible, setIsVisible] = useState(true);
    const [isEntering, setIsEntering] = useState(slideDown);

    // Check if banner should be shown based on persistence
    useEffect(() => {
      if (persistKey) {
        const dismissed = localStorage.getItem(`banner_dismissed_${persistKey}`);
        if (dismissed) {
          const dismissedDate = new Date(dismissed);
          const now = new Date();
          
          // If dismissed less than 24 hours ago, keep it hidden
          if (now.getTime() - dismissedDate.getTime() < 24 * 60 * 60 * 1000) {
            setIsVisible(false);
            return;
          }
        }
      }

      // Check if banner should be auto-hidden based on date
      if (showUntil && new Date() > showUntil) {
        setIsVisible(false);
        return;
      }

      // Handle slide down animation
      if (slideDown) {
        setIsEntering(true);
        const timer = setTimeout(() => setIsEntering(false), 100);
        return () => clearTimeout(timer);
      }
    }, [persistKey, showUntil, slideDown]);

    // Auto-hide functionality
    useEffect(() => {
      if (autoHide && autoHideDelay > 0) {
        const timer = setTimeout(() => {
          handleDismiss();
        }, autoHideDelay);

        return () => clearTimeout(timer);
      }
    }, [autoHide, autoHideDelay]);

    const handleDismiss = () => {
      setIsVisible(false);
      
      // Persist dismissal if key provided
      if (persistKey) {
        localStorage.setItem(`banner_dismissed_${persistKey}`, new Date().toISOString());
      }
      
      onDismiss?.();
    };

    const handleLinkClick = () => {
      if (linkUrl) {
        if (linkExternal) {
          window.open(linkUrl, '_blank', 'noopener,noreferrer');
        } else {
          window.location.href = linkUrl;
        }
      }
    };

    // Get the appropriate icon
    const IconComponent = typeof icon === 'boolean' 
      ? (icon ? bannerIcons[variant || 'default'] : null)
      : icon || (showIcon ? bannerIcons[variant || 'default'] : null);

    if (!isVisible) {
      return null;
    }

    return (
      <div
        ref={ref}
        role="banner"
        aria-live="polite"
        className={cn(
          bannerVariants({ variant, size, position }),
          slideDown && isEntering && "transform -translate-y-full",
          slideDown && !isEntering && "transform translate-y-0",
          slideDown && "transition-transform duration-300 ease-out",
          className
        )}
        {...props}
      >
        {/* Content Container */}
        <div className="flex items-center flex-1 min-w-0">
          {/* Icon */}
          {IconComponent && (
            <div className="flex-shrink-0 mr-3">
              <IconComponent className={cn(
                size === 'sm' && "w-4 h-4",
                size === 'md' && "w-5 h-5",
                size === 'lg' && "w-6 h-6"
              )} />
            </div>
          )}

          {/* Message Content */}
          <div className="flex-1 min-w-0">
            {title && (
              <div className={cn(
                "font-satoshi-bold mb-1",
                size === 'sm' && "text-sm",
                size === 'md' && "text-base",
                size === 'lg' && "text-lg"
              )}>
                {title}
              </div>
            )}
            
            <div className={cn(
              "font-satoshi-regular",
              title && "text-sm opacity-90",
              !title && size === 'sm' && "text-sm",
              !title && size === 'md' && "text-base",
              !title && size === 'lg' && "text-lg"
            )}>
              {message}
            </div>
            
            {children && (
              <div className="mt-2">
                {children}
              </div>
            )}
          </div>

          {/* Link (if provided) */}
          {linkUrl && linkText && (
            <button
              onClick={handleLinkClick}
              className="flex items-center space-x-1 ml-4 font-satoshi-medium hover:underline focus:outline-none focus:underline"
            >
              <span>{linkText}</span>
              {linkExternal ? (
                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              ) : (
                <ChevronRightIcon className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Actions */}
        {actions.length > 0 && (
          <div className="flex items-center space-x-2 ml-4">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-satoshi-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
                  action.variant === 'primary' && cn(
                    variant === 'announcement' || variant === 'maintenance' || variant === 'emergency'
                      ? "bg-white text-current hover:bg-gray-100"
                      : "bg-current text-white hover:opacity-90"
                  ),
                  action.variant === 'secondary' && "bg-white/20 text-current hover:bg-white/30",
                  (!action.variant || action.variant === 'ghost') && "hover:bg-black/10 text-current"
                )}
              >
                {action.label}
                {action.external && (
                  <ArrowTopRightOnSquareIcon className="w-3 h-3 ml-1 inline" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Dismiss Button */}
        {dismissible && (
          <button
            onClick={handleDismiss}
            aria-label="Dismiss banner"
            className={cn(
              "flex-shrink-0 ml-4 p-1 rounded-md hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current transition-colors",
              size === 'sm' && "p-0.5"
            )}
          >
            <XMarkIcon className={cn(
              size === 'sm' && "w-4 h-4",
              size === 'md' && "w-5 h-5",
              size === 'lg' && "w-6 h-6"
            )} />
          </button>
        )}
      </div>
    );
  }
);

Banner.displayName = "Banner";

// Pre-configured banner types for common use cases

// System Announcement Banner
export interface SystemAnnouncementBannerProps extends Omit<BannerProps, 'variant'> {
  type?: 'update' | 'feature' | 'maintenance' | 'general';
}

export const SystemAnnouncementBanner = React.forwardRef<HTMLDivElement, SystemAnnouncementBannerProps>(
  ({ type = 'general', ...props }, ref) => {
    const variantMap = {
      update: 'primary' as const,
      feature: 'gradient' as const,
      maintenance: 'maintenance' as const,
      general: 'announcement' as const
    };

    return (
      <Banner
        ref={ref}
        variant={variantMap[type]}
        position="top"
        slideDown={true}
        {...props}
      />
    );
  }
);

SystemAnnouncementBanner.displayName = "SystemAnnouncementBanner";

// Verification Prompt Banner - for unverified users
export interface VerificationPromptBannerProps extends Omit<BannerProps, 'variant' | 'message'> {
  userType: 'brand' | 'manufacturer';
  onStartVerification?: () => void;
}

export const VerificationPromptBanner = React.forwardRef<HTMLDivElement, VerificationPromptBannerProps>(
  ({ userType, onStartVerification, ...props }, ref) => (
    <Banner
      ref={ref}
      variant="warning"
      title="Verification Required"
      message={`Complete your ${userType} verification to access all features and build trust with partners.`}
      persistKey={`verification_prompt_${userType}`}
      actions={onStartVerification ? [{
        label: 'Start Verification',
        onClick: onStartVerification,
        variant: 'primary'
      }] : undefined}
      {...props}
    />
  )
);

VerificationPromptBanner.displayName = "VerificationPromptBanner";

// Plan Upgrade Banner - for plan limitations
export interface PlanUpgradeBannerProps extends Omit<BannerProps, 'variant' | 'message'> {
  currentPlan: 'foundation' | 'growth' | 'premium' | 'enterprise';
  limitation: string;
  onUpgrade?: () => void;
}

export const PlanUpgradeBanner = React.forwardRef<HTMLDivElement, PlanUpgradeBannerProps>(
  ({ currentPlan, limitation, onUpgrade, ...props }, ref) => (
    <Banner
      ref={ref}
      variant="primary"
      title="Upgrade Your Plan"
      message={`You've reached the ${limitation} limit for ${currentPlan} plans. Upgrade to continue.`}
      persistKey={`plan_upgrade_${currentPlan}_${limitation}`}
      actions={onUpgrade ? [{
        label: 'Upgrade Now',
        onClick: onUpgrade,
        variant: 'primary'
      }] : undefined}
      {...props}
    />
  )
);

PlanUpgradeBanner.displayName = "PlanUpgradeBanner";

// Emergency Alert Banner - for critical system issues
export interface EmergencyAlertBannerProps extends Omit<BannerProps, 'variant'> {
  severity: 'high' | 'critical';
}

export const EmergencyAlertBanner = React.forwardRef<HTMLDivElement, EmergencyAlertBannerProps>(
  ({ severity, dismissible = false, ...props }, ref) => (
    <Banner
      ref={ref}
      variant="emergency"
      position="top"
      dismissible={dismissible}
      slideDown={true}
      {...props}
    />
  )
);

EmergencyAlertBanner.displayName = "EmergencyAlertBanner";

// Success Banner - for celebrations and achievements
export interface SuccessBannerProps extends Omit<BannerProps, 'variant'> {}

export const SuccessBanner = React.forwardRef<HTMLDivElement, SuccessBannerProps>(
  ({ autoHide = true, autoHideDelay = 7000, ...props }, ref) => (
    <Banner
      ref={ref}
      variant="success"
      autoHide={autoHide}
      autoHideDelay={autoHideDelay}
      {...props}
    />
  )
);

SuccessBanner.displayName = "SuccessBanner";

export { Banner };
export default Banner;