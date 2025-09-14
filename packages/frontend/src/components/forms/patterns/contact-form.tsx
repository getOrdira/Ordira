// src/components/forms/patterns/contact-form.tsx
'use client';

import React, { useState } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/primitives/input';
import { Textarea } from '@/components/ui/primitives/textarea';
import { Select } from '@/components/ui/primitives/select';
import { Button } from '@/components/ui/primitives/button';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

// Validation schema aligned with backend patterns
const contactSchema = z.object({
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  email: z.string()
    .email('Please enter a valid email address'),
  subject: z.string()
    .min(5, 'Subject must be at least 5 characters')
    .max(200, 'Subject cannot exceed 200 characters'),
  category: z.enum(['general', 'support', 'billing', 'feedback', 'partnership', 'other']),
  message: z.string()
    .min(10, 'Message must be at least 10 characters')
    .max(2000, 'Message cannot exceed 2000 characters'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  attachments: z.array(z.string()).optional()
});

type ContactFormData = z.infer<typeof contactSchema>;

const categoryOptions = [
  { value: 'general', label: 'General Inquiry' },
  { value: 'support', label: 'Technical Support' },
  { value: 'billing', label: 'Billing & Payments' },
  { value: 'feedback', label: 'Product Feedback' },
  { value: 'partnership', label: 'Partnership Opportunities' },
  { value: 'other', label: 'Other' }
];

const priorityOptions = [
  { value: 'low', label: 'Low', description: 'General inquiry, no urgency' },
  { value: 'medium', label: 'Medium', description: 'Standard request' },
  { value: 'high', label: 'High', description: 'Important issue requiring attention' },
  { value: 'urgent', label: 'Urgent', description: 'Critical issue affecting operations' }
];

export interface ContactFormProps {
  onSubmit?: (data: ContactFormData) => Promise<void> | SubmitHandler<ContactFormData>;
  onCancel?: () => void;
  defaultValues?: Partial<ContactFormData>;
  showPriority?: boolean;
  className?: string;
  variant?: 'default' | 'embedded' | 'modal';
}

export const ContactForm: React.FC<ContactFormProps> = ({
  onSubmit,
  onCancel,
  defaultValues,
  showPriority = false,
  className,
  variant = 'default'
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      priority: 'medium',
      category: 'general',
      ...defaultValues
    }
  });

  const { register, handleSubmit, formState: { errors }, watch, reset } = form;

  const handleFormSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit(data);
      }
      setIsSuccess(true);
      if (variant !== 'modal') {
        // Reset form after success for non-modal variants
        setTimeout(() => {
          reset();
          setIsSuccess(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Contact form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const messageLength = watch('message')?.length || 0;
  const isModalVariant = variant === 'modal';

  if (isSuccess && isModalVariant) {
    return (
      <div className={cn("text-center space-y-4 py-8", className)}>
        <div className="flex justify-center">
          <CheckCircleIcon className="w-16 h-16 text-[var(--success)]" />
        </div>
        <h3 className="text-lg font-satoshi-bold text-[var(--heading-color)]">
          Message Sent!
        </h3>
        <p className="text-[var(--caption-color)] max-w-md mx-auto">
          Thank you for contacting us. We'll get back to you within 24 hours.
        </p>
        <Button onClick={onCancel} variant="outline">
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(
      "space-y-6",
      variant === 'embedded' && "bg-[var(--background-secondary)] p-6 rounded-xl",
      className
    )}>
      {/* Header */}
      {variant !== 'embedded' && (
        <div className="space-y-2">
          <h2 className="text-xl font-satoshi-bold text-[var(--heading-color)]">
            Contact Us
          </h2>
          <p className="text-[var(--caption-color)]">
            We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>
      )}

      {/* Success Message for non-modal variants */}
      {isSuccess && !isModalVariant && (
        <div className="bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-xl p-4">
          <div className="flex items-center space-x-2 text-[var(--success)]">
            <CheckCircleIcon className="w-5 h-5" />
            <span className="font-satoshi-medium">Message sent successfully!</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Personal Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Full Name"
            placeholder="Enter your full name"
            error={errors.name?.message}
            required
            {...register('name')}
          />
          
          <Input
            type="email"
            label="Email Address"
            placeholder="your@email.com"
            error={errors.email?.message}
            required
            {...register('email')}
          />
        </div>

        {/* Subject and Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input
            label="Subject"
            placeholder="Brief description of your inquiry"
            error={errors.subject?.message}
            required
            {...register('subject')}
          />
          
          <Select
            label="Category"
            placeholder="Select a category"
            options={categoryOptions}
            error={errors.category?.message}
            required
            onValueChange={(value) => form.setValue('category', value as any)}
          />
        </div>

        {/* Priority (conditional) */}
        {showPriority && (
          <Select
            label="Priority Level"
            placeholder="Select priority"
            options={priorityOptions}
            error={errors.priority?.message}
            onValueChange={(value) => form.setValue('priority', value as any)}
          />
        )}

        {/* Message */}
        <div className="space-y-2">
          <Textarea
            label="Message"
            placeholder="Please provide as much detail as possible..."
            rows={6}
            maxLength={2000}
            error={errors.message?.message}
            required
            {...register('message')}
          />
          <div className="flex justify-between text-xs text-[var(--caption-color)]">
            <span>Minimum 10 characters</span>
            <span className={cn(
              messageLength > 1800 ? 'text-[var(--warning)]' : '',
              messageLength >= 2000 ? 'text-[var(--error)]' : ''
            )}>
              {messageLength}/2000
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4">
          <div className="text-sm text-[var(--caption-color)]">
            We typically respond within 24 hours
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
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <div className="loading-spinner w-4 h-4" />
                  <span>Sending...</span>
                </div>
              ) : (
                'Send Message'
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};