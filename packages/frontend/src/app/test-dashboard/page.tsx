'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  ShoppingCart, 
  ArrowUpRight,
  Plus,
  BarChart3,
  PieChart,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Bell,
  Home,
  Package,
  FileCheck,
  Vote,
  Settings,
  Share2,
  Building2,
  CreditCard,
  Zap,
  FileText,
  LifeBuoy,
  ChevronDown,
  Search
} from 'lucide-react';

// Settings Modal Component
function SettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [selectedSetting, setSelectedSetting] = useState('profile');

  const handleOutsideClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const settingsOptions = [
    { id: 'profile', label: 'Profile', icon: Building2 },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'assets', label: 'Assets', icon: Package },
    { id: 'domains', label: 'Domains', icon: Share2 },
    { id: 'theme', label: 'Theme', icon: Zap },
  ];

  if (!isOpen) return null;

  return (
    <div 
      onClick={handleOutsideClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
    >
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        width: '90vw',
        height: '80vh',
        maxWidth: '1200px',
        display: 'flex',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        position: 'relative'
      }}>
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            border: 'none',
            backgroundColor: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#000000',
            fontSize: '16px',
            fontWeight: 'bold',
            transition: 'all 0.2s',
            zIndex: 10
          }}
          onMouseEnter={(e) => {
            const target = e.target as HTMLButtonElement;
            target.style.backgroundColor = '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            const target = e.target as HTMLButtonElement;
            target.style.backgroundColor = 'transparent';
          }}
        >
          ✕
        </button>
        {/* Settings Sidebar */}
        <div style={{
          width: '280px',
          backgroundColor: '#f9fafb',
          overflowY: 'auto',
          borderTopRightRadius: '24px',
          borderBottomRightRadius: '24px',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '8px 16px' }}>
            {/* Settings Title */}
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#111827',
              margin: '0 0 16px 0',
              padding: '8px 0'
            }}>Settings</h2>
            
            {settingsOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setSelectedSetting(option.id)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '12px 16px',
                    marginBottom: '4px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: selectedSetting === option.id ? '#f97316' : 'transparent',
                    color: selectedSetting === option.id ? 'white' : '#374151',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedSetting !== option.id) {
                      const target = e.target as HTMLButtonElement;
                      target.style.backgroundColor = '#e5e7eb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedSetting !== option.id) {
                      const target = e.target as HTMLButtonElement;
                      target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <option.icon style={{
                    width: '18px',
                    height: '18px',
                    marginRight: '12px'
                  }} />
                  {option.label}
                </button>
              ))}
          </div>
        </div>

        {/* Main Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          backgroundColor: 'white'
        }}>
          <div style={{ padding: '16px 24px' }}>
            {selectedSetting === 'profile' && (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
                  Profile Settings
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                      Business Name
                    </label>
                    <input
                      type="text"
                      defaultValue="Test Brand"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                      Email
                    </label>
                    <input
                      type="email"
                      defaultValue="test@brand.com"
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                      Description
                    </label>
                    <textarea
                      defaultValue="A leading brand in sustainable products..."
                      rows={4}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedSetting === 'billing' && (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
                  Billing Settings
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                      Payment Method
                    </label>
                    <select style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}>
                      <option>Credit Card ending in 4242</option>
                      <option>PayPal</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                      Billing Address
                    </label>
                    <textarea
                      defaultValue="123 Business St, City, State 12345"
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedSetting === 'theme' && (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
                  Theme Settings
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px', color: '#374151' }}>
                      Color Scheme
                    </label>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      {['Light', 'Dark', 'Auto'].map((theme) => (
                        <button
                          key={theme}
                          style={{
                            padding: '8px 16px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            backgroundColor: theme === 'Light' ? '#f97316' : 'white',
                            color: theme === 'Light' ? 'white' : '#374151',
                            cursor: 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          {theme}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Placeholder for other settings */}
            {!['profile', 'billing', 'theme'].includes(selectedSetting) && (
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>
                  {settingsOptions.find(opt => opt.id === selectedSetting)?.label} Settings
                </h3>
                <p style={{ color: '#6b7280', fontSize: '14px' }}>
                  Settings for {settingsOptions.find(opt => opt.id === selectedSetting)?.label} will be implemented here.
                </p>
              </div>
            )}

            {/* Save Button */}
            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#f97316',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.backgroundColor = '#ea580c';
                }}
                onMouseLeave={(e) => {
                  const target = e.target as HTMLButtonElement;
                  target.style.backgroundColor = '#f97316';
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mock sidebar component
function TestSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const router = useRouter();

  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionKey) 
        ? prev.filter(key => key !== sectionKey)
        : [...prev, sectionKey]
    );
  };

  const navigationSections = {
    main: [
      { href: '/brand/dashboard', label: 'Dashboard', icon: Home },
      { href: '/brand/products', label: 'Products', icon: Package },
      { href: '/brand/certificates', label: 'Certificates', icon: FileCheck },
      { href: '/brand/voting', label: 'Voting', icon: Vote },
    ],
    analytics: [
      { 
        href: '/brand/analytics', 
        label: 'Analytics', 
        icon: BarChart3
      },
    ],
    integrations: [
      { href: '/brand/integrations', label: 'Integrations', icon: Share2 },
    ],
  };

  const footerSections = [
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
  ];

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  const renderNavLink = (link: any, level: number = 0) => {
    const hasChildren = link.children && link.children.length > 0;
    const isExpanded = expandedSections.includes(link.href);

    return (
      <div key={link.href}>
        {hasChildren ? (
          <button
            onClick={() => toggleSection(link.href)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '11px',
              fontSize: '15px',
              fontWeight: '500',
              borderRadius: '12px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#374151',
              transition: 'all 0.2s',
              marginLeft: level > 0 ? '24px' : '0'
            }}
            onMouseEnter={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.backgroundColor = '#e5e7eb';
              target.style.color = '#111827';
            }}
            onMouseLeave={(e) => {
              const target = e.target as HTMLButtonElement;
              target.style.backgroundColor = 'transparent';
              target.style.color = '#374151';
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <link.icon style={{ 
                width: '22px', 
                height: '22px',
                marginRight: collapsed ? '0' : '12px',
                transition: 'all 0.2s'
              }} />
              {!collapsed && (
                <>
                  <span>{link.label}</span>
                </>
              )}
            </div>
            {!collapsed && (
              <ChevronDown 
                style={{ 
                  width: '18px', 
                  height: '18px',
                  transition: 'transform 0.2s',
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
                }}
              />
            )}
          </button>
        ) : (
          <button
            onClick={() => handleNavigation(link.href)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '11px',
              fontSize: '15px',
              fontWeight: '500',
              borderRadius: '12px',
              backgroundColor: link.label === 'Dashboard' ? '#f97316' : 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: link.label === 'Dashboard' ? 'white' : '#374151',
              transition: 'all 0.2s',
              marginLeft: level > 0 ? '24px' : '0',
              boxShadow: link.label === 'Dashboard' ? '0 10px 15px -3px rgba(249, 115, 22, 0.25)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (link.label !== 'Dashboard') {
                const target = e.target as HTMLButtonElement;
                target.style.backgroundColor = '#e5e7eb';
                target.style.color = '#111827';
              }
            }}
            onMouseLeave={(e) => {
              if (link.label !== 'Dashboard') {
                const target = e.target as HTMLButtonElement;
                target.style.backgroundColor = 'transparent';
                target.style.color = '#374151';
              }
            }}
            title={collapsed ? link.label : undefined}
          >
            <link.icon style={{ 
              width: '22px', 
              height: '22px',
              marginRight: collapsed ? '0' : '12px',
              transition: 'all 0.2s'
            }} />
            {!collapsed && (
              <>
                <span>{link.label}</span>
              </>
            )}
          </button>
        )}
        
        {/* Render children if expanded and not collapsed */}
        {hasChildren && isExpanded && !collapsed && (
          <div style={{ 
            marginTop: '4px', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '4px',
            marginLeft: '12px'
          }}>
            {link.children?.map((child: any) => renderNavLink(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside 
      style={{ 
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#f3f4f6',
        width: collapsed ? '64px' : '250px',
        transition: 'all 0.3s ease',
        borderTopRightRadius: '24px',
        borderBottomRightRadius: '24px',
        overflow: 'hidden'
      }}
    >
      {/* Logo & Collapse Button */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        padding: '16px' 
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden'
            }}>
              <img 
                src="/ordira-logo-black.svg" 
                alt="Ordira Logo" 
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#f3f4f6'
                }}
                onError={(e) => {
                  console.log('Image failed to load:', e);
                }}
                onLoad={() => {
                  console.log('Image loaded successfully');
                }}
              />
            </div>
          </div>
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            padding: '6px',
            borderRadius: '8px',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            const target = e.target as HTMLButtonElement;
            target.style.backgroundColor = '#e5e7eb';
          }}
          onMouseLeave={(e) => {
            const target = e.target as HTMLButtonElement;
            target.style.backgroundColor = 'transparent';
          }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight style={{ width: '16px', height: '16px', color: '#4b5563' }} />
          ) : (
            <ChevronLeft style={{ width: '16px', height: '16px', color: '#4b5563' }} />
          )}
        </button>
      </div>


      {/* Navigation */}
      <nav style={{ 
        flex: 1, 
        padding: '14px 16px 16px 16px', 
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        {/* All Navigation Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navigationSections.main.map(link => renderNavLink(link))}
          {navigationSections.analytics.map(link => renderNavLink(link))}
          {navigationSections.integrations.map(link => renderNavLink(link))}
        </div>
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {/* Settings */}
        <button
          onClick={() => setIsSettingsModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '11px',
            fontSize: '15px',
            fontWeight: '500',
            color: '#374151',
            borderRadius: '12px',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            const target = e.target as HTMLButtonElement;
            target.style.backgroundColor = '#e5e7eb';
            target.style.color = '#111827';
          }}
          onMouseLeave={(e) => {
            const target = e.target as HTMLButtonElement;
            target.style.backgroundColor = 'transparent';
            target.style.color = '#374151';
          }}
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings style={{ 
            width: '22px', 
            height: '22px',
            marginRight: collapsed ? '0' : '12px'
          }} />
          {!collapsed && 'Settings'}
        </button>
        
        {/* Help & Documentation */}
        <button
          onClick={() => window.open('https://docs.ordira.xyz', '_blank')}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '11px',
            fontSize: '15px',
            fontWeight: '500',
            color: '#374151',
            borderRadius: '12px',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            const target = e.target as HTMLButtonElement;
            target.style.backgroundColor = '#e5e7eb';
            target.style.color = '#111827';
          }}
          onMouseLeave={(e) => {
            const target = e.target as HTMLButtonElement;
            target.style.backgroundColor = 'transparent';
            target.style.color = '#374151';
          }}
          title={collapsed ? 'Help & Documentation' : undefined}
        >
          <LifeBuoy style={{ 
            width: '22px', 
            height: '22px',
            marginRight: collapsed ? '0' : '12px'
          }} />
          {!collapsed && 'Help & Docs'}
        </button>
      </div>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
      />
    </aside>
  );
}

// Mock header component
function TestHeader() {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      padding: '8px 18px',
      backgroundColor: 'white'
    }}>
      {/* Right side elements */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '24px'
      }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '16px',
            height: '16px',
            color: '#9ca3af'
          }} />
          <input 
            type="text" 
            placeholder="Search..." 
            style={{
              paddingLeft: '40px',
              paddingRight: '16px',
              paddingTop: '10px',
              paddingBottom: '10px',
              width: '256px',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              outline: 'none',
              backgroundColor: '#f9fafb',
              fontSize: '14px',
              transition: 'all 0.2s'
            }}
            onFocus={(e) => {
              e.target.style.backgroundColor = 'white';
              e.target.style.borderColor = '#f97316';
              e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.backgroundColor = '#f9fafb';
              e.target.style.borderColor = '#e5e7eb';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button style={{
            position: 'relative',
            padding: '12px',
            color: '#6b7280',
            backgroundColor: 'transparent',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            const target = e.target as HTMLButtonElement;
            target.style.color = '#374151';
            target.style.backgroundColor = '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            const target = e.target as HTMLButtonElement;
            target.style.color = '#6b7280';
            target.style.backgroundColor = 'transparent';
          }}>
            <Bell style={{ width: '20px', height: '20px' }} />
            <span style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              width: '20px',
              height: '20px',
              backgroundColor: '#f97316',
              color: 'white',
              fontSize: '12px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold'
            }}>
              3
            </span>
          </button>
        </div>

        {/* User Avatar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '8px',
          borderRadius: '12px',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          const target = e.target as HTMLDivElement;
          target.style.backgroundColor = '#f3f4f6';
        }}
        onMouseLeave={(e) => {
          const target = e.target as HTMLDivElement;
          target.style.backgroundColor = 'transparent';
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            background: 'linear-gradient(135deg, #f97316, #ea580c)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <span style={{
              color: 'white',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>TB</span>
          </div>
          <ChevronDown style={{
            width: '16px',
            height: '16px',
            color: '#9ca3af'
          }} />
        </div>
      </div>
    </header>
  );
}

// Mock card component
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {children}
    </div>
  );
}

function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-6 py-4 border-b border-gray-200 ${className}`}>
      {children}
    </div>
  );
}

function CardTitle({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={`text-lg font-semibold text-gray-900 ${className}`}>
      {children}
    </h3>
  );
}

export default function TestDashboardPage() {
  // Mock data
  const overviewStats = [
    {
      title: 'Total Customers',
      value: '567,899',
      change: '+2.5%',
      trend: 'up',
      icon: Users,
      color: 'text-green-600'
    },
    {
      title: 'Total Revenue',
      value: '$3,465 M',
      change: '+0.5%',
      trend: 'up',
      icon: DollarSign,
      color: 'text-green-600'
    },
    {
      title: 'Total Orders',
      value: '1,136 M',
      change: '-0.2%',
      trend: 'down',
      icon: ShoppingCart,
      color: 'text-red-600'
    },
    {
      title: 'Total Returns',
      value: '1,789',
      change: '+0.12%',
      trend: 'up',
      icon: ArrowUpRight,
      color: 'text-green-600'
    }
  ];

  const productCategories = [
    { name: 'Living room', percentage: 25, color: 'bg-purple-500' },
    { name: 'Kids', percentage: 17, color: 'bg-blue-400' },
    { name: 'Office', percentage: 13, color: 'bg-blue-600' },
    { name: 'Bedroom', percentage: 12, color: 'bg-pink-500' },
    { name: 'Kitchen', percentage: 9, color: 'bg-red-500' },
    { name: 'Bathroom', percentage: 8, color: 'bg-green-400' },
    { name: 'Dining room', percentage: 6, color: 'bg-orange-500' },
    { name: 'Decor', percentage: 5, color: 'bg-yellow-500' },
    { name: 'Lighting', percentage: 3, color: 'bg-teal-500' },
    { name: 'Outdoor', percentage: 2, color: 'bg-green-600' }
  ];

  const countries = [
    { name: 'Poland', percentage: 19 },
    { name: 'Austria', percentage: 15 },
    { name: 'Spain', percentage: 13 },
    { name: 'Romania', percentage: 12 },
    { name: 'France', percentage: 11 },
    { name: 'Italy', percentage: 11 },
    { name: 'Germany', percentage: 10 },
    { name: 'Ukraine', percentage: 9 }
  ];

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      backgroundColor: 'white',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Sidebar Navigation */}
      <TestSidebar />

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Top Header */}
        <TestHeader />

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="space-y-6">
            {/* Page Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
              <p className="text-gray-600 text-lg">Welcome back! Here's what's happening with your business today.</p>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {overviewStats.map((stat, index) => (
                <Card key={index} className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-3 rounded-xl ${stat.color.replace('text-', 'bg-').replace('-600', '-100')}`}>
                        <stat.icon className={`w-6 h-6 ${stat.color}`} />
                      </div>
                      <div className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        stat.trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {stat.trend === 'up' ? (
                          <TrendingUp className="w-3 h-3 mr-1" />
                        ) : (
                          <TrendingDown className="w-3 h-3 mr-1" />
                        )}
                        {stat.change}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600 mb-1">
                        {stat.title}
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {stat.value}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {/* Add Data Card */}
              <Card className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1 border-dashed border-2 border-gray-300 hover:border-orange-400 hover:bg-orange-50">
                <CardContent className="flex items-center justify-center h-full p-6">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Plus className="w-6 h-6 text-orange-600" />
                    </div>
                    <p className="text-sm font-medium text-gray-600">Add data</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Product Sales Chart */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-xl">
                    <div className="p-2 bg-blue-100 rounded-lg mr-3">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                    </div>
                    Product Sales
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Legend */}
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
                        <span className="text-sm font-medium text-gray-700">Gross margin</span>
                      </div>
                      <div className="flex items-center">
                        <div className="w-4 h-4 bg-orange-500 rounded-full mr-2"></div>
                        <span className="text-sm font-medium text-gray-700">Revenue</span>
                      </div>
                    </div>
                    
                    {/* Chart Placeholder */}
                    <div className="h-80 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-200">
                      <div className="text-center text-gray-500">
                        <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-30" />
                        <p className="text-lg font-medium mb-2">Product Sales Chart</p>
                        <p className="text-sm">Interactive chart visualization will be implemented here</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sales by Product Category */}
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-xl">
                    <div className="p-2 bg-green-100 rounded-lg mr-3">
                      <PieChart className="w-5 h-5 text-green-600" />
                    </div>
                    Sales by Product Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {productCategories.slice(0, 8).map((category, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center">
                          <div className={`w-4 h-4 rounded-full mr-3 ${category.color}`}></div>
                          <span className="text-sm font-medium text-gray-700">{category.name}</span>
                        </div>
                        <span className="text-sm font-bold text-gray-900">{category.percentage}%</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-gray-200">
                      <p className="text-xs text-gray-500 text-center">+2 more categories</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sales by Countries */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-xl">
                  <div className="p-2 bg-purple-100 rounded-lg mr-3">
                    <MapPin className="w-5 h-5 text-purple-600" />
                  </div>
                  Sales by Countries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {countries.map((country, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-gray-100 hover:to-gray-200 transition-all duration-200 border border-gray-200">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                          <span className="text-white text-xs font-bold">
                            {country.name.substring(0, 2).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-700">{country.name}</span>
                      </div>
                      <span className="text-sm font-bold text-gray-900 bg-white px-2 py-1 rounded-lg">{country.percentage}%</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
