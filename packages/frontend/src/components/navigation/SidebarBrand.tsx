// src/components/navigation/SidebarBrand.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { BrandUser } from '@/lib/types/user';
import {
  BarChart3,
  Certificate,
  ChevronLeft,
  ChevronRight,
  FileText,
  Home,
  LifeBuoy,
  LogOut,
  Package,
  Settings,
  Share2,
  Users,
  Vote,
  Zap,
  Building2,
  CreditCard
} from 'lucide-react';

// Define the structure for a navigation link
interface NavLink {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
  children?: NavLink[];
}

// Define navigation sections for better organization
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
        { href: '/brand/analytics/certificates', label: 'Certificates', icon: FileText },
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
            className={`flex items-center justify-between w-full px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              level > 0 ? 'ml-6' : ''
            } ${
              active
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center">
              <link.icon className={`${collapsed ? 'w-5 h-5' : 'w-4 h-4 mr-3'}`} />
              {!collapsed && link.label}
              {link.badge && !collapsed && (
                <span className="ml-auto px-2 py-0.5 text-xs bg-indigo-100 text-indigo-600 rounded-full">
                  {link.badge}
                </span>
              )}
            </div>
            {!collapsed && (
              <ChevronRight 
                className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              />
            )}
          </button>
        ) : (
          <Link
            href={link.href}
            className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
              level > 0 ? 'ml-6' : ''
            } ${
              active
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
            title={collapsed ? link.label : undefined}
          >
            <link.icon className={`${collapsed ? 'w-5 h-5' : 'w-4 h-4 mr-3'}`} />
            {!collapsed && link.label}
            {link.badge && !collapsed && (
              <span className="ml-auto px-2 py-0.5 text-xs bg-indigo-100 text-indigo-600 rounded-full">
                {link.badge}
              </span>
            )}
          </Link>
        )}
        
        {/* Render children if expanded and not collapsed */}
        {hasChildren && isExpanded && !collapsed && (
          <div className="mt-1 space-y-1">
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
      <div className="flex items-center justify-between p-4">
        <div className={`flex items-center ${collapsed ? 'justify-center' : ''}`}>
          <div className="flex items-center">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <span className="ml-2 text-xl font-bold text-gray-800">Ordira</span>
            )}
          </div>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-md hover:bg-gray-100 transition-colors"
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
        <div className="px-4 pb-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                <Building2 className="w-5 h-5 text-indigo-600" />
              </div>
              <div className="ml-3 min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.businessName || 'Brand Account'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-4 pb-4 space-y-6 overflow-y-auto">
        {/* Main Navigation */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Main
            </p>
          )}
          {navigationSections.main.map(link => renderNavLink(link))}
        </div>

        {/* Analytics Section */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Analytics
            </p>
          )}
          {navigationSections.analytics.map(link => renderNavLink(link))}
        </div>

        {/* Settings Section */}
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Settings
            </p>
          )}
          {navigationSections.settings.map(link => renderNavLink(link))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 space-y-1 border-t border-gray-200">
        <Link
          href="/docs"
          className="flex items-center px-3 py-2.5 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          title={collapsed ? 'Help & Documentation' : undefined}
        >
          <LifeBuoy className={`${collapsed ? 'w-5 h-5' : 'w-4 h-4 mr-3'}`} />
          {!collapsed && 'Help & Docs'}
        </Link>
      </div>
    </aside>
  );
}
