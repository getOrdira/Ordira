// src/components/ui/data-display/progress.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';
import { 
  CheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  CloudArrowUpIcon,
  ChartBarIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

const progressVariants = cva(
  // Base progress bar styles
  "relative w-full overflow-hidden rounded-full transition-all duration-300",
  {
    variants: {
      size: {
        xs: "h-1",
        sm: "h-2",
        md: "h-3", 
        lg: "h-4",
        xl: "h-6",
      },
      variant: {
        default: "bg-[var(--background-secondary)]",
        muted: "bg-[var(--background-tertiary)]",
        outlined: "bg-[var(--background)] border border-[var(--border)]",
      }
    },
    defaultVariants: {
      size: "md",
      variant: "default",
    },
  }
);

const progressFillVariants = cva(
  "h-full transition-all duration-500 ease-out",
  {
    variants: {
      color: {
        primary: "bg-[var(--primary)]",
        success: "bg-[var(--success)]",
        warning: "bg-[var(--warning)]", 
        error: "bg-[var(--error)]",
        gray: "bg-[var(--muted)]",
        gradient: "bg-gradient-to-r from-[var(--primary)] to-[var(--primary-dark)]",
      },
      animated: {
        true: "relative before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:animate-shimmer",
        false: "",
      }
    },
    defaultVariants: {
      color: "primary",
      animated: false,
    },
  }
);

export interface ProgressProps 
  extends VariantProps<typeof progressVariants> {
  value: number;
  max?: number;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'gray' | 'gradient';
  showPercentage?: boolean;
  showValue?: boolean;
  label?: string;
  className?: string;
  fillClassName?: string;
  animated?: boolean;
  striped?: boolean;
  formatValue?: (value: number, max: number) => string;
}

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ 
    value,
    max = 100,
    size = "md",
    variant = "default",
    color = "primary",
    showPercentage = false,
    showValue = false,
    label,
    className,
    fillClassName,
    animated = false,
    striped = false,
    formatValue,
    ...props 
  }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    
    const displayValue = formatValue 
      ? formatValue(value, max)
      : showPercentage 
        ? `${Math.round(percentage)}%`
        : `${value}/${max}`;

    return (
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        {/* Label and value display */}
        {(label || showPercentage || showValue) && (
          <div className="flex justify-between items-center">
            {label && (
              <span className="text-sm font-medium text-[var(--heading-color)]">{label}</span>
            )}
            {(showPercentage || showValue) && (
              <span className="text-sm text-[var(--body-color)]">{displayValue}</span>
            )}
          </div>
        )}

        {/* Progress bar */}
        <div className={cn(progressVariants({ size, variant }))}>
          <div
            className={cn(
              progressFillVariants({ color, animated }),
              striped && "bg-striped",
              fillClassName
            )}
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={max}
            aria-label={label || `Progress: ${value} of ${max}`}
          />
        </div>
      </div>
    );
  }
);

Progress.displayName = "Progress";

// Circular Progress Component
export interface CircularProgressProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'gray';
  showPercentage?: boolean;
  showValue?: boolean;
  label?: string;
  className?: string;
  animated?: boolean;
}

const CircularProgress = React.forwardRef<HTMLDivElement, CircularProgressProps>(
  ({ 
    value,
    max = 100,
    size = 120,
    strokeWidth = 8,
    color = "primary",
    showPercentage = true,
    showValue = false,
    label,
    className,
    animated = true,
    ...props 
  }, ref) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    const colorMap = {
      primary: 'var(--primary)',
      success: 'var(--success)', 
      warning: 'var(--warning)',
      error: 'var(--error)',
      gray: 'var(--muted)',
    };

    const displayValue = showPercentage 
      ? `${Math.round(percentage)}%`
      : showValue 
        ? `${value}/${max}`
        : '';

    return (
      <div 
        ref={ref} 
        className={cn("relative inline-flex flex-col items-center", className)}
        {...props}
      >
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--border)"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colorMap[color]}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={cn(
              animated && "transition-all duration-500 ease-out"
            )}
          />
        </svg>

        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {displayValue && (
            <div className="text-lg font-semibold text-[var(--heading-color)]">
              {displayValue}
            </div>
          )}
          {label && (
            <div className="text-xs text-[var(--body-color)] text-center px-2">
              {label}
            </div>
          )}
        </div>
      </div>
    );
  }
);

CircularProgress.displayName = "CircularProgress";

// Step Progress Component for wizards/onboarding
export interface StepProgressProps {
  steps: Array<{
    id: string;
    title: string;
    description?: string;
    status: 'pending' | 'current' | 'completed' | 'error';
  }>;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  showConnectors?: boolean;
}

const StepProgress = React.forwardRef<HTMLDivElement, StepProgressProps>(
  ({ 
    steps,
    className,
    orientation = 'horizontal',
    showConnectors = true,
    ...props 
  }, ref) => {
    const getStepIcon = (status: string) => {
      switch (status) {
        case 'completed':
          return <CheckIcon className="w-4 h-4 text-white" />;
        case 'current':
          return <div className="w-2 h-2 bg-white rounded-full" />;
        case 'error':
          return <XMarkIcon className="w-4 h-4 text-white" />;
        default:
          return <div className="w-2 h-2 bg-[var(--muted)] rounded-full" />;
      }
    };

    const getStepStyles = (status: string) => {
      switch (status) {
        case 'completed':
          return 'bg-[var(--success)] border-[var(--success)]';
        case 'current':
          return 'bg-[var(--primary)] border-[var(--primary)]';
        case 'error':
          return 'bg-[var(--error)] border-[var(--error)]';
        default:
          return 'bg-[var(--background-secondary)] border-[var(--border)]';
      }
    };

    return (
      <div 
        ref={ref} 
        className={cn(
          "flex",
          orientation === 'vertical' ? "flex-col space-y-4" : "items-center space-x-4",
          className
        )}
        {...props}
      >
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className={cn(
              "flex items-center",
              orientation === 'vertical' ? "space-x-3" : "flex-col text-center"
            )}>
              {/* Step indicator */}
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors",
                getStepStyles(step.status)
              )}>
                {getStepIcon(step.status)}
              </div>

              {/* Step content */}
              <div className={cn(
                orientation === 'vertical' ? "flex-1" : "mt-2"
              )}>
                <div className={cn(
                  "text-sm font-medium",
                  step.status === 'current' ? "text-[var(--primary)]" : "text-[var(--heading-color)]"
                )}>
                  {step.title}
                </div>
                {step.description && (
                  <div className="text-xs text-[var(--body-color)] mt-1">
                    {step.description}
                  </div>
                )}
              </div>
            </div>

            {/* Connector */}
            {showConnectors && index < steps.length - 1 && (
              <div className={cn(
                "border-[var(--border)]",
                orientation === 'vertical' 
                  ? "border-l-2 h-6 ml-4" 
                  : "border-t-2 flex-1 min-w-8"
              )} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }
);

StepProgress.displayName = "StepProgress";

// Upload Progress Component for file uploads
export interface UploadProgressProps {
  files: Array<{
    id: string;
    name: string;
    size: number;
    progress: number;
    status: 'uploading' | 'completed' | 'error' | 'pending';
    speed?: number; // bytes per second
    error?: string;
  }>;
  className?: string;
  onRetry?: (fileId: string) => void;
  onCancel?: (fileId: string) => void;
}

const UploadProgress = React.forwardRef<HTMLDivElement, UploadProgressProps>(
  ({ 
    files,
    className,
    onRetry,
    onCancel,
    ...props 
  }, ref) => {
    const formatFileSize = (bytes: number) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const formatSpeed = (bytesPerSecond: number) => {
      return `${formatFileSize(bytesPerSecond)}/s`;
    };

    return (
      <div ref={ref} className={cn("space-y-3", className)} {...props}>
        {files.map((file) => (
          <div key={file.id} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-3">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  file.status === 'completed' && "bg-[var(--success)]",
                  file.status === 'uploading' && "bg-[var(--accent)]",
                  file.status === 'error' && "bg-[var(--error)]",
                  file.status === 'pending' && "bg-gray-300"
                )}>
                  {file.status === 'completed' && <CheckIcon className="w-4 h-4 text-white" />}
                  {file.status === 'uploading' && <CloudArrowUpIcon className="w-4 h-4 text-white" />}
                  {file.status === 'error' && <ExclamationTriangleIcon className="w-4 h-4 text-white" />}
                  {file.status === 'pending' && <ClockIcon className="w-4 h-4 text-gray-600" />}
                </div>
                
                <div>
                  <div className="text-sm font-medium text-gray-900">{file.name}</div>
                  <div className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                    {file.speed && file.status === 'uploading' && (
                      <span> • {formatSpeed(file.speed)}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {file.status === 'uploading' && (
                  <span className="text-sm text-gray-600">{file.progress}%</span>
                )}
                
                {file.status === 'error' && onRetry && (
                  <button
                    onClick={() => onRetry(file.id)}
                    className="p-1 text-gray-400 hover:text-[var(--accent)]"
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                  </button>
                )}
                
                {(file.status === 'uploading' || file.status === 'pending') && onCancel && (
                  <button
                    onClick={() => onCancel(file.id)}
                    className="p-1 text-gray-400 hover:text-[var(--error)]"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Progress bar */}
            {(file.status === 'uploading' || file.status === 'completed') && (
              <Progress
                value={file.progress}
                color={file.status === 'completed' ? 'success' : 'primary'}
                size="sm"
                animated={file.status === 'uploading'}
              />
            )}

            {/* Error message */}
            {file.status === 'error' && file.error && (
              <div className="mt-2 text-xs text-[var(--error)]">
                {file.error}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }
);

UploadProgress.displayName = "UploadProgress";

// Batch Progress Component for bulk operations
export interface BatchProgressProps {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  status: 'pending' | 'running' | 'completed' | 'error' | 'cancelled';
  estimatedCompletion?: string;
  averageProcessingTime?: number;
  remainingTime?: number;
  className?: string;
}

const BatchProgress = React.forwardRef<HTMLDivElement, BatchProgressProps>(
  ({ 
    total,
    processed,
    successful,
    failed,
    status,
    estimatedCompletion,
    averageProcessingTime,
    remainingTime,
    className,
    ...props 
  }, ref) => {
    const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;
    const remaining = total - processed;

    const formatTime = (seconds: number) => {
      if (seconds < 60) return `${Math.round(seconds)}s`;
      if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
      return `${Math.round(seconds / 3600)}h`;
    };

    return (
      <div ref={ref} className={cn("space-y-4", className)} {...props}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">
            Batch Processing Progress
          </h3>
          <div className={cn(
            "px-3 py-1 rounded-full text-sm font-medium",
            status === 'completed' && "bg-[var(--success)]/10 text-[var(--success)]",
            status === 'running' && "bg-[var(--accent)]/10 text-[var(--accent)]",
            status === 'error' && "bg-[var(--error)]/10 text-[var(--error)]",
            status === 'pending' && "bg-gray-100 text-gray-600",
            status === 'cancelled' && "bg-gray-100 text-gray-600"
          )}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </div>
        </div>

        {/* Progress */}
        <Progress
          value={processed}
          max={total}
          label={`${processed}/${total} items processed`}
          showPercentage
          color={status === 'error' ? 'error' : status === 'completed' ? 'success' : 'primary'}
          animated={status === 'running'}
          size="lg"
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-sm text-gray-500">Successful</div>
            <div className="text-lg font-semibold text-[var(--success)]">{successful}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Failed</div>
            <div className="text-lg font-semibold text-[var(--error)]">{failed}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Remaining</div>
            <div className="text-lg font-semibold text-gray-900">{remaining}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Progress</div>
            <div className="text-lg font-semibold text-[var(--accent)]">{percentage}%</div>
          </div>
        </div>

        {/* Timing info */}
        {(estimatedCompletion || remainingTime || averageProcessingTime) && (
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            {remainingTime && (
              <span>⏱️ {formatTime(remainingTime)} remaining</span>
            )}
            {averageProcessingTime && (
              <span>📊 {formatTime(averageProcessingTime)} avg per item</span>
            )}
            {estimatedCompletion && (
              <span>🎯 ETA: {estimatedCompletion}</span>
            )}
          </div>
        )}
      </div>
    );
  }
);

BatchProgress.displayName = "BatchProgress";

export { 
  Progress, 
  CircularProgress, 
  StepProgress, 
  UploadProgress, 
  BatchProgress 
};
export default Progress;