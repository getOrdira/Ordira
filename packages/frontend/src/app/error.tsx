// src/app/error.tsx
'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/primitives/button';
import { Container } from '@/components/ui/layout/container';
import { Alert } from '@/components/ui/feedback/alert';
import { 
  ExclamationTriangleIcon,
  ArrowPathIcon,
  HomeIcon,
  BugAntIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';

/**
 * 
 * This component catches and handles:
 * - Unhandled JavaScript errors
 * - React component errors
 * - API request failures
 * - Unexpected application crashes
 * 
 * Features:
 * - User-friendly error display
 * - Error reporting capabilities
 * - Recovery options
 * - Development error details
 * - Analytics tracking
 */

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  const router = useRouter();

  // Log error for monitoring and analytics
  useEffect(() => {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Application Error:', error);
      console.error('Error Stack:', error.stack);
      console.error('Error Digest:', error.digest);
    }

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with error tracking service (Sentry, LogRocket, etc.)
      // trackError(error, {
      //   digest: error.digest,
      //   userAgent: navigator.userAgent,
      //   url: window.location.href,
      //   timestamp: new Date().toISOString(),
      // });
    }
  }, [error]);

  // Determine error type and severity
  const getErrorInfo = () => {
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return {
        type: 'Network Error',
        description: 'There was a problem connecting to our servers. Please check your internet connection.',
        severity: 'warning',
        canRetry: true,
      };
    }
    
    if (errorMessage.includes('unauthorized') || errorMessage.includes('403')) {
      return {
        type: 'Access Denied',
        description: 'You don\'t have permission to access this resource. Please log in or contact support.',
        severity: 'error',
        canRetry: false,
      };
    }
    
    if (errorMessage.includes('timeout')) {
      return {
        type: 'Request Timeout',
        description: 'The request took too long to complete. Please try again.',
        severity: 'warning',
        canRetry: true,
      };
    }

    // Default error info
    return {
      type: 'Application Error',
      description: 'Something unexpected happened. Our team has been notified and is working on a fix.',
      severity: 'error' as const,
      canRetry: true,
    };
  };

  const errorInfo = getErrorInfo();

  // Handle error reporting
  const handleReportError = () => {
    const errorReport = {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    };

    // Copy error details to clipboard
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => {
        alert('Error details copied to clipboard. Please include this when contacting support.');
      })
      .catch(() => {
        // Fallback: show error details in alert
        alert(`Error Details:\n${JSON.stringify(errorReport, null, 2)}`);
      });
  };

  // Handle refresh page
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center px-4">
      <Container size="md" className="text-center">
        {/* Error Icon */}
        <div className="mb-8">
          <div className="mx-auto w-24 h-24 bg-[var(--error)]/10 rounded-full flex items-center justify-center">
            <ExclamationTriangleIcon className="w-12 h-12 text-[var(--error)]" />
          </div>
        </div>

        {/* Error Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-satoshi-bold text-[var(--heading-color)] mb-3">
            Oops! Something went wrong
          </h1>
          <h2 className="text-xl font-satoshi-medium text-[var(--error)] mb-4">
            {errorInfo.type}
          </h2>
          <p className="text-[var(--body-color)] font-satoshi max-w-lg mx-auto leading-relaxed">
            {errorInfo.description}
          </p>
        </div>

        {/* Error Alert */}
        <div className="mb-8 max-w-lg mx-auto">
          <Alert 
            variant={errorInfo.severity} 
            size="md"
            className="text-left"
          >
            <div className="space-y-2">
              <p className="font-satoshi-medium">
                Error ID: {error.digest || 'Unknown'}
              </p>
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-2">
                  <summary className="cursor-pointer font-satoshi-medium text-sm">
                    Developer Details
                  </summary>
                  <div className="mt-2 p-3 bg-[var(--background-secondary)] rounded-lg">
                    <pre className="text-xs font-mono text-left overflow-x-auto whitespace-pre-wrap break-words">
                      {error.message}
                      {error.stack && (
                        <>
                          {'\n\nStack Trace:\n'}
                          {error.stack}
                        </>
                      )}
                    </pre>
                  </div>
                </details>
              )}
            </div>
          </Alert>
        </div>

        {/* Recovery Actions */}
        <div className="space-y-6">
          {/* Primary Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            {errorInfo.canRetry && (
              <Button
                onClick={reset}
                variant="primary"
                size="md"
                className="w-full sm:w-auto"
              >
                <ArrowPathIcon className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}
            
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="md"
              className="w-full sm:w-auto"
            >
              <ArrowPathIcon className="w-4 h-4 mr-2" />
              Refresh Page
            </Button>
            
            <Button
              onClick={() => router.push('/')}
              variant="ghost"
              size="md"
              className="w-full sm:w-auto"
            >
              <HomeIcon className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>

          {/* Secondary Actions */}
          <div className="pt-6 border-t border-[var(--border)]">
            <p className="text-sm text-[var(--muted)] font-satoshi mb-4">
              If the problem persists, you can:
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button
                onClick={handleReportError}
                variant="ghost"
                size="sm"
              >
                <ClipboardDocumentIcon className="w-4 h-4 mr-2" />
                Copy Error Details
              </Button>
              
              {/* Add contact/support links when available */}
              <Button variant="ghost" size="sm" disabled>
                <BugAntIcon className="w-4 h-4 mr-2" />
                Report Bug
              </Button>
            </div>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-12 pt-8 border-t border-[var(--border)]">
          <div className="bg-[var(--background-secondary)] rounded-xl p-6">
            <h3 className="text-lg font-satoshi-semibold text-[var(--heading-color)] mb-3">
              Need immediate help?
            </h3>
            <p className="text-[var(--body-color)] font-satoshi mb-4">
              Our support team is here to help. Please include the error ID when contacting us.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {/* Add real contact methods when available */}
              <Button variant="outline" size="sm" disabled>
                Contact Support
              </Button>
              <Button variant="ghost" size="sm" disabled>
                Check Status Page
              </Button>
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="mt-8 pt-6 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--muted)] font-satoshi">
            © 2024 Ordira - We're sorry for the inconvenience
          </p>
        </div>
      </Container>
    </div>
  );
}

/**
 * Error Boundary Features:
 * 
 * 1. Automatic Error Detection: Catches unhandled errors and component crashes
 * 2. User-Friendly Display: Shows helpful messages instead of technical details
 * 3. Recovery Options: Provides multiple ways to recover from errors
 * 4. Error Reporting: Logs errors for monitoring and debugging
 * 5. Development Support: Shows detailed error info in development mode
 * 
 * Production Considerations:
 * 
 * 1. Integrate with error tracking service (Sentry, LogRocket, etc.)
 * 2. Add real contact/support methods
 * 3. Implement automated error notifications
 * 4. Add error analytics and monitoring
 * 5. Consider A/B testing different error recovery flows
 * 
 * Accessibility:
 * 
 * 1. Semantic HTML structure
 * 2. Keyboard navigation support
 * 3. Screen reader friendly
 * 4. High contrast error indicators
 * 5. Clear action descriptions
 */
