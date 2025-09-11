// src/components/navigation/SidebarBrand.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { BrandUser } from '@/lib/types/user';
import { VerificationBadge } from '@/components/ui/data-display/status-badge';
import {
  BarChart3,
  Certificate,
  ChevronLeft,
  ChevronRight,
  FileText,
  Home,
  LifeBuoy,
  Package,
  Settings,
  Share2,
  Users,
  Vote,
  Zap,
  Building2,
  CreditCard,
  ChevronDown
} from 'lucide-react';

// Define the structure for a navigation link
interface NavLink {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
  children?: NavLink[];
}

// Define navigation sections for better organization - aligned with your backend routes
const navigationSections = {
  main: [
    { href: '/brand/dashboard', label: 'Dashboard', icon: Home },
    { href: '/brand/products', label: 'Products', icon: Package },
    { href: '/brand/certificates', label: 'Certificates', icon: Certificate },
    { href: '/brand/voting', label: 'Voting', icon: Vote },
  ],
  analytics: [
    { 
      href: '/brand/analytics', 
      label: 'Analytics', 
      icon: BarChart3,
      children: [
        { href: '/brand/analytics/certificates', label: 'Certificates', icon: Certificate },
        { href: '/brand/analytics/votes', label: 'Votes', icon: Vote },
        { href: '/brand/analytics/engagement', label: 'Engagement', icon: Users },
        { href: '/brand/analytics/products', label: 'Products', icon: Package },
        { href: '/brand/analytics/transactions', label: 'Transactions', icon: CreditCard },
      ]
    },
  ],
  settings: [
    { href: '/brand/integrations', label: 'Integrations', icon: Share2 },
    { 
      href: '/brand/account/settings', 
      label: 'Settings', 
      icon: Settings,
      children: [
        { href: '/brand/account/settings/profile', label: 'Profile', icon: Building2 },
        { href: '/brand/account/settings/billing', label: 'Billing', icon: CreditCard },
        { href: '/brand/account/settings/assets', label: 'Assets', icon: Package },
        { href: '/brand/account/settings/domains', label: 'Domains', icon: Share2 },
        { href: '/brand/account/settings/theme', label: 'Theme', icon: Zap },
        { href: '/brand/account/settings/css', label: 'Custom CSS', icon: FileText },
      ]
    },
  ],
};

interface SidebarBrandProps {
  user: BrandUser;
}

export function SidebarBrand({ user }: SidebarBrandProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const isActive = (href: string) => {
    if (href === '/brand/dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionKey) 
        ? prev.filter(key => key !== sectionKey)
        : [...prev, sectionKey]
    );
  };

  const renderNavLink = (link: NavLink, level: number = 0) => {
    const active = isActive(link.href);
    const hasChildren = link.children && link.children.length > 0;
    const isExpanded = expandedSections.includes(link.href);

    return (
      <div key={link.href}>
        {hasChildren ? (
          <button
            onClick={() => toggleSection(link.href)}
            className={`flex items-center justify-between w-full px-3 py-2.5 text-sm font-satoshi-medium rounded-xl transition-all duration-200 group ${
              level > 0 ? 'ml-6' : ''
            } ${
              active
                ? 'bg-[var(--ordira-primary)] text-white shadow-lg shadow-[var(--ordira-primary)]/25'
                : 'text-gray-600 hover:bg-[var(--ordira-primary)]/10 hover:text-[var(--ordira-primary)]'
            }`}
          >
            <div className="flex items-center">
              <link.icon className={`${collapsed ? 'w-5 h-5' : 'w-5 h-5 mr-3'} transition-all duration-200`} />
              {!collapsed && (
                <>
                  <span>{link.label}</span>
                  {link.badge && (
                    <span className="ml-auto px-2 py-0.5 text-xs bg-[var(--ordira-primary)]/10 text-[var(--ordira-primary)] rounded-full font-satoshi-bold">
                      {link.badge}
                    </span>
                  )}
                </>
              )}
            </div>
            {!collapsed && (
              <ChevronDown 
                className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              />
            )}
          </button>
        ) : (
          <Link
            href={link.href}
            className={`flex items-center px-3 py-2.5 text-sm font-satoshi-medium rounded-xl transition-all duration-200 group ${
              level > 0 ? 'ml-6' : ''
            } ${
              active
                ? 'bg-[var(--ordira-primary)] text-white shadow-lg shadow-[var(--ordira-primary)]/25'
                : 'text-gray-600 hover:bg-[var(--ordira-primary)]/10 hover:text-[var(--ordira-primary)]'
            }`}
            title={collapsed ? link.label : undefined}
          >
            <link.icon className={`${collapsed ? 'w-5 h-5' : 'w-5 h-5 mr-3'} transition-all duration-200`} />
            {!collapsed && (
              <>
                <span>{link.label}</span>
                {link.badge && (
                  <span className="ml-auto px-2 py-0.5 text-xs bg-[var(--ordira-primary)]/10 text-[var(--ordira-primary)] rounded-full font-satoshi-bold">
                    {link.badge}
                  </span>
                )}
              </>
            )}
          </Link>
        )}
        
        {/* Render children if expanded and not collapsed */}
        {hasChildren && isExpanded && !collapsed && (
          <div className="mt-1 space-y-1 ml-3">
            {link.children?.map(child => renderNavLink(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className={`flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-300 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Logo & Collapse Button */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className={`flex items-center ${collapsed ? 'justify-center' : ''}`}>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-[var(--ordira-primary)] rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-satoshi-bold text-lg">O</span>
            </div>
            {!collapsed && (
              <span className="ml-3 text-xl font-satoshi-bold text-gray-900">Ordira</span>
            )}
          </div>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-gray-500" />
          )}
        </button>
      </div>

      {/* User Info */}
      {!collapsed && (
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="p-3 bg-gradient-to-r from-[var(--ordira-primary)]/5 to-[var(--ordira-primary-dark)]/5 rounded-xl border border-[var(--ordira-primary)]/10">
            <div className="flex items-center">
              <div className="relative">
                <div className="w-10 h-10 bg-[var(--ordira-primary)]/10 rounded-xl flex items-center justify-center">
                  {user.profilePictureUrl ? (
                    <img
                      src={user.profilePictureUrl}
                      alt="Profile"
                      className="w-10 h-10 rounded-xl object-cover"
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
                      userType="brand"
                      size="sm"
                      hideWhenUnverified={false}
                    />
                  </div>
                )}
              </div>
              
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-satoshi-bold text-gray-900 truncate">
                  {user.businessName || 'Brand Account'}
                </p>
                <p className="text-xs text-gray-500 truncate font-satoshi-regular">
                  {user.plan && (
                    <span className="capitalize">{user.plan}</span>
                  )}
                  {user.plan && ' • '}
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 pb-4 space-y-6 overflow-y-auto scrollbar-thin">
        {/* Main Navigation */}
        <div className="space-y-2">
          {!collapsed && (
            <p className="px-3 text-xs font-satoshi-bold text-gray-400 uppercase tracking-wider">
              Main
            </p>
          )}
          <div className="space-y-1">
            {navigationSections.main.map(link => renderNavLink(link))}
          </div>
        </div>

        {/* Analytics Section */}
        <div className="space-y-2">
          {!collapsed && (
            <p className="px-3 text-xs font-satoshi-bold text-gray-400 uppercase tracking-wider">
              Analytics
            </p>
          )}
          <div className="space-y-1">
            {navigationSections.analytics.map(link => renderNavLink(link))}
          </div>
        </div>

        {/* Settings Section */}
        <div className="space-y-2">
          {!collapsed && (
            <p className="px-3 text-xs font-satoshi-bold text-gray-400 uppercase tracking-wider">
              Settings
            </p>
          )}
          <div className="space-y-1">
            {navigationSections.settings.map(link => renderNavLink(link))}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 space-y-1 border-t border-gray-100">
        <Link
          href="/docs"
          className="flex items-center px-3 py-2.5 text-sm font-satoshi-medium text-gray-600 rounded-xl hover:bg-[var(--ordira-primary)]/10 hover:text-[var(--ordira-primary)] transition-all duration-200"
          title={collapsed ? 'Help & Documentation' : undefined}
        >
          <LifeBuoy className={`${collapsed ? 'w-5 h-5' : 'w-5 h-5 mr-3'}`} />
          {!collapsed && 'Help & Docs'}
        </Link>
      </div>
    </aside>
  );
}