// src/app/(public)/loading.tsx
import React from 'react';
import { LoadingSpinner } from '@/components/ui/feedback/loading-spinner';
import { Skeleton } from '@/components/ui/data-display/skeleton';

/**
 * Public pages loading UI component
 * 
 * This loading state provides a clean, marketing-focused experience
 * for public pages like homepage, pricing, auth, etc.
 */
export default function PublicLoading() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Navigation Skeleton */}
      <nav className="bg-[var(--card-bg)] border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-6 w-24" />
            </div>
            
            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-4 w-16" />
              ))}
            </div>
            
            {/* CTA Buttons */}
            <div className="flex items-center space-x-3">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-24" />
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section Skeleton */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <Skeleton className="h-14 w-full max-w-3xl mx-auto" />
            <Skeleton className="h-14 w-full max-w-2xl mx-auto" />
          </div>
          <Skeleton className="h-6 w-full max-w-2xl mx-auto" />
          <Skeleton className="h-6 w-full max-w-xl mx-auto" />
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
            <Skeleton className="h-12 w-40" />
            <Skeleton className="h-12 w-32" />
          </div>
        </div>
      </section>

      {/* Features/Content Section */}
      <section className="py-16 px-4 bg-[var(--background-secondary)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-4 mb-12">
            <Skeleton className="h-10 w-80 mx-auto" />
            <Skeleton className="h-5 w-96 mx-auto" />
          </div>
          
          {/* Feature Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-[var(--card-bg)] rounded-xl p-6 space-y-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <Skeleton className="h-6 w-3/4" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats/Social Proof Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <Skeleton className="h-8 w-72 mx-auto" />
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-10 w-16 mx-auto" />
                <Skeleton className="h-4 w-20 mx-auto" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer Skeleton */}
      <footer className="bg-[var(--background-secondary)] border-t border-[var(--border)] py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-6 w-6 rounded" />
                <Skeleton className="h-5 w-20" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
            
            {/* Footer Links */}
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-5 w-24" />
                <div className="space-y-2">
                  {[...Array(4)].map((_, j) => (
                    <Skeleton key={j} className="h-4 w-20" />
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {/* Copyright */}
          <div className="border-t border-[var(--border)] mt-8 pt-8 text-center">
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>
        </div>
      </footer>

      {/* Loading Overlay */}
      <div className="fixed inset-0 bg-[var(--background)]/95 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="text-center space-y-6">
          {/* Ordira Logo Animation */}
          <div className="relative">
            <div className="w-16 h-16 mx-auto bg-[var(--primary)] rounded-2xl flex items-center justify-center mb-4">
              <div className="w-8 h-8 bg-white rounded-lg animate-pulse"></div>
            </div>
            <LoadingSpinner 
              size="sm" 
              variant="primary"
              className="absolute -bottom-2 -right-2"
            />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-2xl font-satoshi-bold text-[var(--heading-color)]">
              Ordira
            </h3>
            <p className="text-[var(--muted)] font-satoshi">
              Decentralized Manufacturing Platform
            </p>
          </div>
          
          {/* Loading Progress */}
          <div className="w-64 mx-auto">
            <div className="h-1 bg-[var(--border)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--primary)] rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
            <p className="text-xs text-[var(--muted)] mt-2 font-satoshi">
              Loading experience...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Public Loading Features:
 * 
 * 1. Marketing Focus: Optimized for conversion and brand impression
 * 2. Complete Layout: Full page structure skeleton
 * 3. Brand Consistency: Strong Ordira branding throughout
 * 4. Progressive Enhancement: Works without JavaScript
 * 5. SEO Friendly: Proper structure for search engines
 * 6. Mobile Responsive: Optimized for all devices
 * 7. Performance: Fast loading skeleton components
 * 8. Visual Appeal: Engaging loading animations
 * 9. Professional Design: Clean, modern aesthetic
 * 10. User Trust: Builds confidence during loading
 */
