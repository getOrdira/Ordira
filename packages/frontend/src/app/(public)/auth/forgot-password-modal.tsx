'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LoadingSpinner } from '@/components/ui/feedback/loading-spinner';
import { useAuth } from '@/hooks/deprecated/use-auth';

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { forgotPassword } = useAuth();

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setIsLoading(true);
      await forgotPassword(data);
      setIsSubmitted(true);
    } catch (error) {
      // Error is handled by the hook
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsSubmitted(false);
    form.reset();
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
      }}
    >
        <div 
          style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            maxWidth: '600px',
            minHeight: '400px',
            width: '100%',
            padding: '40px',
            position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}
        >
        {/* Close Button */}
        <button
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '32px',
            height: '32px',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'black',
            fontSize: '20px',
            fontWeight: 'bold'
          }}
        >
          ×
        </button>

        {/* Header */}
        <div className="text-center mb-6" style={{ paddingBottom: '20px', marginTop: '20px' }}>
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'black' }}>
            {!isSubmitted ? "Forgot Password?" : "Check Your Email"}
          </h2>
          {!isSubmitted && (
            <p className="text-sm" style={{ color: 'black', marginTop: '16px' }}>
              Enter your email address and we'll send you a link to reset your password.
            </p>
          )}
        </div>
        {!isSubmitted ? (
          <>
            {/* Form */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium" style={{ color: 'black' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  {...form.register('email')}
                  style={{
                    backgroundColor: '#f5f5f5',
                    height: '40px',
                    borderRadius: '12px',
                    padding: '14px 18px',
                    fontSize: '16px',
                    border: form.formState.errors.email ? '2px solid #ef4444' : 'none',
                    color: '#000000',
                    width: '100%',
                    outline: 'none'
                  }}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  backgroundColor: '#FF6900',
                  color: 'black',
                  height: '48px',
                  borderRadius: '12px',
                  fontSize: '18px',
                  fontWeight: '500',
                  width: '100%',
                  border: 'none',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1,
                  transition: 'all 0.2s ease',
                  marginTop: '16px'
                }}
              >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <LoadingSpinner size="sm" variant="white" className="mr-2" />
            Sending...
          </div>
        ) : (
          'Send Reset Link'
        )}
              </button>
            </form>

          </>
        ) : (
          <>
            {/* Success State */}
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-gray-600 text-sm mb-6">
                We've sent a password reset link to your email address. Please check your inbox and follow the instructions.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
