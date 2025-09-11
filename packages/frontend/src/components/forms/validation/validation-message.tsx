// src/components/forms/validation/validation-message.tsx
'use client';

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { 
  ExclamationTriangleIcon, 
  CheckCircleIcon, 
  InformationCircleIcon,
  XCircleIcon 
} from '@heroicons/react/24/outline';
import type { ValidationError } from './form-validator';

// Message types aligned with backend validation responses
export type ValidationMessageType = 'error' | 'warning' | 'success' | 'info';

export interface ValidationMessageProps {
  message?: string;
  messages?: string[];
  errors?: ValidationError[];
  type?: ValidationMessageType;
  show?: boolean;
  animate?: boolean;
  compact?: boolean;
  icon?: boolean;
  className?: string;
  maxErrors?: number;
  groupByType?: boolean;
}

// Error code to type mapping (aligned with backend error codes)
const ERROR_CODE_TYPE_MAP: Record<string, ValidationMessageType> = {
  'VALIDATION_ERROR': 'error',
  'REQUIRED_FIELD': 'error',
  'INVALID_FORMAT': 'error',
  'MIN_LENGTH': 'error',
  'MAX_LENGTH': 'error',
  'INVALID_EMAIL': 'error',
  'INVALID_PHONE': 'error',
  'WEAK_PASSWORD': 'warning',
  'PASSWORD_MISMATCH': 'error',
  'DUPLICATE_VALUE': 'error',
  'NOT_FOUND': 'error',
  'UNAUTHORIZED': 'error',
  'FORBIDDEN': 'error',
  'RATE_LIMITED': 'warning',
  'CUSTOM_VALIDATION_ERROR': 'error',
  'ZOD_VALIDATION': 'error',
  'JOI_VALIDATION': 'error'
};

// Message priority for sorting (higher number = higher priority)
const MESSAGE_PRIORITY: Record<ValidationMessageType, number> = {
  error: 4,
  warning: 3,
  info: 2,
  success: 1
};

export const ValidationMessage: React.FC<ValidationMessageProps> = ({
  message,
  messages,
  errors,
  type = 'error',
  show = true,
  animate = true,
  compact = false,
  icon = true,
  className,
  maxErrors = 5,
  groupByType = false
}) => {
  // Process and organize validation messages
  const processedMessages = useMemo(() => {
    const allMessages: Array<{
      text: string;
      type: ValidationMessageType;
      code?: string;
      field?: string;
      priority: number;
    }> = [];

    // Add single message
    if (message) {
      allMessages.push({
        text: message,
        type,
        priority: MESSAGE_PRIORITY[type]
      });
    }

    // Add array of messages
    if (messages) {
      messages.forEach(msg => {
        allMessages.push({
          text: msg,
          type,
          priority: MESSAGE_PRIORITY[type]
        });
      });
    }

    // Add validation errors
    if (errors) {
      errors.forEach(error => {
        const errorType = ERROR_CODE_TYPE_MAP[error.code || ''] || 'error';
        allMessages.push({
          text: error.message,
          type: errorType,
          code: error.code,
          field: error.field,
          priority: MESSAGE_PRIORITY[errorType]
        });
      });
    }

    // Remove duplicates and sort by priority
    const uniqueMessages = allMessages.filter((msg, index, self) => 
      index === self.findIndex(m => m.text === msg.text && m.type === msg.type)
    );

    // Sort by priority (highest first) and limit count
    const sortedMessages = uniqueMessages
      .sort((a, b) => b.priority - a.priority)
      .slice(0, maxErrors);

    // Group by type if requested
    if (groupByType) {
      const grouped: Record<ValidationMessageType, typeof sortedMessages> = {
        error: [],
        warning: [],
        success: [],
        info: []
      };

      sortedMessages.forEach(msg => {
        grouped[msg.type].push(msg);
      });

      return grouped;
    }

    return sortedMessages;
  }, [message, messages, errors, type, maxErrors, groupByType]);

  // Don't render if no messages or hidden
  if (!show || (
    !message && 
    (!messages || messages.length === 0) && 
    (!errors || errors.length === 0)
  )) {
    return null;
  }

  // Get icon for message type
  const getIcon = (messageType: ValidationMessageType) => {
    const iconProps = {
      className: cn(
        "flex-shrink-0",
        compact ? "w-4 h-4" : "w-5 h-5"
      )
    };

    switch (messageType) {
      case 'error':
        return <XCircleIcon {...iconProps} />;
      case 'warning':
        return <ExclamationTriangleIcon {...iconProps} />;
      case 'success':
        return <CheckCircleIcon {...iconProps} />;
      case 'info':
        return <InformationCircleIcon {...iconProps} />;
      default:
        return <InformationCircleIcon {...iconProps} />;
    }
  };

  // Get styles for message type
  const getTypeStyles = (messageType: ValidationMessageType) => {
    const baseStyles = cn(
      "flex items-start gap-2 font-satoshi",
      compact ? "text-xs py-1" : "text-sm py-2"
    );

    switch (messageType) {
      case 'error':
        return cn(baseStyles, "text-[var(--error)]");
      case 'warning':
        return cn(baseStyles, "text-[var(--warning)]");
      case 'success':
        return cn(baseStyles, "text-[var(--success)]");
      case 'info':
        return cn(baseStyles, "text-[var(--info)]");
      default:
        return cn(baseStyles, "text-[var(--caption-color)]");
    }
  };

  // Render single message
  const renderMessage = (msg: { text: string; type: ValidationMessageType; field?: string }, key: string) => (
    <div
      key={key}
      className={cn(
        getTypeStyles(msg.type),
        animate && "animate-in slide-in-from-top-1 duration-200"
      )}
    >
      {icon && getIcon(msg.type)}
      <span className="flex-1">
        {msg.field && !compact && (
          <span className="font-satoshi-medium">{msg.field}: </span>
        )}
        {msg.text}
      </span>
    </div>
  );

  // Render grouped messages
  if (groupByType && typeof processedMessages === 'object' && !Array.isArray(processedMessages)) {
    const grouped = processedMessages as Record<ValidationMessageType, any[]>;
    
    return (
      <div className={cn("space-y-1", className)}>
        {(['error', 'warning', 'info', 'success'] as ValidationMessageType[]).map(msgType => {
          const msgs = grouped[msgType];
          if (!msgs || msgs.length === 0) return null;

          return (
            <div key={msgType} className="space-y-1">
              {!compact && msgs.length > 1 && (
                <div className={cn(
                  "text-xs font-satoshi-medium uppercase tracking-wide",
                  getTypeStyles(msgType).split(' ').filter(c => c.startsWith('text-'))[0]
                )}>
                  {msgType}s ({msgs.length})
                </div>
              )}
              {msgs.map((msg, index) => renderMessage(msg, `${msgType}-${index}`))}
            </div>
          );
        })}
      </div>
    );
  }

  // Render flat list of messages
  const flatMessages = processedMessages as Array<{
    text: string;
    type: ValidationMessageType;
    field?: string;
  }>;

  return (
    <div className={cn("space-y-1", className)}>
      {flatMessages.map((msg, index) => renderMessage(msg, `msg-${index}`))}
    </div>
  );
};

// Specialized validation message components

// Field Error Message - for individual form fields
export interface FieldErrorMessageProps extends Omit<ValidationMessageProps, 'type'> {
  fieldName?: string;
  touched?: boolean;
  showWhenUntouched?: boolean;
}

export const FieldErrorMessage: React.FC<FieldErrorMessageProps> = ({
  fieldName,
  touched = true,
  showWhenUntouched = false,
  ...props
}) => {
  const shouldShow = showWhenUntouched || touched;
  
  return (
    <ValidationMessage
      {...props}
      type="error"
      show={shouldShow && props.show !== false}
      compact={true}
    />
  );
};

// Form Summary Message - for form-level validation summary
export interface FormSummaryMessageProps extends ValidationMessageProps {
  errorCount?: number;
  warningCount?: number;
  showCounts?: boolean;
}

export const FormSummaryMessage: React.FC<FormSummaryMessageProps> = ({
  errorCount = 0,
  warningCount = 0,
  showCounts = true,
  ...props
}) => {
  if (errorCount === 0 && warningCount === 0 && !props.message && !props.messages) {
    return null;
  }

  const summaryMessage = useMemo(() => {
    if (props.message) return props.message;
    
    const parts: string[] = [];
    
    if (errorCount > 0) {
      parts.push(`${errorCount} error${errorCount !== 1 ? 's' : ''}`);
    }
    
    if (warningCount > 0) {
      parts.push(`${warningCount} warning${warningCount !== 1 ? 's' : ''}`);
    }
    
    if (parts.length === 0) return '';
    
    return `Please fix ${parts.join(' and ')} below.`;
  }, [props.message, errorCount, warningCount]);

  const summaryType: ValidationMessageType = errorCount > 0 ? 'error' : 'warning';

  return (
    <div className="p-4 border rounded-xl bg-opacity-10" style={{
      borderColor: `var(--${summaryType})`,
      backgroundColor: `var(--${summaryType})`
    }}>
      <ValidationMessage
        {...props}
        message={summaryMessage}
        type={summaryType}
        compact={false}
        className="m-0"
      />
    </div>
  );
};

// Success Message - for successful validations
export const SuccessMessage: React.FC<Omit<ValidationMessageProps, 'type'>> = (props) => (
  <ValidationMessage {...props} type="success" />
);

// Warning Message - for non-critical validation issues
export const WarningMessage: React.FC<Omit<ValidationMessageProps, 'type'>> = (props) => (
  <ValidationMessage {...props} type="warning" />
);

// Info Message - for informational validation feedback
export const InfoMessage: React.FC<Omit<ValidationMessageProps, 'type'>> = (props) => (
  <ValidationMessage {...props} type="info" />
);