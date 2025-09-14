// src/components/forms/patterns/settings-form.tsx
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/primitives/input';
import { Select } from '@/components/ui/primitives/select';
import { Button } from '@/components/ui/primitives/button';
import { Checkbox } from '@/components/ui/primitives/checkbox';
import { ToggleCheckbox } from '@/components/ui/primitives/checkbox';
import { Slider } from '@/components/ui/primitives/slider';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/primitives/card';
import { 
  CogIcon, 
  BellIcon, 
  ShieldCheckIcon, 
  PaintBrushIcon,
  GlobeAltIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

// Validation schema for application settings
const settingsSchema = z.object({
  // General Settings
  language: z.string(),
  timezone: z.string(),
  dateFormat: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']),
  timeFormat: z.enum(['12', '24']),
  
  // Theme & Appearance
  theme: z.enum(['light', 'dark', 'auto']),
  accentColor: z.string(),
  fontSize: z.number().min(12).max(20),
  compactMode: z.boolean(),
  animations: z.boolean(),
  
  // Notifications
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
  desktopNotifications: z.boolean(),
  notificationSound: z.boolean(),
  quietHours: z.object({
    enabled: z.boolean(),
    startTime: z.string(),
    endTime: z.string()
  }),
  
  // Privacy & Security
  profileVisibility: z.enum(['public', 'private', 'contacts']),
  showOnlineStatus: z.boolean(),
  allowAnalytics: z.boolean(),
  twoFactorEnabled: z.boolean(),
  sessionTimeout: z.number().min(15).max(480), // minutes
  
  // Data & Storage
  autoSave: z.boolean(),
  autoSaveInterval: z.number().min(1).max(60), // minutes
  dataRetention: z.number().min(30).max(365), // days
  exportFormat: z.enum(['json', 'csv', 'xlsx']),
  
  // Advanced Settings
  debugMode: z.boolean(),
  betaFeatures: z.boolean(),
  apiRateLimit: z.number().min(100).max(10000),
  maxFileSize: z.number().min(1).max(100) // MB
});

type SettingsFormData = z.infer<typeof settingsSchema>;

const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Español' },
  { value: 'fr', label: 'Français' },
  { value: 'de', label: 'Deutsch' },
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' }
];

const timezoneOptions = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'Greenwich Mean Time (GMT)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Asia/Tokyo', label: 'Japan Standard Time (JST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time (AET)' }
];

const themeOptions = [
  { value: 'light', label: 'Light', description: 'Always use light theme' },
  { value: 'dark', label: 'Dark', description: 'Always use dark theme' },
  { value: 'auto', label: 'System', description: 'Follow system preference' }
];

const accentColors = [
  { value: '#FF6900', label: 'Orange', color: '#FF6900' },
  { value: '#2563EB', label: 'Blue', color: '#2563EB' },
  { value: '#059669', label: 'Green', color: '#059669' },
  { value: '#DC2626', label: 'Red', color: '#DC2626' },
  { value: '#7C3AED', label: 'Purple', color: '#7C3AED' },
  { value: '#DB2777', label: 'Pink', color: '#DB2777' }
];

export interface SettingsFormProps {
  initialData?: Partial<SettingsFormData>;
  onSubmit?: (data: SettingsFormData) => Promise<void>;
  onReset?: () => Promise<void>;
  onExportData?: () => Promise<void>;
  className?: string;
  sections?: string[];
}

export const SettingsForm: React.FC<SettingsFormProps> = ({
  initialData,
  onSubmit,
  onReset,
  onExportData,
  className,
  sections = ['general', 'appearance', 'notifications', 'privacy', 'data', 'advanced']
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [activeSection, setActiveSection] = useState(sections[0]);

  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      language: 'en',
      timezone: 'America/New_York',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12',
      theme: 'auto',
      accentColor: '#FF6900',
      fontSize: 16,
      compactMode: false,
      animations: true,
      emailNotifications: true,
      pushNotifications: true,
      desktopNotifications: false,
      notificationSound: true,
      quietHours: { enabled: false, startTime: '22:00', endTime: '08:00' },
      profileVisibility: 'public',
      showOnlineStatus: true,
      allowAnalytics: true,
      twoFactorEnabled: false,
      sessionTimeout: 60,
      autoSave: true,
      autoSaveInterval: 5,
      dataRetention: 90,
      exportFormat: 'csv',
      debugMode: false,
      betaFeatures: false,
      apiRateLimit: 1000,
      maxFileSize: 10,
      ...initialData
    }
  });

  const { register, handleSubmit, formState: { errors }, watch, setValue } = form;

  const handleFormSubmit = async (data: SettingsFormData) => {
    setIsSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit(data);
      }
      setIsDirty(false);
    } catch (error) {
      console.error('Settings form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async () => {
    if (onReset) {
      await onReset();
      form.reset();
      setIsDirty(false);
    }
  };

  // Watch for form changes
  React.useEffect(() => {
    const subscription = watch(() => {
      setIsDirty(true);
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const fontSize = watch('fontSize');
  const sessionTimeout = watch('sessionTimeout');
  const autoSaveInterval = watch('autoSaveInterval');
  const quietHoursEnabled = watch('quietHours.enabled');

  const sectionConfig = {
    general: {
      title: 'General',
      icon: <CogIcon className="w-5 h-5" />,
      description: 'Language, timezone, and format preferences'
    },
    appearance: {
      title: 'Appearance',
      icon: <PaintBrushIcon className="w-5 h-5" />,
      description: 'Theme, colors, and visual settings'
    },
    notifications: {
      title: 'Notifications',
      icon: <BellIcon className="w-5 h-5" />,
      description: 'Email, push, and sound notifications'
    },
    privacy: {
      title: 'Privacy & Security',
      icon: <ShieldCheckIcon className="w-5 h-5" />,
      description: 'Profile visibility and security settings'
    },
    data: {
      title: 'Data & Storage',
      icon: <GlobeAltIcon className="w-5 h-5" />,
      description: 'Auto-save, retention, and export settings'
    },
    advanced: {
      title: 'Advanced',
      icon: <ExclamationTriangleIcon className="w-5 h-5" />,
      description: 'Developer and experimental features'
    }
  };

  return (
    <div className={cn("space-y-8", className)}>
      {/* Section Navigation */}
      <div className="flex space-x-1 bg-[var(--background-secondary)] p-1 rounded-xl">
        {sections.map((section) => (
          <button
            key={section}
            type="button"
            onClick={() => setActiveSection(section)}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-lg font-satoshi-medium text-sm transition-all",
              activeSection === section
                ? "bg-white shadow-sm text-[var(--primary)]"
                : "text-[var(--caption-color)] hover:text-[var(--heading-color)]"
            )}
          >
            {sectionConfig[section as keyof typeof sectionConfig]?.icon}
            <span>{sectionConfig[section as keyof typeof sectionConfig]?.title}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
        {/* General Settings */}
        {activeSection === 'general' && (
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <p className="text-sm text-[var(--caption-color)]">
                Configure your language, timezone, and format preferences.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  label="Language"
                  options={languageOptions}
                  error={errors.language?.message}
                  onValueChange={(value) => setValue('language', Array.isArray(value) ? value[0] : value)}
                />
                
                <Select
                  label="Timezone"
                  options={timezoneOptions}
                  error={errors.timezone?.message}
                  onValueChange={(value) => setValue('timezone', Array.isArray(value) ? value[0] : value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Select
                  label="Date Format"
                  options={[
                    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (US)' },
                    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (EU)' },
                    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' }
                  ]}
                  error={errors.dateFormat?.message}
                  onValueChange={(value) => setValue('dateFormat', value as any)}
                />
                
                <Select
                  label="Time Format"
                  options={[
                    { value: '12', label: '12-hour (AM/PM)' },
                    { value: '24', label: '24-hour' }
                  ]}
                  error={errors.timeFormat?.message}
                  onValueChange={(value) => setValue('timeFormat', value as any)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Appearance Settings */}
        {activeSection === 'appearance' && (
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <p className="text-sm text-[var(--caption-color)]">
                Customize the look and feel of your interface.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <Select
                label="Theme"
                options={themeOptions}
                error={errors.theme?.message}
                onValueChange={(value) => setValue('theme', value as any)}
              />

              <div className="space-y-3">
                <label className="text-sm font-satoshi-medium text-[var(--heading-color)]">
                  Accent Color
                </label>
                <div className="grid grid-cols-6 gap-3">
                  {accentColors.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setValue('accentColor', color.value)}
                      className={cn(
                        "w-10 h-10 rounded-lg border-2 transition-all",
                        watch('accentColor') === color.value
                          ? "border-[var(--heading-color)] scale-110"
                          : "border-[var(--border)] hover:scale-105"
                      )}
                      style={{ backgroundColor: color.color }}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Slider
                  label="Font Size"
                  min={12}
                  max={20}
                  step={1}
                  value={fontSize}
                  showValue
                  formatValue={(value) => `${value}px`}
                  onValueChange={(value) => setValue('fontSize', value)}
                />
              </div>

              <div className="space-y-4">
                <ToggleCheckbox
                  label="Compact Mode"
                  onText="Enabled"
                  offText="Disabled"
                  {...register('compactMode')}
                />
                
                <ToggleCheckbox
                  label="Animations"
                  onText="Enabled"
                  offText="Disabled"
                  {...register('animations')}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notification Settings */}
        {activeSection === 'notifications' && (
          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <p className="text-sm text-[var(--caption-color)]">
                Manage how and when you receive notifications.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <ToggleCheckbox
                  label="Email Notifications"
                  onText="Enabled"
                  offText="Disabled"
                  {...register('emailNotifications')}
                />
                
                <ToggleCheckbox
                  label="Push Notifications"
                  onText="Enabled"
                  offText="Disabled"
                  {...register('pushNotifications')}
                />
                
                <ToggleCheckbox
                  label="Desktop Notifications"
                  onText="Enabled"
                  offText="Disabled"
                  {...register('desktopNotifications')}
                />
                
                <ToggleCheckbox
                  label="Notification Sound"
                  onText="Enabled"
                  offText="Disabled"
                  {...register('notificationSound')}
                />
              </div>

              <div className="space-y-4 p-4 bg-[var(--background-secondary)] rounded-xl">
                <ToggleCheckbox
                  label="Quiet Hours"
                  onText="Enabled"
                  offText="Disabled"
                  {...register('quietHours.enabled')}
                />
                
                {quietHoursEnabled && (
                  <div className="grid grid-cols-2 gap-4 pl-8">
                    <Input
                      type="time"
                      label="Start Time"
                      {...register('quietHours.startTime')}
                    />
                    <Input
                      type="time"
                      label="End Time"
                      {...register('quietHours.endTime')}
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Privacy & Security Settings */}
        {activeSection === 'privacy' && (
          <Card>
            <CardHeader>
              <CardTitle>Privacy & Security</CardTitle>
              <p className="text-sm text-[var(--caption-color)]">
                Control your profile visibility and security preferences.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <Select
                label="Profile Visibility"
                options={[
                  { value: 'public', label: 'Public', description: 'Visible to everyone' },
                  { value: 'contacts', label: 'Contacts Only', description: 'Only your contacts' },
                  { value: 'private', label: 'Private', description: 'Hidden from others' }
                ]}
                error={errors.profileVisibility?.message}
                onValueChange={(value) => setValue('profileVisibility', value as any)}
              />

              <div className="space-y-4">
                <ToggleCheckbox
                  label="Show Online Status"
                  onText="Visible"
                  offText="Hidden"
                  {...register('showOnlineStatus')}
                />
                
                <ToggleCheckbox
                  label="Allow Analytics"
                  onText="Enabled"
                  offText="Disabled"
                  {...register('allowAnalytics')}
                />
                
                <ToggleCheckbox
                  label="Two-Factor Authentication"
                  onText="Enabled"
                  offText="Disabled"
                  {...register('twoFactorEnabled')}
                />
              </div>

              <Slider
                label="Session Timeout"
                min={15}
                max={480}
                step={15}
                value={sessionTimeout}
                showValue
                formatValue={(value) => `${value} minutes`}
                onValueChange={(value) => setValue('sessionTimeout', value)}
              />
            </CardContent>
          </Card>
        )}

        {/* Data & Storage Settings */}
        {activeSection === 'data' && (
          <Card>
            <CardHeader>
              <CardTitle>Data & Storage</CardTitle>
              <p className="text-sm text-[var(--caption-color)]">
                Configure auto-save, data retention, and export preferences.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <ToggleCheckbox
                label="Auto-Save"
                onText="Enabled"
                offText="Disabled"
                {...register('autoSave')}
              />

              <Slider
                label="Auto-Save Interval"
                min={1}
                max={60}
                step={1}
                value={autoSaveInterval}
                showValue
                formatValue={(value) => `${value} minute${value !== 1 ? 's' : ''}`}
                onValueChange={(value) => setValue('autoSaveInterval', value)}
              />

              <Slider
                label="Data Retention"
                min={30}
                max={365}
                step={30}
                value={watch('dataRetention')}
                showValue
                formatValue={(value) => `${value} days`}
                onValueChange={(value) => setValue('dataRetention', value)}
              />

              <Select
                label="Export Format"
                options={[
                  { value: 'json', label: 'JSON', description: 'JavaScript Object Notation' },
                  { value: 'csv', label: 'CSV', description: 'Comma Separated Values' },
                  { value: 'xlsx', label: 'Excel', description: 'Microsoft Excel format' }
                ]}
                error={errors.exportFormat?.message}
                onValueChange={(value) => setValue('exportFormat', value as any)}
              />

              {onExportData && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onExportData}
                  className="w-full"
                >
                  Export My Data
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Advanced Settings */}
        {activeSection === 'advanced' && (
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <p className="text-sm text-[var(--caption-color)]">
                Developer tools and experimental features. Use with caution.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <ToggleCheckbox
                  label="Debug Mode"
                  onText="Enabled"
                  offText="Disabled"
                  {...register('debugMode')}
                />
                
                <ToggleCheckbox
                  label="Beta Features"
                  onText="Enabled"
                  offText="Disabled"
                  {...register('betaFeatures')}
                />
              </div>

              <Slider
                label="API Rate Limit"
                min={100}
                max={10000}
                step={100}
                value={watch('apiRateLimit')}
                showValue
                formatValue={(value) => `${value} requests/hour`}
                onValueChange={(value) => setValue('apiRateLimit', value)}
              />

              <Slider
                label="Max File Size"
                min={1}
                max={100}
                step={1}
                value={watch('maxFileSize')}
                showValue
                formatValue={(value) => `${value} MB`}
                onValueChange={(value) => setValue('maxFileSize', value)}
              />

              <div className="p-4 bg-[var(--warning)]/10 border border-[var(--warning)]/20 rounded-xl">
                <div className="flex items-start space-x-2">
                  <ExclamationTriangleIcon className="w-5 h-5 text-[var(--warning)] mt-0.5" />
                  <div>
                    <h4 className="font-satoshi-medium text-[var(--warning)]">Danger Zone</h4>
                    <p className="text-sm text-[var(--caption-color)] mt-1">
                      These settings can affect application performance and stability.
                    </p>
                    {onReset && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleReset}
                        className="mt-3 border-[var(--warning)] text-[var(--warning)] hover:bg-[var(--warning)]/10"
                      >
                        Reset All Settings
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-[var(--border)]">
          <div className="text-sm text-[var(--caption-color)]">
            {isDirty && 'You have unsaved changes'}
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => form.reset()}
              disabled={isSubmitting || !isDirty}
            >
              Reset
            </Button>
            
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || !isDirty}
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="loading-spinner w-4 h-4" />
                  <span>Saving...</span>
                </div>
              ) : (
                'Save Settings'
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};