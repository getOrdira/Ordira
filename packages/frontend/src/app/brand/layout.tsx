// src/app/brand/layout.tsx
'use client';

import { SidebarBrand } from '@/components/navigation/SidebarBrand';
import { BrandHeader } from '@/components/navigation/BrandHeader';
import { useAuth } from '@/providers/auth-provider';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';
import { isBrandUser } from '@/lib/types/user';

/**
 * Brand layout wrapper that provides consistent navigation and structure
 * for all brand dashboard pages. Includes role-based access control.
 */
export default function BrandLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isAuthenticated } = useAuth();

  // TEMPORARY: Mock user for UI testing - REMOVE THIS IN PRODUCTION
  const mockUser = {
    id: '1',
    email: 'test@brand.com',
    role: 'brand',
    businessName: 'Test Brand',
    isVerified: true,
    profilePictureUrl: null
  };

  // TEMPORARY: Skip authentication for UI testing
  const isTestingMode = true; // Set to false when ready for production

  // Redirect if not authenticated or not a brand user (only if not testing)
  useEffect(() => {
    if (!isTestingMode && !isLoading) {
      if (!isAuthenticated) {
        redirect('/auth/login?redirect=/brand/dashboard');
      } else if (user && !isBrandUser(user)) {
        // Redirect non-brand users to their appropriate dashboard
        if (user.role === 'manufacturer') {
          redirect('/manufacturer/dashboard');
        } else if (user.role === 'customer') {
          redirect('/gate');
        } else {
          redirect('/auth/login');
        }
      }
    }
  }, [isLoading, isAuthenticated, user, isTestingMode]);

  // Show loading state while checking authentication (only if not testing)
  if (!isTestingMode && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--background-secondary)]">
        <div className="text-center">
          <div className="w-8 h-8 mx-auto mb-4 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-[var(--body-color)] font-satoshi">Loading...</p>
        </div>
      </div>
    );
  }

  // Use mock user for testing, real user for production
  const currentUser = isTestingMode ? mockUser : (user as any);

  // Don't render if not authenticated or wrong user type (only if not testing)
  if (!isTestingMode && (!isAuthenticated || !user || !isBrandUser(user))) {
    return null;
  }

  return (
    <div className="flex h-screen bg-[var(--background-secondary)] overflow-hidden">
      {/* Sidebar Navigation */}
      <SidebarBrand user={currentUser} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <BrandHeader user={currentUser} />

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}