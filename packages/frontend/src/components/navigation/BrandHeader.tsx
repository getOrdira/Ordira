// src/components/navigation/BrandHeader.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { BrandUser } from '@/lib/types/user';
import {
  Bell,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Building2,
  CreditCard,
  HelpCircle,
  Moon,
  Sun,
  Search,
  Plus
} from 'lucide-react';

interface BrandHeaderProps {
  user: BrandUser;
}

// Page title mapping based on pathname
const getPageTitle = (pathname: string): string => {
  const routes: Record<string, string> = {
    '/brand/dashboard': 'Dashboard',
    '/brand/products': 'Products',
    '/brand/certificates': 'Certificates',
    '/brand/voting': 'Voting',
    '/brand/analytics': 'Analytics',
    '/brand/analytics/certificates': 'Certificate Analytics',
    '/brand/analytics/votes': 'Voting Analytics',
    '/brand/analytics/engagement': 'Engagement Analytics',
    '/brand/analytics/products': 'Product Analytics',
    '/brand/analytics/transactions': 'Transaction Analytics',
    '/brand/integrations': 'Integrations',
    '/brand/account/settings': 'Account Settings',
    '/brand/account/settings/profile': 'Profile Settings',
    '/brand/account/settings/billing': 'Billing Settings',
    '/brand/account/settings/assets': 'Asset Management',
    '/brand/account/settings/domains': 'Domain Settings',
    '/brand/account/settings/theme': 'Theme Settings',
    '/brand/account/settings/css': 'Custom CSS',
  };

  return routes[pathname] || 'Brand Dashboard';
};

// Mock notification data - replace with real data from your backend
const mockNotifications = [
  {
    id: '1',
    title: 'New Certificate Minted',
    message: 'Certificate #1234 has been successfully minted',
    time: '5 minutes ago',
    read: false,
    type: 'success'
  },
  {
    id: '2',
    title: 'Voting Campaign Active',
    message: 'Your product voting campaign is now live',
    time: '1 hour ago',
    read: false,
    type: 'info'
  },
  {
    id: '3',
    title: 'Monthly Report Available',
    message: 'Your analytics report for November is ready',
    time: '2 hours ago',
    read: true,
    type: 'info'
  },
];

export function BrandHeader({ user }: BrandHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const pageTitle = getPageTitle(pathname);
  const unreadCount = mockNotifications.filter(n => !n.read).length;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if logout fails
      router.push('/auth/login');
    }
  };

  const getActionButton = () => {
    switch (pathname) {
      case '/brand/products':
        return (
          <Link 
            href="/brand/products/new"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Link>
        );
      case '/brand/voting':
        return (
          <Link 
            href="/brand/voting/new"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Campaign
          </Link>
        );
      case '/brand/certificates':
        return (
          <Link 
            href="/brand/certificates/mint"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Mint Certificate
          </Link>
        );
      default:
        return null;
    }
  };

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
      {/* Left Section - Page Title & Search */}
      <div className="flex items-center space-x-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{pageTitle}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {user.businessName || 'Brand Dashboard'}
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-64 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Right Section - Actions & User Menu */}
      <div className="flex items-center space-x-4">
        {/* Context Action Button */}
        {getActionButton()}

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <button className="text-sm text-indigo-600 hover:text-indigo-800">
                      Mark all read
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto">
                {mockNotifications.length > 0 ? (
                  mockNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 transition-colors ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex items-start">
                        <div className={`w-2 h-2 rounded-full mt-2 mr-3 ${
                          !notification.read ? 'bg-blue-500' : 'bg-gray-300'
                        }`} />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">
                            {notification.title}
                          </p>
                          <p className="text-gray-600 text-sm mt-1">
                            {notification.message}
                          </p>
                          <p className="text-gray-400 text-xs mt-2">
                            {notification.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>No notifications</p>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-gray-200">
                <Link
                  href="/brand/notifications"
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  View all notifications
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Avatar & Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
              {user.profilePictureUrl ? (
                <img
                  src={user.profilePictureUrl}
                  alt="Profile"
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <Building2 className="w-4 h-4 text-indigo-600" />
              )}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-gray-900">
                {user.businessName || 'Brand Account'}
              </p>
              <p className="text-xs text-gray-500">
                {user.email}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {/* User Dropdown Menu */}
          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    {user.profilePictureUrl ? (
                      <img
                        src={user.profilePictureUrl}
                        alt="Profile"
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <Building2 className="w-5 h-5 text-indigo-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">
                      {user.businessName || 'Brand Account'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>

              <div className="py-2">
                <Link
                  href="/brand/account/settings/profile"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  onClick={() => setShowUserMenu(false)}
                >
                  <Settings className="w-4 h-4 mr-3" />
                  Account Settings
                </Link>
                <Link
                  href="/brand/account/settings/billing"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  onClick={() => setShowUserMenu(false)}
                >
                  <CreditCard className="w-4 h-4 mr-3" />
                  Billing
                </Link>
                <Link
                  href="/docs"
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                  onClick={() => setShowUserMenu(false)}
                >
                  <HelpCircle className="w-4 h-4 mr-3" />
                  Help & Support
                </Link>
              </div>

              <div className="border-t border-gray-200 py-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}