// src/components/ui/data-display/status-badge.tsx
'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { 
  CheckBadgeIcon,
  ClockIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  EyeIcon,
  DocumentCheckIcon,
  ShieldCheckIcon,
  StarIcon
} from '@heroicons/react/24/solid';
import { 
  CheckBadgeIcon as CheckBadgeOutline,
  ClockIcon as ClockOutline,
  XCircleIcon as XCircleOutline 
} from '@heroicons/react/24/outline';

const statusBadgeVariants = cva(
  "inline-flex items-center font-satoshi-medium rounded-full transition-all duration-200",
  {
    variants: {
      variant: {
        // Verification statuses
        verified: "bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20",
        unverified: "bg-[var(--background-secondary)] text-[var(--muted)] border border-[var(--border)]",
        pending: "bg-[var(--warning)]/10 text-[var(--warning)] border border-[var(--warning)]/20",
        rejected: "bg-[var(--error)]/10 text-[var(--error)] border border-[var(--error)]/20",
        
        // General statuses
        active: "bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20",
        inactive: "bg-[var(--background-secondary)] text-[var(--muted)] border border-[var(--border)]",
        suspended: "bg-[var(--error)]/10 text-[var(--error)] border border-[var(--error)]/20",
        
        // Business statuses
        approved: "bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20",
        review: "bg-[var(--warning)]/10 text-[var(--warning)] border border-[var(--warning)]/20",
        draft: "bg-[var(--background-secondary)] text-[var(--muted)] border border-[var(--border)]",
        
        // Manufacturer specific
        certified: "bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20",
        premium: "bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)] text-white border-0",
        vip: "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-0",
        
        // System statuses
        online: "bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20",
        offline: "bg-[var(--background-secondary)] text-[var(--muted)] border border-[var(--border)]",
        maintenance: "bg-[var(--warning)]/10 text-[var(--warning)] border border-[var(--warning)]/20",
        
        // Custom variants
        info: "bg-[var(--info)]/10 text-[var(--info)] border border-[var(--info)]/20",
        success: "bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20",
        warning: "bg-[var(--warning)]/10 text-[var(--warning)] border border-[var(--warning)]/20",
        error: "bg-[var(--error)]/10 text-[var(--error)] border border-[var(--error)]/20"
      },
      size: {
        sm: "px-2 py-0.5 text-xs gap-1",
        md: "px-3 py-1 text-sm gap-1.5",
        lg: "px-4 py-1.5 text-base gap-2"
      },
      animated: {
        true: "animate-pulse",
        false: ""
      },
      clickable: {
        true: "cursor-pointer hover:scale-105 active:scale-95",
        false: "cursor-default"
      }
    },
    defaultVariants: {
      variant: "info",
      size: "md",
      animated: false,
      clickable: false
    }
  }
);

// Status icon mapping
const statusIcons = {
  // Verification
  verified: CheckBadgeIcon,
  unverified: CheckBadgeOutline,
  pending: ClockIcon,
  rejected: XCircleIcon,
  
  // General statuses
  active: CheckBadgeIcon,
  inactive: ClockOutline,
  suspended: XCircleIcon,
  
  // Business statuses
  approved: CheckBadgeIcon,
  review: ClockIcon,
  draft: DocumentCheckIcon,
  
  // Manufacturer specific
  certified: ShieldCheckIcon,
  premium: StarIcon,
  vip: StarIcon,
  
  // System statuses
  online: CheckBadgeIcon,
  offline: XCircleOutline,
  maintenance: ExclamationTriangleIcon,
  
  // Custom variants
  info: InformationCircleIcon,
  success: CheckBadgeIcon,
  warning: ExclamationTriangleIcon,
  error: XCircleIcon
};

export interface StatusBadgeProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statusBadgeVariants> {
  status: keyof typeof statusIcons;
  label?: string;
  
  // Visual options
  showIcon?: boolean;
  customIcon?: React.ReactNode;
  pulse?: boolean;
  
  // Interaction
  onClick?: () => void;
  tooltip?: string;
  
  // Additional info
  subtitle?: string;
  metadata?: {
    timestamp?: string;
    reason?: string;
    expiresAt?: string;
  };
}

const StatusBadge = React.forwardRef<HTMLDivElement, StatusBadgeProps>(
  ({
    status,
    label,
    showIcon = true,
    customIcon,
    pulse = false,
    onClick,
    tooltip,
    subtitle,
    metadata,
    variant,
    size = "md",
    animated,
    clickable,
    className,
    ...props
  }, ref) => {
    // Auto-determine variant from status if not provided
    const badgeVariant = variant || status;
    
    // Auto-determine clickable state
    const isClickable = clickable ?? Boolean(onClick);
    
    // Auto-determine animation
    const isAnimated = animated ?? (pulse || status === 'pending');

    // Get status configuration
    const statusConfig = getStatusConfig(status);
    const Icon = customIcon ? null : statusIcons[status];
    
    // Default label if not provided
    const displayLabel = label || statusConfig.label;

    const handleClick = () => {
      if (onClick && !props['aria-disabled']) {
        onClick();
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if ((e.key === 'Enter' || e.key === ' ') && onClick) {
        e.preventDefault();
        handleClick();
      }
    };

    return (
      <div
        ref={ref}
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable ? 0 : undefined}
        title={tooltip || metadata?.reason}
        className={cn(
          statusBadgeVariants({ 
            variant: badgeVariant, 
            size, 
            animated: isAnimated,
            clickable: isClickable
          }),
          className
        )}
        onClick={isClickable ? handleClick : undefined}
        onKeyDown={isClickable ? handleKeyDown : undefined}
        {...props}
      >
        {/* Icon */}
        {showIcon && (customIcon || Icon) && (
          <div className="flex-shrink-0">
            {customIcon || (Icon && (
              <Icon className={cn(
                size === 'sm' && "w-3 h-3",
                size === 'md' && "w-4 h-4",
                size === 'lg' && "w-5 h-5"
              )} />
            ))}
          </div>
        )}
        
        {/* Main content */}
        <div className="min-w-0 flex-1">
          <span className="truncate">{displayLabel}</span>
          {subtitle && (
            <div className={cn(
              "text-xs opacity-75 truncate",
              size === 'sm' && "text-[10px]"
            )}>
              {subtitle}
            </div>
          )}
        </div>
        
        {/* Metadata indicator */}
        {metadata?.expiresAt && (
          <div className="flex-shrink-0 text-xs opacity-75">
            <ClockIcon className="w-3 h-3" />
          </div>
        )}
      </div>
    );
  }
);

StatusBadge.displayName = "StatusBadge";

// Helper function to get status configuration
function getStatusConfig(status: keyof typeof statusIcons) {
  const configs = {
    // Verification statuses
    verified: { label: 'Verified', description: 'Account has been verified' },
    unverified: { label: 'Unverified', description: 'Account verification pending' },
    pending: { label: 'Pending Review', description: 'Under review' },
    rejected: { label: 'Rejected', description: 'Verification rejected' },
    
    // General statuses
    active: { label: 'Active', description: 'Currently active' },
    inactive: { label: 'Inactive', description: 'Not currently active' },
    suspended: { label: 'Suspended', description: 'Account suspended' },
    
    // Business statuses
    approved: { label: 'Approved', description: 'Approved for use' },
    review: { label: 'Under Review', description: 'Currently being reviewed' },
    draft: { label: 'Draft', description: 'Draft status' },
    
    // Manufacturer specific
    certified: { label: 'Certified', description: 'Certified manufacturer' },
    premium: { label: 'Premium', description: 'Premium member' },
    vip: { label: 'VIP', description: 'VIP member' },
    
    // System statuses
    online: { label: 'Online', description: 'System online' },
    offline: { label: 'Offline', description: 'System offline' },
    maintenance: { label: 'Maintenance', description: 'Under maintenance' },
    
    // Custom variants
    info: { label: 'Info', description: 'Information' },
    success: { label: 'Success', description: 'Successful' },
    warning: { label: 'Warning', description: 'Warning' },
    error: { label: 'Error', description: 'Error occurred' }
  };

  return configs[status] || { label: status, description: '' };
}

// Pre-configured status badges for common use cases

// Verification Badge - specifically for account verification with brand/manufacturer distinction
export interface VerificationBadgeProps extends Omit<StatusBadgeProps, 'status'> {
  isVerified: boolean;
  isPending?: boolean;
  verifiedAt?: string;
  rejectedReason?: string;
  userType?: 'brand' | 'manufacturer'; // NEW: distinguish between brand and manufacturer
  hideWhenUnverified?: boolean; // NEW: hide the entire badge when unverified
}

export const VerificationBadge = React.forwardRef<HTMLDivElement, VerificationBadgeProps>(
  ({ 
    isVerified, 
    isPending = false, 
    verifiedAt, 
    rejectedReason, 
    userType = 'brand', // Default to brand
    hideWhenUnverified = true, // NEW: default to hiding unverified badges
    ...props 
  }, ref) => {
    let status: StatusBadgeProps['status'];
    let metadata: StatusBadgeProps['metadata'] = {};

    if (isVerified) {
      // Use verified status for both user types
      status = 'verified';
      if (verifiedAt) {
        metadata.timestamp = verifiedAt;
      }
    } else if (isPending) {
      status = 'pending';
    } else if (rejectedReason) {
      status = 'rejected';
      metadata.reason = rejectedReason;
    } else {
      status = 'unverified';
      // Hide the badge completely for unverified users if hideWhenUnverified is true
      if (hideWhenUnverified) {
        return null;
      }
    }

    return (
      <StatusBadge
        ref={ref}
        status={status}
        metadata={metadata}
        showIcon={true}
        {...props}
      />
    );
  }
);

VerificationBadge.displayName = "VerificationBadge";

// Manufacturer Status Badge - for manufacturer-specific statuses with enhanced styling
export interface ManufacturerStatusBadgeProps extends Omit<StatusBadgeProps, 'status'> {
  isVerified: boolean;
  isPremium?: boolean;
  isVIP?: boolean;
  isCertified?: boolean;
  hideWhenUnverified?: boolean; // NEW: hide when unverified
}

export const ManufacturerStatusBadge = React.forwardRef<HTMLDivElement, ManufacturerStatusBadgeProps>(
  ({ 
    isVerified, 
    isPremium = false, 
    isVIP = false, 
    isCertified = false, 
    hideWhenUnverified = true, // NEW: default to hiding
    ...props 
  }, ref) => {
    // Priority order: VIP > Premium > Verified > Certified > Unverified
    let status: StatusBadgeProps['status'];
    
    if (isVIP) {
      status = 'vip';
    } else if (isPremium) {
      status = 'premium';
    } else if (isVerified) {
      status = 'verified';
    } else if (isCertified) {
      status = 'certified';
    } else {
      status = 'unverified';
      // Hide the badge completely for unverified manufacturers
      if (hideWhenUnverified) {
        return null;
      }
    }

    return (
      <StatusBadge
        ref={ref}
        status={status}
        {...props}
      />
    );
  }
);

ManufacturerStatusBadge.displayName = "ManufacturerStatusBadge";

// Business Status Badge - for business account statuses with brand styling
export interface BusinessStatusBadgeProps extends Omit<StatusBadgeProps, 'status'> {
  accountStatus: 'active' | 'inactive' | 'suspended' | 'pending' | 'approved';
  planType?: 'foundation' | 'growth' | 'premium' | 'enterprise';
  isVerified?: boolean; // NEW: add verification status for brands
  hideWhenUnverified?: boolean; // NEW: hide when unverified
}

export const BusinessStatusBadge = React.forwardRef<HTMLDivElement, BusinessStatusBadgeProps>(
  ({ 
    accountStatus, 
    planType, 
    isVerified, 
    hideWhenUnverified = true, // NEW: default to hiding
    subtitle, 
    ...props 
  }, ref) => {
    // If verified, show verification badge instead of account status
    const status = isVerified ? 'verified' : accountStatus;
    const displaySubtitle = subtitle || (planType ? `${planType} plan` : undefined);

    // Hide when not verified and hideWhenUnverified is true
    if (!isVerified && hideWhenUnverified) {
      return null;
    }

    return (
      <StatusBadge
        ref={ref}
        status={status}
        subtitle={displaySubtitle}
        {...props}
      />
    );
  }
);

BusinessStatusBadge.displayName = "BusinessStatusBadge";

// Connection Status Badge - for brand-manufacturer connections
export interface ConnectionStatusBadgeProps extends Omit<StatusBadgeProps, 'status'> {
  connectionStatus: 'connected' | 'pending' | 'rejected' | 'none';
  connectedAt?: string;
}

export const ConnectionStatusBadge = React.forwardRef<HTMLDivElement, ConnectionStatusBadgeProps>(
  ({ connectionStatus, connectedAt, ...props }, ref) => {
    const statusMap: Record<string, StatusBadgeProps['status']> = {
      connected: 'active',
      pending: 'pending',
      rejected: 'rejected',
      none: 'inactive'
    };

    const labelMap = {
      connected: 'Connected',
      pending: 'Connection Pending',
      rejected: 'Connection Rejected',
      none: 'Not Connected'
    };

    return (
      <StatusBadge
        ref={ref}
        status={statusMap[connectionStatus]}
        label={labelMap[connectionStatus]}
        metadata={connectedAt ? { timestamp: connectedAt } : undefined}
        {...props}
      />
    );
  }
);

ConnectionStatusBadge.displayName = "ConnectionStatusBadge";

// System Health Badge - for system status monitoring
export interface SystemHealthBadgeProps extends Omit<StatusBadgeProps, 'status'> {
  health: 'healthy' | 'degraded' | 'down' | 'maintenance';
  uptime?: string;
}

export const SystemHealthBadge = React.forwardRef<HTMLDivElement, SystemHealthBadgeProps>(
  ({ health, uptime, ...props }, ref) => {
    const statusMap: Record<string, StatusBadgeProps['status']> = {
      healthy: 'online',
      degraded: 'warning',
      down: 'offline',
      maintenance: 'maintenance'
    };

    const labelMap = {
      healthy: 'Operational',
      degraded: 'Degraded Performance',
      down: 'Down',
      maintenance: 'Under Maintenance'
    };

    return (
      <StatusBadge
        ref={ref}
        status={statusMap[health]}
        label={labelMap[health]}
        subtitle={uptime ? `Uptime: ${uptime}` : undefined}
        pulse={health === 'degraded' || health === 'down'}
        {...props}
      />
    );
  }
);

SystemHealthBadge.displayName = "SystemHealthBadge";

export { StatusBadge };
export default StatusBadge;