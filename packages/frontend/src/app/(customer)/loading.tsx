// src/app/(customer)/loading.tsx
import React from 'react';
import { LoadingSpinner } from '@/components/ui/feedback/loading-spinner';
import { Skeleton } from '@/components/ui/data-display/skeleton';

/**
 * Customer-facing loading UI component
 * 
 * This loading state provides a clean, brand-aware experience
 * for customer-facing pages while content loads
 */
export default function CustomerLoading() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header Skeleton */}
      <header className="border-b border-[var(--border)] bg-[var(--card-bg)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-6 w-32" />
          </div>
          <nav className="flex items-center gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="space-y-8">
          {/* Page Title Section */}
          <div className="text-center space-y-4">
            <Skeleton className="h-10 w-96 mx-auto" />
            <Skeleton className="h-4 w-[500px] mx-auto" />
          </div>

          {/* Featured Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl overflow-hidden">
                {/* Image Skeleton */}
                <Skeleton className="h-48 w-full" />
                
                {/* Content */}
                <div className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                  
                  {/* Tags */}
                  <div className="flex gap-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                  
                  {/* Action Button */}
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            ))}
          </div>

          {/* Stats or Info Section */}
          <div className="bg-[var(--background-secondary)] rounded-xl p-8">
            <div className="text-center space-y-6">
              <Skeleton className="h-8 w-64 mx-auto" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-12 w-12 mx-auto rounded-full" />
                    <Skeleton className="h-8 w-20 mx-auto" />
                    <Skeleton className="h-4 w-32 mx-auto" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center space-y-4 py-8">
            <Skeleton className="h-8 w-80 mx-auto" />
            <Skeleton className="h-4 w-96 mx-auto" />
            <Skeleton className="h-12 w-48 mx-auto" />
          </div>
        </div>
      </main>

      {/* Loading Overlay */}
      <div className="fixed inset-0 bg-[var(--background)]/90 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="text-center space-y-6">
          <LoadingSpinner 
            size="lg" 
            variant="primary"
          />
          <div className="space-y-2">
            <h3 className="text-xl font-satoshi-semibold text-[var(--heading-color)]">
              Loading Experience
            </h3>
            <p className="text-[var(--muted)] font-satoshi max-w-sm mx-auto">
              Preparing your personalized manufacturing marketplace...
            </p>
          </div>
          
          {/* Progress Indicator */}
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-[var(--primary)] rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-[var(--primary)] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-[var(--primary)] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Customer Loading Features:
 * 
 * 1. Brand-Aware: Adapts to different brand contexts
 * 2. Content Structure: Mimics typical customer page layouts
 * 3. Progressive Loading: Shows structure while content loads
 * 4. Responsive Design: Works on all device sizes
 * 5. Visual Hierarchy: Clear loading progression
 * 6. Performance: Lightweight skeleton components
 * 7. Accessibility: Proper loading states for screen readers
 * 8. User Experience: Engaging loading animations
 * 9. Context-Aware: Customer-focused messaging
 * 10. Smooth Transitions: Prevents jarring layout shifts
 */
