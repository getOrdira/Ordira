// src/components/navigation/BaseHeader.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/providers/auth-provider';
import { 
  Bell, 
  Settings, 
  LogOut, 
  ChevronDown, 
  Building2, 
  CreditCard, 
  HelpCircle,
  User,
  Shield,
  FileText
} from 'lucide-react';
import { VerificationBadge } from '@/components/ui/data-display/status-badge';

// Base user interface that both Brand and Manufacturer users extend
interface BaseUser {
  id: string;
  email: string;
  profilePictureUrl?: string;
  isVerified: boolean;
  type: 'brand' | 'manufacturer' | 'creator';
}

interface BrandUser extends BaseUser {
  type: 'brand';
  businessName: string;
  plan?: 'foundation' | 'growth' | 'premium' | 'enterprise';
}

interface ManufacturerUser extends BaseUser {
  type: 'manufacturer';
  companyName: string;
  isPremium?: boolean;
  isVIP?: boolean;
}

interface CreatorUser extends BaseUser {
  type: 'creator';
  name: string;
}

type AppUser = BrandUser | ManufacturerUser | CreatorUser;

interface BaseHeaderProps {
  user: AppUser;
  className?: string;
}

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

export function BaseHeader({ user, className }: BaseHeaderProps) {
  const router = useRouter();
  const { logout } = useAuth();
  
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

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
      router.push('/auth/login');
    }
  };

  // Get user display name based on type
  const getUserDisplayName = (): string => {
    switch (user.type) {
      case 'brand':
        return user.businessName || 'Brand Account';
      case 'manufacturer':
        return user.companyName || 'Manufacturer Account';
      case 'creator':
        return user.name || 'Creator Account';
      default:
        return 'Account';
    }
  };

  // Get user menu items based on type
  const getUserMenuItems = () => {
    const baseItems = [
      {
        href: `/${user.type}/account/settings/profile`,
        icon: Settings,
        label: 'Account Settings'
      },
      {
        href: `/${user.type}/account/settings/billing`,
        icon: CreditCard,
        label: 'Billing'
      }
    ];

    // Add type-specific menu items
    if (user.type === 'brand') {
      baseItems.splice(1, 0, {
        href: '/brand/integrations',
        icon: Shield,
        label: 'Integrations'
      });
    }

    if (user.type === 'manufacturer') {
      baseItems.splice(1, 0, {
        href: '/manufacturer/profile',
        icon: User,
        label: 'Company Profile'
      });
    }

    // Add help item
    baseItems.push({
      href: '/docs',
      icon: HelpCircle,
      label: 'Help & Support'
    });

    return baseItems;
  };

  // Get notifications page URL based on user type
  const getNotificationsUrl = (): string => {
    return `/${user.type}/notifications`;
  };

  return (
    <header className={`flex items-center justify-end px-6 py-4 bg-white border-b border-gray-200 ${className || ''}`}>
      <div className="flex items-center space-x-4">
        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--ordira-primary)] text-white text-xs rounded-full flex items-center justify-center font-satoshi-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-satoshi-bold text-gray-900">Notifications</h3>
                  {unreadCount > 0 && (
                    <button className="text-sm text-[var(--ordira-primary)] hover:text-[var(--ordira-primary-dark)] font-satoshi-medium">
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
                      className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                        !notification.read ? 'bg-[var(--ordira-primary)]/5' : ''
                      }`}
                    >
                      <div className="flex items-start">
                        <div className={`w-2 h-2 rounded-full mt-2 mr-3 ${
                          !notification.read ? 'bg-[var(--ordira-primary)]' : 'bg-gray-300'
                        }`} />
                        <div className="flex-1">
                          <p className="font-satoshi-bold text-gray-900 text-sm">
                            {notification.title}
                          </p>
                          <p className="text-gray-600 text-sm mt-1 font-satoshi-regular">
                            {notification.message}
                          </p>
                          <p className="text-gray-400 text-xs mt-2 font-satoshi-regular">
                            {notification.time}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500">
                    <Bell className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="font-satoshi-regular">No notifications</p>
                  </div>
                )}
              </div>
              <div className="p-4 border-t border-gray-200">
                <Link
                  href={getNotificationsUrl()}
                  className="text-sm text-[var(--ordira-primary)] hover:text-[var(--ordira-primary-dark)] font-satoshi-medium"
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
            <div className="relative">
              <div className="w-8 h-8 bg-[var(--ordira-primary)]/10 rounded-full flex items-center justify-center">
                {user.profilePictureUrl ? (
                  <img
                    src={user.profilePictureUrl}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <Building2 className="w-4 h-4 text-[var(--ordira-primary)]" />
                )}
              </div>
              
              {/* Verification badge for verified users */}
              {user.isVerified && (
                <div className="absolute -bottom-1 -right-1">
                  <VerificationBadge
                    isVerified={true}
                    userType={user.type === 'creator' ? 'brand' : user.type}
                    size="sm"
                    hideWhenUnverified={false}
                  />
                </div>
              )}
            </div>
            
            <div className="hidden md:block text-left">
              <p className="text-sm font-satoshi-bold text-gray-900">
                {getUserDisplayName()}
              </p>
              <p className="text-xs text-gray-500 font-satoshi-regular">
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
                  <div className="relative">
                    <div className="w-10 h-10 bg-[var(--ordira-primary)]/10 rounded-full flex items-center justify-center">
                      {user.profilePictureUrl ? (
                        <img
                          src={user.profilePictureUrl}
                          alt="Profile"
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <Building2 className="w-5 h-5 text-[var(--ordira-primary)]" />
                      )}
                    </div>
                    
                    {/* Verification badge */}
                    {user.isVerified && (
                      <div className="absolute -bottom-1 -right-1">
                        <VerificationBadge
                          isVerified={true}
                          userType={user.type === 'creator' ? 'brand' : user.type}
                          size="sm"
                          hideWhenUnverified={false}
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <p className="font-satoshi-bold text-gray-900 text-sm">
                      {getUserDisplayName()}
                    </p>
                    <p className="text-xs text-gray-500 truncate font-satoshi-regular">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>

              <div className="py-2">
                {getUserMenuItems().map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors font-satoshi-regular"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <item.icon className="w-4 h-4 mr-3" />
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="border-t border-gray-200 py-2">
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors font-satoshi-regular"
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