// src/components/forms/controls/switch.tsx

import React, { forwardRef } from 'react';
import { FieldValues } from 'react-hook-form';
import { cn } from '@/lib/utils';

// Import your base switch primitives
import { 
  Switch, 
  ThemeSwitch,
  type SwitchProps as BaseSwitchProps,
  type ThemeSwitchProps as BaseThemeSwitchProps
} from '@/components/ui/primitives/switch';

// Import field utilities from your RHF adapters
import { 
  useFieldState, 
  formatFieldError,
  type BaseFieldProps 
} from '@/components/forms/adapters/rhf/field';

// Import types
import { UserPreferences } from '@/lib/typessss/user';
import { emailGatingConfigSchema, updateBrandSettingsSchema } from '@/lib/typessss/brand';

/**
 * RHF Switch Component - Boolean toggle with form integration
 * Aligns with backend boolean validation patterns
 */
export interface RHFSwitchProps<TFieldValues extends FieldValues = FieldValues>
  extends Omit<BaseSwitchProps, 'checked' | 'onCheckedChange' | 'name'>,
    BaseFieldProps<TFieldValues> {
  // Switch-specific options
  trueValue?: any; // Value when switched on (default: true)
  falseValue?: any; // Value when switched off (default: false)
}

export const RHFSwitch = forwardRef<
  HTMLInputElement,
  RHFSwitchProps
>(({ 
  name, 
  control, 
  trueValue = true,
  falseValue = false,
  transformError,
  className,
  ...props 
}, ref) => {
  const {
    field,
    error,
    isLoading
  } = useFieldState(name, control);

  const errorMessage = formatFieldError(error, transformError);
  
  return (
    <div className="space-y-2">
      <Switch
        {...props}
        ref={ref}
        checked={field.value === trueValue}
        onCheckedChange={(checked) => {
          field.onChange(checked ? trueValue : falseValue);
        }}
        disabled={props.disabled || isLoading}
        className={cn(className, {
          'opacity-50 cursor-not-allowed': props.disabled || isLoading,
        })}
      />
      
      {errorMessage && (
        <p className="text-sm text-[var(--error)] flex items-center gap-1 font-satoshi">
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zM10 15a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          {errorMessage}
        </p>
      )}
    </div>
  );
});

RHFSwitch.displayName = 'RHFSwitch';

/**
 * RHF Switch Group - Multiple switches for object/settings management
 * Aligns with backend object validation patterns like user preferences
 */
export interface RHFSwitchGroupProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  switches: Array<{
    key: string;
    label: string;
    description?: string;
    disabled?: boolean;
    variant?: 'default' | 'success' | 'warning' | 'error';
    trueValue?: any;
    falseValue?: any;
  }>;
  // Group layout options
  orientation?: 'vertical' | 'horizontal' | 'grid';
  columns?: number;
  spacing?: 'sm' | 'md' | 'lg';
  // Display options
  label?: string;
  description?: string;
  helper?: string;
  required?: boolean;
}

export const RHFSwitchGroup = forwardRef<
  HTMLDivElement,
  RHFSwitchGroupProps
>(({ 
  name, 
  control, 
  switches,
  orientation = 'vertical',
  columns = 2,
  spacing = 'md',
  label,
  description,
  helper,
  required,
  transformError,
  className,
  ...props 
}, ref) => {
  const {
    field,
    error,
    isLoading
  } = useFieldState(name, control);

  const currentValue = field.value || {};
  const errorMessage = formatFieldError(error, transformError);

  // Handle individual switch toggle
  const handleSwitchToggle = (switchKey: string, checked: boolean, switchConfig: any) => {
    const newValue = {
      ...currentValue,
      [switchKey]: checked ? 
        (switchConfig.trueValue ?? true) : 
        (switchConfig.falseValue ?? false)
    };
    field.onChange(newValue);
  };

  // Layout classes
  const layoutClasses = {
    horizontal: 'flex flex-wrap gap-6',
    vertical: 'space-y-4',
    grid: `grid gap-4 grid-cols-1 sm:grid-cols-${columns}`
  };

  const spacingClasses = {
    sm: orientation === 'grid' ? 'gap-2' : orientation === 'horizontal' ? 'gap-3' : 'space-y-2',
    md: orientation === 'grid' ? 'gap-4' : orientation === 'horizontal' ? 'gap-6' : 'space-y-4',
    lg: orientation === 'grid' ? 'gap-6' : orientation === 'horizontal' ? 'gap-8' : 'space-y-6'
  };

  return (
    <div className={cn('space-y-4', className)} ref={ref}>
      {/* Group Label */}
      {label && (
        <div className="space-y-1">
          <label className={cn(
            'text-sm font-satoshi-medium text-[var(--heading-color)]',
            required && "after:content-['*'] after:text-[var(--error)] after:ml-1"
          )}>
            {label}
          </label>
          {description && (
            <p className="text-xs text-[var(--caption-color)] font-satoshi">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Switch Options */}
      <div className={cn(
        layoutClasses[orientation],
        spacingClasses[spacing]
      )}>
        {switches.map((switchConfig) => {
          const switchValue = currentValue[switchConfig.key];
          const isChecked = switchValue === (switchConfig.trueValue ?? true);
          const isDisabled = switchConfig.disabled || isLoading;

          return (
            <Switch
              key={switchConfig.key}
              label={switchConfig.label}
              description={switchConfig.description}
              variant={switchConfig.variant}
              checked={isChecked}
              disabled={isDisabled}
              onCheckedChange={(checked) => 
                !isDisabled && handleSwitchToggle(switchConfig.key, checked, switchConfig)
              }
            />
          );
        })}
      </div>

      {/* Helper Text */}
      {helper && !errorMessage && (
        <p className="text-xs text-[var(--caption-color)] font-satoshi">
          {helper}
        </p>
      )}

      {/* Error Message */}
      {errorMessage && (
        <p className="text-sm text-[var(--error)] flex items-center gap-1 font-satoshi">
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zM10 15a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          {errorMessage}
        </p>
      )}
    </div>
  );
});

RHFSwitchGroup.displayName = 'RHFSwitchGroup';

/**
 * RHF Theme Switch - Specialized for theme selection
 */
export interface RHFThemeSwitchProps<TFieldValues extends FieldValues = FieldValues>
  extends Omit<BaseThemeSwitchProps, 'theme' | 'onThemeChange' | 'name'>,
    BaseFieldProps<TFieldValues> {}

export const RHFThemeSwitch = forwardRef<
  HTMLInputElement,
  RHFThemeSwitchProps
>(({ 
  name, 
  control, 
  transformError,
  className,
  ...props 
}, ref) => {
  const {
    field,
    error,
    isLoading
  } = useFieldState(name, control);

  const errorMessage = formatFieldError(error, transformError);
  
  return (
    <div className="space-y-2">
      <ThemeSwitch
        {...props}
        ref={ref}
        theme={field.value || 'light'}
        onThemeChange={(theme) => {
          field.onChange(theme);
        }}
        disabled={props.disabled || isLoading}
        className={cn(className, {
          'opacity-50 cursor-not-allowed': props.disabled || isLoading,
        })}
      />
      
      {errorMessage && (
        <p className="text-sm text-[var(--error)] flex items-center gap-1 font-satoshi">
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zM10 15a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          {errorMessage}
        </p>
      )}
    </div>
  );
});

RHFThemeSwitch.displayName = 'RHFThemeSwitch';

/**
 * Specialized switch group for user preferences
 * Aligns with your backend userPreferencesSchema validation
 * 
 * Backend fields supported:
 * - emailNotifications: boolean (inferred general toggle)
 * - marketingEmails: boolean (default: false)
 * - productUpdates: boolean (default: true)
 * - securityNotifications: boolean (default: true)
 * - smsNotifications: boolean (inferred general toggle)
 */
export interface RHFUserPreferencesSwitchProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  categories?: Array<{
    title: string;
    description?: string;
    switches: Array<{
      key: keyof UserPreferences;
      label: string;
      description?: string;
    }>;
  }>;
}

export const RHFUserPreferencesSwitch = forwardRef<
  HTMLDivElement,
  RHFUserPreferencesSwitchProps
>(({ 
  name, 
  control, 
  categories,
  transformError,
  className,
  ...props 
}, ref) => {
  const defaultCategories = [
    {
      title: 'Email Notifications',
      description: 'Choose what email notifications you want to receive',
      switches: [
        {
          key: 'emailNotifications' as const,
          label: 'Email Notifications',
          description: 'Receive email notifications for important updates'
        },
        {
          key: 'marketingEmails' as const,
          label: 'Marketing Emails',
          description: 'Receive promotional emails and product updates'
        },
        {
          key: 'productUpdates' as const,
          label: 'Product Updates',
          description: 'Get notified about new features and improvements'
        },
        {
          key: 'securityNotifications' as const,
          label: 'Security Notifications',
          description: 'Important security alerts and login notifications'
        }
      ]
    },
    {
      title: 'SMS Notifications',
      description: 'SMS notifications for urgent updates',
      switches: [
        {
          key: 'smsNotifications' as const,
          label: 'SMS Notifications',
          description: 'Receive SMS for urgent notifications'
        }
      ]
    }
  ];

  const preferencesCategories = categories || defaultCategories;

  return (
    <div className={cn('space-y-8', className)} ref={ref}>
      {preferencesCategories.map((category, categoryIndex) => (
        <div key={categoryIndex} className="space-y-4">
          <div className="space-y-1">
            <h3 className="text-sm font-satoshi-medium text-[var(--heading-color)]">
              {category.title}
            </h3>
            {category.description && (
              <p className="text-xs text-[var(--caption-color)] font-satoshi">
                {category.description}
              </p>
            )}
          </div>
          
          <RHFSwitchGroup
            name={name}
            control={control}
            switches={category.switches.map(s => ({
              key: String(s.key),
              label: s.label,
              description: s.description
            }))}
            orientation="vertical"
            spacing="md"
            transformError={transformError}
          />
        </div>
      ))}
    </div>
  );
});

RHFUserPreferencesSwitch.displayName = 'RHFUserPreferencesSwitch';

/**
 * Specialized switch group for brand settings
 * Aligns with your backend updateBrandSettingsSchema validation
 * 
 * Backend fields supported:
 * - enableSsl: boolean (custom field for SSL configuration)
 * - isPublic: boolean (custom field for public profile)
 * - allowCustomOrders: boolean (custom field for order management)
 * - autoApproveOrders: boolean (custom field for order automation)
 * - enableAnalytics: boolean (custom field for analytics tracking)
 * - enableApiAccess: boolean (custom field for API access)
 * - enableWebhooks: boolean (custom field for webhook integration)
 */
export interface RHFBrandSettingsSwitchProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  showAdvanced?: boolean;
}

export const RHFBrandSettingsSwitch = forwardRef<
  HTMLDivElement,
  RHFBrandSettingsSwitchProps
>(({ 
  name, 
  control, 
  showAdvanced = false,
  transformError,
  className,
  ...props 
}, ref) => {
  const brandSettingSwitches = [
    {
      key: 'enableSsl',
      label: 'Enable SSL',
      description: 'Secure your custom domain with SSL encryption',
      variant: 'success' as const
    },
    {
      key: 'isPublic',
      label: 'Public Profile',
      description: 'Make your brand profile visible to the public'
    },
    {
      key: 'allowCustomOrders',
      label: 'Custom Orders',
      description: 'Allow manufacturers to submit custom order proposals'
    },
    {
      key: 'autoApproveOrders',
      label: 'Auto-approve Orders',
      description: 'Automatically approve orders that meet your criteria',
      disabled: !showAdvanced
    },
    {
      key: 'enableAnalytics',
      label: 'Analytics Tracking',
      description: 'Track visitor analytics on your brand page'
    }
  ];

  if (showAdvanced) {
    brandSettingSwitches.push(
      {
        key: 'enableApiAccess',
        label: 'API Access',
        description: 'Enable API access for integrations'
      },
      {
        key: 'enableWebhooks',
        label: 'Webhooks',
        description: 'Send real-time notifications to external systems'
      }
    );
  }

  return (
    <RHFSwitchGroup
      {...props}
      ref={ref}
      name={name}
      control={control}
      switches={brandSettingSwitches}
      label="Brand Settings"
      description="Configure how your brand profile behaves"
      orientation="vertical"
      spacing="md"
      transformError={transformError}
      className={className}
    />
  );
});

RHFBrandSettingsSwitch.displayName = 'RHFBrandSettingsSwitch';

/**
 * Specialized switch group for email gating configuration
 * Aligns with your backend emailGatingConfigSchema validation
 * 
 * Backend fields supported:
 * - enabled: boolean (default: false)
 * - allowUnregistered: boolean (default: false) 
 * - requireApproval: boolean (default: false)
 * - autoSyncEnabled: boolean (default: false)
 * - welcomeEmailEnabled: boolean (inferred from backend patterns)
 */
export interface RHFEmailGatingSwitchProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {}

export const RHFEmailGatingSwitch = forwardRef<
  HTMLDivElement,
  RHFEmailGatingSwitchProps
>(({ 
  name, 
  control, 
  transformError,
  className,
  ...props 
}, ref) => {
  const emailGatingSwitches = [
    {
      key: 'enabled',
      label: 'Enable Email Gating',
      description: 'Restrict access based on email addresses'
    },
    {
      key: 'allowUnregistered',
      label: 'Allow Unregistered Users',
      description: 'Allow users who haven\'t registered yet'
    },
    {
      key: 'requireApproval',
      label: 'Require Approval',
      description: 'Manually approve each access request'
    },
    {
      key: 'autoSyncEnabled',
      label: 'Auto-sync Email Lists',
      description: 'Automatically sync with connected platforms'
    },
    {
      key: 'welcomeEmailEnabled',
      label: 'Welcome Emails',
      description: 'Send welcome emails to new users',
      variant: 'success' as const
    }
  ];

  return (
    <RHFSwitchGroup
      {...props}
      ref={ref}
      name={name}
      control={control}
      switches={emailGatingSwitches}
      label="Email Gating Configuration"
      description="Control who can access your content"
      orientation="vertical"
      spacing="md"
      transformError={transformError}
      className={className}
    />
  );
});

RHFEmailGatingSwitch.displayName = 'RHFEmailGatingSwitch';