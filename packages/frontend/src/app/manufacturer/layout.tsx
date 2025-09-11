// src/app/manufacturer/layout.tsx
'use client';

import { SidebarManufacturer } from '@/components/navigation/SidebarManufacturer';
import { ManufacturerHeader } from '@/components/navigation/ManufacturerHeader';
import { useAuth } from '@/providers/auth-provider';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';
import { isManufacturerUser } from '@/lib/types/user';
import { LoadingSpinner } from '@/components/ui/feedback/loading-spinner';

/**
 * Manufacturer layout wrapper that provides consistent navigation and structure
 * for all manufacturer dashboard pages. Includes role-based access control.
 */
export default function ManufacturerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, isAuthenticated } = useAuth();

  // Redirect if not authenticated or not a manufacturer user
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        redirect('/auth/login?redirect=/manufacturer/dashboard');
      } else if (user && !isManufacturerUser(user)) {
        // Redirect non-manufacturer users to their appropriate dashboard
        if (user.role === 'brand') {
          redirect('/brand/dashboard');
        } else if (user.role === 'customer') {
          redirect('/gate');
        } else {
          redirect('/auth/login');
        }
      }
    }
  }, [isLoading, isAuthenticated, user]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--background-secondary)]">
        <LoadingSpinner 
          size="lg" 
          variant="primary"
          text="Loading manufacturer dashboard..."
        />
      </div>
    );
  }

  // Don't render if not authenticated or wrong user type
  if (!isAuthenticated || !user || !isManufacturerUser(user)) {
    return null;
  }

  return (
    <div className="flex h-screen bg-[var(--background-secondary)] overflow-hidden">
      {/* Sidebar Navigation */}
      <SidebarManufacturer user={user} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <ManufacturerHeader user={user} />

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

/**
 * Layout Features:
 * 
 * 1. Role-based Access Control: Only manufacturer users can access
 * 2. Authentication Check: Redirects unauthenticated users
 * 3. Loading States: Shows spinner during auth check
 * 4. Consistent Navigation: Sidebar and header across all pages
 * 5. Responsive Design: Works on all screen sizes
 * 6. CSS Variables: Uses Ordira theme colors
 * 7. Type Safety: TypeScript integration
 * 8. Error Handling: Graceful fallbacks
 */
