// src/components/forms/patterns/profile-form.tsx
'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn } from '@/lib/utils/utils';
import { Input } from '@/components/ui/primitives/input';
import { Textarea } from '@/components/ui/primitives/textarea';
import { Select } from '@/components/ui/primitives/select';
import { Button } from '@/components/ui/primitives/button';
import { Checkbox } from '@/components/ui/primitives/checkbox';
import { UserCircleIcon, CameraIcon } from '@heroicons/react/24/outline';

// Validation schema aligned with backend user profile validation
const profileSchema = z.object({
  // Personal Information
  firstName: z.string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name cannot exceed 50 characters'),
  lastName: z.string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name cannot exceed 50 characters'),
  email: z.string()
    .email('Please enter a valid email address'),
  phone: z.string()
    .regex(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number')
    .min(10, 'Phone number must be at least 10 digits')
    .optional()
    .or(z.literal('')),
  
  // Professional Information
  jobTitle: z.string()
    .max(100, 'Job title cannot exceed 100 characters')
    .optional(),
  company: z.string()
    .max(100, 'Company name cannot exceed 100 characters')
    .optional(),
  industry: z.string().optional(),
  
  // Location
  country: z.string().optional(),
  timezone: z.string().optional(),
  
  // Bio and Preferences
  bio: z.string()
    .max(500, 'Bio cannot exceed 500 characters')
    .optional(),
  website: z.string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  
  // Communication Preferences
  emailNotifications: z.boolean(),
  marketingEmails: z.boolean(),
  weeklyDigest: z.boolean(),
  
  // Privacy Settings
  profileVisibility: z.enum(['public', 'private', 'contacts']),
  showEmail: z.boolean(),
  showPhone: z.boolean()
});

type ProfileFormData = z.infer<typeof profileSchema>;

const industryOptions = [
  { value: 'technology', label: 'Technology' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'finance', label: 'Finance' },
  { value: 'education', label: 'Education' },
  { value: 'retail', label: 'Retail' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'media', label: 'Media & Entertainment' },
  { value: 'nonprofit', label: 'Non-profit' },
  { value: 'government', label: 'Government' },
  { value: 'other', label: 'Other' }
];

const countryOptions = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'AU', label: 'Australia' },
  { value: 'JP', label: 'Japan' },
  { value: 'other', label: 'Other' },
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

const visibilityOptions = [
  { value: 'public', label: 'Public', description: 'Anyone can view your profile' },
  { value: 'contacts', label: 'Contacts Only', description: 'Only your contacts can view your profile' },
  { value: 'private', label: 'Private', description: 'Your profile is hidden from others' }
];

export interface ProfileFormProps {
  initialData?: Partial<ProfileFormData>;
  onSubmit?: (data: ProfileFormData) => Promise<void>;
  onCancel?: () => void;
  onAvatarChange?: (file: File) => Promise<void>;
  avatarUrl?: string;
  isLoading?: boolean;
  className?: string;
  showAvatar?: boolean;
  showPrivacySettings?: boolean;
}

export const ProfileForm: React.FC<ProfileFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  onAvatarChange,
  avatarUrl,
  isLoading = false,
  className,
  showAvatar = true,
  showPrivacySettings = true
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      emailNotifications: true,
      marketingEmails: false,
      weeklyDigest: true,
      profileVisibility: 'public',
      showEmail: false,
      showPhone: false,
      ...initialData
    }
  });

  const { register, handleSubmit, formState: { errors }, watch, setValue } = form;

  const handleFormSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit(data);
      }
      setIsDirty(false);
    } catch (error) {
      console.error('Profile form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onAvatarChange) {
      try {
        await onAvatarChange(file);
      } catch (error) {
        console.error('Avatar upload error:', error);
      }
    }
  };

  // Watch for form changes to enable save button
  React.useEffect(() => {
    const subscription = watch(() => {
      setIsDirty(true);
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  const bioLength = watch('bio')?.length || 0;

  return (
    <div className={cn("space-y-8", className)}>
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
        {/* Avatar Section */}
        {showAvatar && (
          <div className="flex items-center space-x-6">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="w-20 h-20 rounded-full object-cover border-2 border-[var(--border)]"
                />
              ) : (
                <UserCircleIcon className="w-20 h-20 text-[var(--muted)]" />
              )}
              
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 bg-[var(--primary)] text-white p-2 rounded-full cursor-pointer hover:bg-[var(--primary-dark)] transition-colors"
              >
                <CameraIcon className="w-4 h-4" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </label>
            </div>
            
            <div>
              <h3 className="font-satoshi-bold text-[var(--heading-color)]">Profile Photo</h3>
              <p className="text-sm text-[var(--caption-color)]">
                Upload a photo to personalize your profile. JPG, PNG or GIF (max 5MB).
              </p>
            </div>
          </div>
        )}

        {/* Personal Information */}
        <div className="space-y-6">
          <h3 className="text-lg font-satoshi-bold text-[var(--heading-color)] border-b border-[var(--border)] pb-2">
            Personal Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="First Name"
              placeholder="Enter your first name"
              error={errors.firstName?.message}
              required
              {...register('firstName')}
            />
            
            <Input
              label="Last Name"
              placeholder="Enter your last name"
              error={errors.lastName?.message}
              required
              {...register('lastName')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              type="email"
              label="Email Address"
              placeholder="your@email.com"
              error={errors.email?.message}
              required
              {...register('email')}
            />
            
            <Input
              type="tel"
              label="Phone Number"
              placeholder="+1 (555) 000-0000"
              error={errors.phone?.message}
              {...register('phone')}
            />
          </div>
        </div>

        {/* Professional Information */}
        <div className="space-y-6">
          <h3 className="text-lg font-satoshi-bold text-[var(--heading-color)] border-b border-[var(--border)] pb-2">
            Professional Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              label="Job Title"
              placeholder="Your role or position"
              error={errors.jobTitle?.message}
              {...register('jobTitle')}
            />
            
            <Input
              label="Company"
              placeholder="Company or organization"
              error={errors.company?.message}
              {...register('company')}
            />
          </div>

          <Select
            label="Industry"
            placeholder="Select your industry"
            options={industryOptions}
            error={errors.industry?.message}
            onValueChange={(value) => setValue('industry', Array.isArray(value) ? value[0] : value)}
          />
        </div>

        {/* Location & Settings */}
        <div className="space-y-6">
          <h3 className="text-lg font-satoshi-bold text-[var(--heading-color)] border-b border-[var(--border)] pb-2">
            Location & Preferences
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Country"
              placeholder="Select your country"
              options={countryOptions}
              error={errors.country?.message}
              onValueChange={(value) => setValue('country', Array.isArray(value) ? value[0] : value)}
            />
            
            <Select
              label="Timezone"
              placeholder="Select your timezone"
              options={timezoneOptions}
              error={errors.timezone?.message}
              onValueChange={(value) => setValue('timezone', Array.isArray(value) ? value[0] : value)}
            />
          </div>

          <Input
            type="url"
            label="Website"
            placeholder="https://yourwebsite.com"
            error={errors.website?.message}
            {...register('website')}
          />

          <div className="space-y-2">
            <Textarea
              label="Bio"
              placeholder="Tell us a bit about yourself..."
              rows={4}
              maxLength={500}
              error={errors.bio?.message}
              {...register('bio')}
            />
            <div className="text-right text-xs text-[var(--caption-color)]">
              {bioLength}/500
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="space-y-6">
          <h3 className="text-lg font-satoshi-bold text-[var(--heading-color)] border-b border-[var(--border)] pb-2">
            Notification Preferences
          </h3>
          
          <div className="space-y-4">
            <Checkbox
              label="Email Notifications"
              description="Receive important updates and notifications via email"
              {...register('emailNotifications')}
            />
            
            <Checkbox
              label="Marketing Emails"
              description="Receive occasional emails about new features and updates"
              {...register('marketingEmails')}
            />
            
            <Checkbox
              label="Weekly Digest"
              description="Get a weekly summary of your activity and insights"
              {...register('weeklyDigest')}
            />
          </div>
        </div>

        {/* Privacy Settings */}
        {showPrivacySettings && (
          <div className="space-y-6">
            <h3 className="text-lg font-satoshi-bold text-[var(--heading-color)] border-b border-[var(--border)] pb-2">
              Privacy Settings
            </h3>
            
            <Select
              label="Profile Visibility"
              placeholder="Select visibility level"
              options={visibilityOptions}
              error={errors.profileVisibility?.message}
              onValueChange={(value) => setValue('profileVisibility', value as any)}
            />

            <div className="space-y-4">
              <Checkbox
                label="Show Email Address"
                description="Display your email address on your public profile"
                {...register('showEmail')}
              />
              
              <Checkbox
                label="Show Phone Number"
                description="Display your phone number on your public profile"
                {...register('showPhone')}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-[var(--border)]">
          <div className="text-sm text-[var(--caption-color)]">
            {isDirty && 'You have unsaved changes'}
          </div>
          
          <div className="flex items-center space-x-3">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting || isLoading || !isDirty}
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="loading-spinner w-4 h-4" />
                  <span>Saving...</span>
                </div>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};