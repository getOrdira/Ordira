// src/components/forms/controls/checkbox.tsx

import React, { forwardRef } from 'react';
import { 
  useController, 
  useFormContext, 
  FieldValues, 
  FieldPath,
  Control 
} from 'react-hook-form';
import { cn } from '@/lib/utils';

// Import your base checkbox primitives
import { 
  Checkbox, 
  CheckboxCard, 
  ToggleCheckbox,
  type CheckboxProps as BaseCheckboxProps,
  type CheckboxCardProps as BaseCheckboxCardProps,
  type ToggleCheckboxProps as BaseToggleCheckboxProps
} from '@/components/ui/primitives/checkbox';

// Import field utilities from your RHF adapters
import { 
  useFieldState, 
  formatFieldError,
  type BaseFieldProps 
} from '@/components/forms/adapters/rhf/field';

/**
 * RHF Checkbox Component - Single checkbox with form integration
 */
export interface RHFCheckboxProps<TFieldValues extends FieldValues = FieldValues>
  extends Omit<BaseCheckboxProps, 'checked' | 'onCheckedChange' | 'name'>,
    BaseFieldProps<TFieldValues> {
  // Checkbox-specific options
  checkValue?: any; // Value when checked (default: true)
  uncheckValue?: any; // Value when unchecked (default: false)
}

export const RHFCheckbox = forwardRef<
  HTMLInputElement,
  RHFCheckboxProps
>(({ 
  name, 
  control, 
  checkValue = true,
  uncheckValue = false,
  transformError,
  className,
  ...props 
}, ref) => {
  const {
    field,
    error,
    isLoading
  } = useFieldState(name!, control);

  const errorMessage = formatFieldError(error, transformError);
  
  return (
    <div className="space-y-2">
      <Checkbox
        {...props}
        ref={ref}
        checked={field.value === checkValue}
        onCheckedChange={(checked) => {
          field.onChange(checked ? checkValue : uncheckValue);
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

RHFCheckbox.displayName = 'RHFCheckbox';

/**
 * RHF Checkbox Group - Multiple checkboxes for array values
 * Aligns with backend array validation patterns
 */
export interface RHFCheckboxGroupProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  options: Array<{
    label: string;
    value: any;
    description?: string;
    disabled?: boolean;
    icon?: React.ReactNode;
    badge?: string;
  }>;
  // Group layout options
  orientation?: 'horizontal' | 'vertical' | 'grid';
  columns?: number; // For grid layout
  spacing?: 'sm' | 'md' | 'lg';
  // Validation options
  min?: number; // Minimum selections required
  max?: number; // Maximum selections allowed
  // Display options
  variant?: 'default' | 'card' | 'compact';
  label?: string;
  description?: string;
  helper?: string;
  required?: boolean;
}

export const RHFCheckboxGroup = forwardRef<
  HTMLDivElement,
  RHFCheckboxGroupProps
>(({ 
  name, 
  control, 
  options,
  orientation = 'vertical',
  columns = 2,
  spacing = 'md',
  min,
  max,
  variant = 'default',
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

  const currentValue = Array.isArray(field.value) ? field.value : [];
  const errorMessage = formatFieldError(error, transformError);

  // Handle checkbox toggle
  const handleToggle = (optionValue: any) => {
    const newValue = currentValue.includes(optionValue)
      ? currentValue.filter((v: any) => v !== optionValue)
      : [...currentValue, optionValue];
    
    field.onChange(newValue);
  };

  // Validate selection limits
  const isMaxReached = max && currentValue.length >= max;
  const isMinRequired = min && currentValue.length < min;

  // Layout classes
  const layoutClasses = {
    horizontal: 'flex flex-wrap gap-4',
    vertical: 'space-y-3',
    grid: `grid gap-4 grid-cols-1 sm:grid-cols-${columns}`
  };

  const spacingClasses = {
    sm: orientation === 'grid' ? 'gap-2' : orientation === 'horizontal' ? 'gap-2' : 'space-y-2',
    md: orientation === 'grid' ? 'gap-4' : orientation === 'horizontal' ? 'gap-4' : 'space-y-3',
    lg: orientation === 'grid' ? 'gap-6' : orientation === 'horizontal' ? 'gap-6' : 'space-y-4'
  };

  return (
    <div className={cn('space-y-3', className)} ref={ref}>
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

      {/* Checkbox Options */}
      <div className={cn(
        layoutClasses[orientation],
        spacingClasses[spacing]
      )}>
        {options.map((option) => {
          const isChecked = currentValue.includes(option.value);
          const isDisabled = Boolean(option.disabled || isLoading || 
            (!isChecked && isMaxReached));

          if (variant === 'card') {
            return (
              <CheckboxCard
                key={String(option.value)}
                title={option.label}
                description={option.description}
                icon={option.icon}
                badge={option.badge}
                checked={isChecked}
                disabled={isDisabled}
                onCheckedChange={() => !isDisabled && handleToggle(option.value)}
              />
            );
          }

          return (
            <Checkbox
              key={String(option.value)}
              label={option.label}
              description={option.description}
              checked={isChecked}
              disabled={isDisabled}
              onCheckedChange={() => !isDisabled && handleToggle(option.value)}
              variant={variant === 'compact' ? 'secondary' : 'default'}
            />
          );
        })}
      </div>

      {/* Helper Text */}
      {helper && !errorMessage && (
        <p className="text-xs text-[var(--caption-color)] font-satoshi">
          {helper}
          {(min || max) && (
            <span className="ml-2 text-[var(--muted)]">
              ({currentValue.length}
              {min && ` / ${min} min`}
              {max && ` / ${max} max`})
            </span>
          )}
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

      {/* Selection Count Validation */}
      {isMinRequired && (
        <p className="text-sm text-[var(--warning)] flex items-center gap-1 font-satoshi">
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.19-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          Please select at least {min} option{min > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
});

RHFCheckboxGroup.displayName = 'RHFCheckboxGroup';

/**
 * RHF Toggle Checkbox - Switch-like checkbox
 */
export interface RHFToggleCheckboxProps<TFieldValues extends FieldValues = FieldValues>
  extends Omit<BaseToggleCheckboxProps, 'checked' | 'onCheckedChange' | 'name'>,
    BaseFieldProps<TFieldValues> {
  checkValue?: any;
  uncheckValue?: any;
}

export const RHFToggleCheckbox = forwardRef<
  HTMLInputElement,
  RHFToggleCheckboxProps
>(({ 
  name, 
  control, 
  checkValue = true,
  uncheckValue = false,
  transformError,
  className,
  ...props 
}, ref) => {
  const {
    field,
    error,
    isLoading
  } = useFieldState(name!, control);

  const errorMessage = formatFieldError(error, transformError);
  
  return (
    <div className="space-y-2">
      <ToggleCheckbox
        {...props}
        ref={ref}
        checked={field.value === checkValue}
        onCheckedChange={(checked) => {
          field.onChange(checked ? checkValue : uncheckValue);
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

RHFToggleCheckbox.displayName = 'RHFToggleCheckbox';

/**
 * Specialized checkbox for plans/subscriptions
 * Aligns with your backend plan validation
 */
export interface RHFPlanCheckboxProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  plans: Array<{
    id: 'foundation' | 'growth' | 'premium' | 'enterprise';
    name: string;
    price: string;
    description: string;
    features: string[];
    recommended?: boolean;
    badge?: string;
  }>;
  multiple?: boolean; // Allow multiple plan selection
}

export const RHFPlanCheckbox = forwardRef<
  HTMLDivElement,
  RHFPlanCheckboxProps
>(({ 
  name, 
  control, 
  plans,
  multiple = false,
  transformError,
  className,
  ...props 
}, ref) => {
  const {
    field,
    error,
    isLoading
  } = useFieldState(name, control);

  const currentValue = multiple ? 
    (Array.isArray(field.value) ? field.value : []) : 
    field.value;
  
  const errorMessage = formatFieldError(error, transformError);

  const handlePlanToggle = (planId: string) => {
    if (multiple) {
      const newValue = currentValue.includes(planId)
        ? currentValue.filter((id: string) => id !== planId)
        : [...currentValue, planId];
      field.onChange(newValue);
    } else {
      field.onChange(planId);
    }
  };

  return (
    <div className={cn('space-y-4', className)} ref={ref}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        {plans.map((plan) => {
          const isSelected = multiple ? 
            currentValue.includes(plan.id) : 
            currentValue === plan.id;

          return (
            <CheckboxCard
              key={plan.id}
              title={plan.name}
              description={plan.description}
              price={plan.price}
              badge={plan.badge || (plan.recommended ? 'Recommended' : undefined)}
              checked={isSelected}
              disabled={isLoading}
              highlight={plan.recommended}
              onCheckedChange={() => handlePlanToggle(plan.id)}
              className="p-6"
            />
          );
        })}
      </div>

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

RHFPlanCheckbox.displayName = 'RHFPlanCheckbox';

/**
 * Specialized checkbox for feature toggles/settings
 * Aligns with your backend settings validation
 */
export interface RHFFeatureToggleProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  features: Array<{
    id: string;
    name: string;
    description: string;
    category: 'general' | 'notifications' | 'integrations' | 'security' | 'analytics';
    enabled?: boolean;
    requiresPlan?: 'foundation' | 'growth' | 'premium' | 'enterprise';
    badge?: string;
  }>;
  groupByCategory?: boolean;
}

export const RHFFeatureToggle = forwardRef<
  HTMLDivElement,
  RHFFeatureToggleProps
>(({ 
  name, 
  control, 
  features,
  groupByCategory = true,
  transformError,
  className,
  ...props 
}, ref) => {
  const {
    field,
    error,
    isLoading
  } = useFieldState(name!, control);

  const currentValue = Array.isArray(field.value) ? field.value : [];
  const errorMessage = formatFieldError(error, transformError);

  const handleFeatureToggle = (featureId: string) => {
    const newValue = currentValue.includes(featureId)
      ? currentValue.filter((id: string) => id !== featureId)
      : [...currentValue, featureId];
    field.onChange(newValue);
  };

  const groupedFeatures = groupByCategory 
    ? features.reduce((acc, feature) => {
        if (!acc[feature.category]) {
          acc[feature.category] = [];
        }
        acc[feature.category].push(feature);
        return acc;
      }, {} as Record<string, typeof features>)
    : { all: features };

  const categoryLabels = {
    general: 'General Settings',
    notifications: 'Notifications',
    integrations: 'Integrations',
    security: 'Security',
    analytics: 'Analytics'
  };

  return (
    <div className={cn('space-y-6', className)} ref={ref}>
      {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
        <div key={category} className="space-y-4">
          {groupByCategory && (
            <h3 className="text-lg font-satoshi-bold text-[var(--heading-color)]">
              {categoryLabels[category as keyof typeof categoryLabels] || category}
            </h3>
          )}
          
          <div className="grid gap-4 md:grid-cols-2">
            {categoryFeatures.map((feature) => {
              const isEnabled = currentValue.includes(feature.id);

              return (
                <CheckboxCard
                  key={feature.id}
                  title={feature.name}
                  description={feature.description}
                  badge={feature.badge || (feature.requiresPlan ? `Requires ${feature.requiresPlan}` : undefined)}
                  checked={isEnabled}
                  disabled={isLoading}
                  onCheckedChange={() => handleFeatureToggle(feature.id)}
                  className="p-4"
                />
              );
            })}
          </div>
        </div>
      ))}

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

RHFFeatureToggle.displayName = 'RHFFeatureToggle';

/**
 * Specialized checkbox for notification preferences
 * Aligns with your backend notification settings
 */
export interface RHFNotificationPreferencesProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  preferences: Array<{
    id: string;
    name: string;
    description: string;
    type: 'email' | 'push' | 'sms' | 'in_app';
    category: 'voting' | 'certificates' | 'orders' | 'security' | 'marketing';
    defaultEnabled?: boolean;
  }>;
  showCategoryHeaders?: boolean;
}

export const RHFNotificationPreferences = forwardRef<
  HTMLDivElement,
  RHFNotificationPreferencesProps
>(({ 
  name, 
  control, 
  preferences,
  showCategoryHeaders = true,
  transformError,
  className,
  ...props 
}, ref) => {
  const {
    field,
    error,
    isLoading
  } = useFieldState(name!, control);

  const currentValue = Array.isArray(field.value) ? field.value : [];
  const errorMessage = formatFieldError(error, transformError);

  const handlePreferenceToggle = (preferenceId: string) => {
    const newValue = currentValue.includes(preferenceId)
      ? currentValue.filter((id: string) => id !== preferenceId)
      : [...currentValue, preferenceId];
    field.onChange(newValue);
  };

  const groupedPreferences = preferences.reduce((acc, preference) => {
    if (!acc[preference.category]) {
      acc[preference.category] = [];
    }
    acc[preference.category].push(preference);
    return acc;
  }, {} as Record<string, typeof preferences>);

  const categoryLabels = {
    voting: 'Voting Updates',
    certificates: 'Certificate Notifications',
    orders: 'Order Updates',
    security: 'Security Alerts',
    marketing: 'Marketing Communications'
  };

  const typeIcons = {
    email: '📧',
    push: '🔔',
    sms: '📱',
    in_app: '💬'
  };

  return (
    <div className={cn('space-y-6', className)} ref={ref}>
      {Object.entries(groupedPreferences).map(([category, categoryPreferences]) => (
        <div key={category} className="space-y-4">
          {showCategoryHeaders && (
            <h3 className="text-lg font-satoshi-bold text-[var(--heading-color)]">
              {categoryLabels[category as keyof typeof categoryLabels] || category}
            </h3>
          )}
          
          <div className="space-y-3">
            {categoryPreferences.map((preference) => {
              const isEnabled = currentValue.includes(preference.id);

              return (
                <div key={preference.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{typeIcons[preference.type]}</span>
                    <div>
                      <h4 className="font-satoshi-medium text-[var(--heading-color)]">
                        {preference.name}
                      </h4>
                      <p className="text-sm text-[var(--caption-color)]">
                        {preference.description}
                      </p>
                    </div>
                  </div>
                  
                  <ToggleCheckbox
                    checked={isEnabled}
                    disabled={isLoading}
                    onCheckedChange={() => handlePreferenceToggle(preference.id)}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}

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

RHFNotificationPreferences.displayName = 'RHFNotificationPreferences';

/**
 * Specialized checkbox for integration selection
 * Aligns with your backend integration configuration
 */
export interface RHFIntegrationSelectorProps<TFieldValues extends FieldValues = FieldValues>
  extends BaseFieldProps<TFieldValues> {
  integrations: Array<{
    id: string;
    name: string;
    description: string;
    type: 'shopify' | 'woocommerce' | 'wix' | 'api' | 'csv';
    icon?: React.ReactNode;
    status?: 'available' | 'connected' | 'error' | 'pending';
    requiresSetup?: boolean;
  }>;
  allowMultiple?: boolean;
  showStatus?: boolean;
}

export const RHFIntegrationSelector = forwardRef<
  HTMLDivElement,
  RHFIntegrationSelectorProps
>(({ 
  name, 
  control, 
  integrations,
  allowMultiple = false,
  showStatus = true,
  transformError,
  className,
  ...props 
}, ref) => {
  const {
    field,
    error,
    isLoading
  } = useFieldState(name!, control);

  const currentValue = allowMultiple 
    ? (Array.isArray(field.value) ? field.value : [])
    : field.value;
  
  const errorMessage = formatFieldError(error, transformError);

  const handleIntegrationToggle = (integrationId: string) => {
    if (allowMultiple) {
      const newValue = currentValue.includes(integrationId)
        ? currentValue.filter((id: string) => id !== integrationId)
        : [...currentValue, integrationId];
      field.onChange(newValue);
    } else {
      field.onChange(integrationId);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'connected': return 'Connected';
      case 'error': return 'Error';
      case 'pending': return 'Pending';
      default: return 'Available';
    }
  };

  return (
    <div className={cn('space-y-4', className)} ref={ref}>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => {
          const isSelected = allowMultiple 
            ? currentValue.includes(integration.id)
            : currentValue === integration.id;

          return (
            <CheckboxCard
              key={integration.id}
              title={integration.name}
              description={integration.description}
              icon={integration.icon}
              badge={showStatus ? getStatusLabel(integration.status) : undefined}
              checked={isSelected}
              disabled={isLoading || integration.requiresSetup}
              onCheckedChange={() => !integration.requiresSetup && handleIntegrationToggle(integration.id)}
              className={cn(
                "p-6 transition-all",
                integration.status === 'connected' && "border-green-200 bg-green-50",
                integration.status === 'error' && "border-red-200 bg-red-50",
                integration.status === 'pending' && "border-yellow-200 bg-yellow-50"
              )}
            />
          );
        })}
      </div>

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

RHFIntegrationSelector.displayName = 'RHFIntegrationSelector';