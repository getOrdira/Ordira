// src/app/brand/loading.tsx
import React from 'react';
import { LoadingSpinner } from '@/components/ui/feedback/loading-spinner';
import { Skeleton } from '@/components/ui/data-display/skeleton';

/**
 * Brand dashboard loading UI component
 * 
 * This loading state mimics the brand dashboard layout
 * to provide a smooth transition and prevent layout shift
 */
export default function BrandLoading() {
  return (
    <div className="flex h-screen bg-[var(--background-secondary)] overflow-hidden">
      {/* Sidebar Skeleton */}
      <div className="w-64 bg-[var(--card-bg)] border-r border-[var(--border)] p-4">
        <div className="space-y-4">
          {/* Logo Skeleton */}
          <Skeleton className="h-8 w-32" />
          
          {/* Navigation Menu Skeleton */}
          <div className="space-y-2 mt-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 p-2">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
          
          {/* User Profile Skeleton */}
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center space-x-3 p-2">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header Skeleton */}
        <div className="bg-[var(--card-bg)] border-b border-[var(--border)] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-8 w-48" />
            </div>
            <div className="flex items-center space-x-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>
        </div>

        {/* Page Content Skeleton */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Page Title */}
            <div className="space-y-2">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-4 w-96" />
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-6">
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>

            {/* Main Content Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="bg-[var(--card-bg)] border border-[var(--border)] rounded-xl p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                    <div className="space-y-3">
                      {[...Array(4)].map((_, j) => (
                        <div key={j} className="flex items-center space-x-3">
                          <Skeleton className="h-10 w-10 rounded" />
                          <div className="flex-1 space-y-1">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                          <Skeleton className="h-6 w-16" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Loading Overlay with Spinner */}
      <div className="absolute inset-0 bg-[var(--background)]/80 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="text-center space-y-4">
          <LoadingSpinner 
            size="lg" 
            variant="primary"
          />
          <div className="space-y-1">
            <h3 className="text-lg font-satoshi-semibold text-[var(--heading-color)]">
              Loading Brand Dashboard
            </h3>
            <p className="text-sm text-[var(--muted)] font-satoshi">
              Preparing your manufacturing insights...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Brand Loading Features:
 * 
 * 1. Layout Mimicking: Matches actual dashboard layout
 * 2. Progressive Loading: Shows structure immediately
 * 3. Skeleton Screens: Prevents layout shift
 * 4. Brand Consistency: Uses Ordira design system
 * 5. Responsive Design: Works on all screen sizes
 * 6. Performance: Lightweight and fast rendering
 * 7. Accessibility: Proper loading states
 * 8. Visual Feedback: Clear loading indicators
 */
