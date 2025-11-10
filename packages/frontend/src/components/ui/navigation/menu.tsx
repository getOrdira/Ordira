// src/components/ui/navigation/menu.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/utils';
import { EllipsisVerticalIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const menuVariants = cva(
  // Base menu panel styles with Ordira branding
  "absolute bg-white border border-gray-200 rounded-2xl shadow-xl z-50 py-2 min-w-[200px] max-w-[320px] backdrop-blur-sm",
  {
    variants: {
      size: {
        sm: "min-w-[160px] text-sm",
        md: "min-w-[200px] text-sm",
        lg: "min-w-[240px] text-base",
        xl: "min-w-[280px] text-base"
      },
      position: {
        "bottom-left": "top-full left-0 mt-2",
        "bottom-right": "top-full right-0 mt-2",
        "bottom-center": "top-full left-1/2 transform -translate-x-1/2 mt-2",
        "top-left": "bottom-full left-0 mb-2",
        "top-right": "bottom-full right-0 mb-2",
        "top-center": "bottom-full left-1/2 transform -translate-x-1/2 mb-2",
        "right": "left-full top-0 ml-2",
        "left": "right-full top-0 mr-2"
      }
    },
    defaultVariants: {
      size: "md",
      position: "bottom-right"
    }
  }
);

const menuItemVariants = cva(
  // Base item styles with Ordira branding
  "flex items-center space-x-3 px-3 py-2.5 text-sm font-satoshi-regular transition-all duration-200 cursor-pointer relative rounded-lg mx-2",
  {
    variants: {
      variant: {
        default: "text-[var(--ordira-accent)] hover:bg-gray-50 hover:text-[var(--primary)]",
        destructive: "text-[var(--error)] hover:bg-[var(--error)]/5",
        success: "text-[var(--success)] hover:bg-[var(--success)]/5",
        warning: "text-[var(--warning)] hover:bg-[var(--warning)]/5",
        primary: "text-[var(--primary)] hover:bg-[var(--primary)]/10"
      },
      disabled: {
        true: "opacity-50 cursor-not-allowed pointer-events-none",
        false: ""
      },
      active: {
        true: "bg-[var(--primary)]/10 text-[var(--primary)]",
        false: ""
      }
    },
    defaultVariants: {
      variant: "default",
      disabled: false,
      active: false
    }
  }
);

export interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  active?: boolean;
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'primary';
  onClick?: () => void;
  href?: string;
  subMenu?: MenuItem[];
  divider?: boolean; // Add divider after this item
  badge?: string | number;
  description?: string; // Optional description text
}

export interface MenuProps extends VariantProps<typeof menuVariants> {
  trigger?: React.ReactNode;
  items: MenuItem[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  className?: string;
  panelClassName?: string;
  triggerClassName?: string;
  triggerAsChild?: boolean;
  closeOnItemClick?: boolean;
}

const Menu = React.forwardRef<HTMLDivElement, MenuProps>(
  ({
    trigger,
    items,
    open: controlledOpen,
    onOpenChange,
    disabled = false,
    className,
    panelClassName,
    triggerClassName,
    triggerAsChild = false,
    closeOnItemClick = true,
    size,
    position,
    ...props
  }, ref) => {
    const [internalOpen, setInternalOpen] = useState(false);
    const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const submenuTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

    // Handle opening/closing
    const handleOpenChange = (newOpen: boolean) => {
      setInternalOpen(newOpen);
      onOpenChange?.(newOpen);
      if (!newOpen) {
        setActiveSubmenu(null);
      }
    };

    // Handle clicking outside to close menu
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          menuRef.current && 
          !menuRef.current.contains(event.target as Node) &&
          triggerRef.current &&
          !triggerRef.current.contains(event.target as Node)
        ) {
          handleOpenChange(false);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [isOpen]);

    // Handle escape key
    useEffect(() => {
      const handleEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && isOpen) {
          handleOpenChange(false);
        }
      };

      if (isOpen) {
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
      }
    }, [isOpen]);

    const handleItemClick = (item: MenuItem) => {
      if (item.disabled) return;

      if (item.subMenu && item.subMenu.length > 0) {
        setActiveSubmenu(activeSubmenu === item.id ? null : item.id);
        return;
      }

      item.onClick?.();
      
      if (!item.subMenu && closeOnItemClick) {
        handleOpenChange(false);
      }
    };

    const handleSubmenuHover = (itemId: string | null) => {
      if (submenuTimerRef.current) {
        clearTimeout(submenuTimerRef.current);
      }

      submenuTimerRef.current = setTimeout(() => {
        setActiveSubmenu(itemId);
      }, 150);
    };

    const renderMenuItem = (item: MenuItem, isSubmenu = false) => {
      const hasSubmenu = item.subMenu && item.subMenu.length > 0;
      const isActive = activeSubmenu === item.id;

      return (
        <React.Fragment key={item.id}>
          {item.href ? (
            <a
              href={item.href}
              role="menuitem"
              tabIndex={item.disabled ? -1 : 0}
              className={cn(
                menuItemVariants({ 
                  variant: item.variant,
                  disabled: item.disabled,
                  active: item.active
                })
              )}
              onMouseEnter={() => hasSubmenu && handleSubmenuHover(item.id)}
              onMouseLeave={() => hasSubmenu && handleSubmenuHover(null)}
            >
              {/* Icon */}
              {item.icon && (
                <div className="w-4 h-4 flex-shrink-0 text-current">
                  {item.icon}
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="text-xs bg-gray-100 text-[var(--muted)] px-1.5 py-0.5 rounded-full font-satoshi-medium ml-2">
                      {item.badge}
                    </span>
                  )}
                </div>
                {item.description && (
                  <p className="text-xs text-[var(--muted)] font-satoshi-regular mt-0.5 truncate">
                    {item.description}
                  </p>
                )}
              </div>

              {/* Shortcut */}
              {item.shortcut && (
                <span className="text-xs text-[var(--muted)] font-satoshi-medium ml-2">
                  {item.shortcut}
                </span>
              )}

              {/* Submenu indicator */}
              {hasSubmenu && (
                <ChevronRightIcon className="w-4 h-4 text-[var(--muted)] ml-2" />
              )}
            </a>
          ) : (
            <button
              type="button"
              role="menuitem"
              tabIndex={item.disabled ? -1 : 0}
              className={cn(
                menuItemVariants({ 
                  variant: item.variant,
                  disabled: item.disabled,
                  active: item.active
                }),
                "w-full text-left"
              )}
              onClick={() => handleItemClick(item)}
              onMouseEnter={() => hasSubmenu && handleSubmenuHover(item.id)}
              onMouseLeave={() => hasSubmenu && handleSubmenuHover(null)}
            >
              {/* Icon */}
              {item.icon && (
                <div className="w-4 h-4 flex-shrink-0 text-current">
                  {item.icon}
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="text-xs bg-gray-100 text-[var(--muted)] px-1.5 py-0.5 rounded-full font-satoshi-medium ml-2">
                      {item.badge}
                    </span>
                  )}
                </div>
                {item.description && (
                  <p className="text-xs text-[var(--muted)] font-satoshi-regular mt-0.5 truncate">
                    {item.description}
                  </p>
                )}
              </div>

              {/* Shortcut */}
              {item.shortcut && (
                <span className="text-xs text-[var(--muted)] font-satoshi-medium ml-2">
                  {item.shortcut}
                </span>
              )}

              {/* Submenu indicator */}
              {hasSubmenu && (
                <ChevronRightIcon className="w-4 h-4 text-[var(--muted)] ml-2" />
              )}
            </button>
          )}

          {/* Submenu */}
          {hasSubmenu && isActive && (
            <div className={cn(
              menuVariants({ size, position: "right" }),
              "left-full top-0 ml-1"
            )}>
              {item.subMenu!.map(subItem => renderMenuItem(subItem, true))}
            </div>
          )}

          {/* Divider */}
          {item.divider && <MenuDivider />}
        </React.Fragment>
      );
    };

    return (
      <div className={cn("relative inline-block", className)} {...props}>
        {/* Trigger */}
        {trigger && (
          <div
            ref={triggerRef}
            className={cn(
              "cursor-pointer",
              disabled && "opacity-50 cursor-not-allowed pointer-events-none",
              triggerClassName
            )}
            onClick={() => !disabled && handleOpenChange(!isOpen)}
            role="button"
            aria-expanded={isOpen}
            aria-haspopup="menu"
            tabIndex={disabled ? -1 : 0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                !disabled && handleOpenChange(!isOpen);
              }
            }}
          >
            {trigger}
          </div>
        )}

        {/* Menu Panel */}
        {isOpen && (
          <div
            ref={menuRef}
            className={cn(
              menuVariants({ size, position }),
              panelClassName
            )}
            role="menu"
            aria-orientation="vertical"
          >
            {items.map(item => renderMenuItem(item))}
          </div>
        )}
      </div>
    );
  }
);

Menu.displayName = "Menu";

// Menu Divider Component
const MenuDivider = ({ className }: { className?: string }) => (
  <div className={cn("border-t border-gray-100 my-2 mx-2", className)} />
);

// Menu Label/Header Component
export interface MenuLabelProps {
  children: React.ReactNode;
  className?: string;
}

const MenuLabel = ({ children, className }: MenuLabelProps) => (
  <div className={cn(
    "px-3 py-2 text-xs font-satoshi-medium text-[var(--muted)] uppercase tracking-wide",
    className
  )}>
    {children}
  </div>
);

// Context Menu Hook for right-click menus
export const useContextMenu = () => {
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: MenuItem[];
  } | null>(null);

  const showContextMenu = (event: React.MouseEvent, items: MenuItem[]) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      items
    });
  };

  const hideContextMenu = () => {
    setContextMenu(null);
  };

  const ContextMenuPortal = contextMenu ? (
    <div
      className="fixed inset-0 z-[100]"
      onContextMenu={(e) => e.preventDefault()}
      onClick={hideContextMenu}
    >
      <div
        className={cn(
          menuVariants({ size: "md" }),
          "fixed"
        )}
        style={{
          left: contextMenu.x,
          top: contextMenu.y,
          position: 'fixed'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {contextMenu.items.map(item => (
          <button
            key={item.id}
            type="button"
            className={cn(
              menuItemVariants({ 
                variant: item.variant,
                disabled: item.disabled 
              }),
              "w-full text-left"
            )}
            onClick={() => {
              if (!item.disabled) {
                item.onClick?.();
                hideContextMenu();
              }
            }}
          >
            {item.icon && (
              <div className="w-4 h-4 flex-shrink-0 text-current">
                {item.icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <span className="truncate">{item.label}</span>
              {item.description && (
                <p className="text-xs text-[var(--muted)] font-satoshi-regular mt-0.5 truncate">
                  {item.description}
                </p>
              )}
            </div>
            {item.shortcut && (
              <span className="text-xs text-[var(--muted)] font-satoshi-medium ml-2">
                {item.shortcut}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  ) : null;

  return {
    showContextMenu,
    hideContextMenu,
    ContextMenuPortal
  };
};

// Default Action Menu Trigger with Ordira styling
export const MenuTrigger = ({ className, ...props }: React.HTMLAttributes<HTMLButtonElement>) => (
  <button
    type="button"
    className={cn(
      "p-2 rounded-lg text-[var(--muted)] hover:text-[var(--primary)] hover:bg-gray-100 transition-all duration-200",
      className
    )}
    {...props}
  >
    <EllipsisVerticalIcon className="w-4 h-4" />
  </button>
);

export { Menu, MenuDivider, MenuLabel };
export default Menu;