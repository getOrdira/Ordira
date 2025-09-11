// src/app/loading.tsx
import React from 'react';
import { LoadingSpinner } from '@/components/ui/feedback/loading-spinner';

/**
 * Global loading UI component for the entire application
 * 
 * This component is shown when:
 * - Navigating between pages
 * - Initial app load
 * - Route transitions
 * - Suspense boundaries trigger
 * 
 * Features:
 * - Consistent with Ordira branding
 * - Smooth animations
 * - Accessible loading states
 * - Responsive design
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
      <div className="text-center space-y-4">
        {/* Main Loading Spinner */}
        <LoadingSpinner 
          size="xl" 
          variant="primary"
          className="mx-auto"
        />
        
        {/* Loading Text */}
        <div className="space-y-2">
          <h2 className="text-lg font-satoshi-semibold text-[var(--heading-color)]">
            Loading Ordira
          </h2>
          <p className="text-sm text-[var(--muted)] font-satoshi max-w-xs mx-auto">
            Preparing your decentralized manufacturing experience...
          </p>
        </div>
        
        {/* Progress Dots Animation */}
        <div className="flex items-center justify-center space-x-1">
          <div className="w-2 h-2 bg-[var(--primary)] rounded-full animate-pulse"></div>
          <div className="w-2 h-2 bg-[var(--primary)] rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-[var(--primary)] rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
        </div>
      </div>
      
      {/* Background Pattern (subtle) */}
      <div className="absolute inset-0 pointer-events-none opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)] via-transparent to-[var(--accent)]"></div>
      </div>
    </div>
  );
}

/**
 * Loading UI Best Practices:
 * 
 * 1. Instant Feedback: Shows immediately on navigation
 * 2. Brand Consistency: Uses Ordira colors and fonts
 * 3. Progressive Enhancement: Works without JavaScript
 * 4. Accessibility: Proper ARIA labels and screen reader support
 * 5. Performance: Lightweight and fast to render
 * 6. Visual Hierarchy: Clear loading states and messages
 * 7. Animation: Smooth, non-distracting animations
 * 8. Responsive: Works on all device sizes
 */
