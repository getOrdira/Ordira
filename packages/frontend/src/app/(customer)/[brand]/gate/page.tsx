// src/app/(customer)/[brand]/gate/page.tsx
'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// UI Components
import { Container } from '@/components/ui/layout/container';
import { Card } from '@/components/ui/primitives/card';
import { Button } from '@/components/ui/primitives/button';
import { TextField } from '@/components/forms/inputs/text-field';
import { Alert } from '@/components/ui/feedback/alert';
import { LoadingSpinner } from '@/components/ui/feedback/loading-spinner';

// Icons
import { 
  EnvelopeIcon,
  ShieldCheckIcon,
  ArrowRightIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

/**
 * Brand-specific email gating page
 * 
 * This page handles:
 * - Email gating for the specific brand
 * - Customer registration with email
 * - Brand-specific messaging and theming
 * - Email verification and voting access
 */

// Form validation schema
const emailGateSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  agreeToTerms: z.boolean().refine(val => val === true, 'You must agree to the terms'),
});

type EmailGateFormData = z.infer<typeof emailGateSchema>;

export default function BrandGatePage() {
  const params = useParams();
  const brandSlug = params.brand as string;
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<EmailGateFormData>({
    resolver: zodResolver(emailGateSchema),
    defaultValues: {
      email: '',
      agreeToTerms: false,
    },
  });

  const handleSubmit = async (data: EmailGateFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // This would call your API to:
      // 1. Check if email is in brand's allowlist
      // 2. Send verification email
      // 3. Create customer record for this brand
      
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate success
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to process your request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <Container size="md" className="py-12">
        <Card className="p-8 text-center">
          <div className="w-16 h-16 bg-[var(--success)]/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircleIcon className="w-8 h-8 text-[var(--success)]" />
          </div>
          
          <h1 className="text-2xl font-satoshi-bold text-[var(--heading-color)] mb-4">
            Check Your Email
          </h1>
          
          <p className="text-[var(--body-color)] font-satoshi mb-6 max-w-md mx-auto">
            We've sent a verification link to your email address. 
            Click the link to access {brandSlug}'s voting platform.
          </p>
          
          <div className="bg-[var(--background-secondary)] rounded-lg p-4 mb-6">
            <p className="text-sm text-[var(--muted)] font-satoshi">
              <strong>Next steps:</strong>
            </p>
            <ul className="text-sm text-[var(--body-color)] font-satoshi mt-2 space-y-1">
              <li>• Check your email inbox (and spam folder)</li>
              <li>• Click the verification link</li>
              <li>• Start voting on {brandSlug}'s proposals</li>
              <li>• Earn certificates for your participation</li>
            </ul>
          </div>
          
          <Button 
            variant="outline" 
            onClick={() => setIsSubmitted(false)}
            className="w-full"
          >
            Try Different Email
          </Button>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="md" className="py-12">
      <div className="max-w-md mx-auto">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[var(--brand-primary)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <ShieldCheckIcon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-satoshi-bold text-[var(--heading-color)] mb-2">
            Join {brandSlug.charAt(0).toUpperCase() + brandSlug.slice(1)}
          </h1>
          <p className="text-[var(--body-color)] font-satoshi">
            Access our exclusive voting platform and help shape our products
          </p>
        </div>

        {/* Email Gate Form */}
        <Card className="p-8">
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Error Alert */}
            {error && (
              <Alert variant="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {/* Email Field */}
            <div>
              <TextField
                label="Email Address"
                type="email"
                placeholder="Enter your email address"
                leftIcon={EnvelopeIcon}
                {...form.register('email')}
                error={form.formState.errors.email?.message}
                helpText="We'll send you a verification link to access the voting platform"
              />
            </div>

            {/* Terms Agreement */}
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="agreeToTerms"
                {...form.register('agreeToTerms')}
                className="mt-1 w-4 h-4 text-[var(--brand-primary)] border-[var(--border)] rounded focus:ring-[var(--brand-primary)]"
              />
              <label htmlFor="agreeToTerms" className="text-sm text-[var(--body-color)] font-satoshi">
                I agree to the{' '}
                <a href="#" className="text-[var(--brand-primary)] hover:underline">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-[var(--brand-primary)] hover:underline">
                  Privacy Policy
                </a>
                . I understand that I can only vote once per email address.
              </label>
            </div>

            {form.formState.errors.agreeToTerms && (
              <p className="text-sm text-[var(--error)] font-satoshi">
                {form.formState.errors.agreeToTerms.message}
              </p>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <ArrowRightIcon className="w-4 h-4 mr-2" />
              )}
              {isLoading ? 'Processing...' : 'Get Access'}
            </Button>
          </form>
        </Card>

        {/* Brand Information */}
        <div className="mt-8 text-center">
          <div className="bg-[var(--background-secondary)] rounded-lg p-6">
            <h3 className="font-satoshi-semibold text-[var(--heading-color)] mb-2">
              What happens next?
            </h3>
            <div className="space-y-3 text-sm text-[var(--body-color)] font-satoshi">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-6 h-6 bg-[var(--brand-primary)] rounded-full flex items-center justify-center text-white text-xs font-bold">
                  1
                </div>
                <span>Verify your email address</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-6 h-6 bg-[var(--brand-primary)] rounded-full flex items-center justify-center text-white text-xs font-bold">
                  2
                </div>
                <span>Access {brandSlug}'s voting proposals</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-6 h-6 bg-[var(--brand-primary)] rounded-full flex items-center justify-center text-white text-xs font-bold">
                  3
                </div>
                <span>Vote on products and earn certificates</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-[var(--muted)] font-satoshi">
            Powered by Ordira - Decentralized Manufacturing Platform
          </p>
        </div>
      </div>
    </Container>
  );
}

/**
 * Brand Gate Features:
 * 
 * 1. Email Gating: Brand-specific email verification
 * 2. Brand Theming: Uses brand colors and messaging
 * 3. Terms Agreement: Legal compliance and voting rules
 * 4. Verification Flow: Clear next steps for users
 * 5. Error Handling: User-friendly error messages
 * 6. Responsive Design: Works on all devices
 * 7. Security: Proper form validation and sanitization
 * 8. User Experience: Clear and intuitive flow
 */
