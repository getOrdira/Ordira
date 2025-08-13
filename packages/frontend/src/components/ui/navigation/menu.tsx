// src/components/ui/navigation/menu.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { EllipsisVerticalIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const menuVariants = cva(
  // Base menu panel styles
  "absolute bg-white border border-gray-200 rounded-2xl shadow-lg z-50 py-2 min-w-[200px] max-w-[300px]",
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
  // Base item styles
  "flex items-center space-x-3 px-4 py-3 text-sm transition-colors cursor-pointer relative",
  {
    variants: {
      variant: {
        default: "text-[var(--dark)] hover:bg-gray-50",
        destructive: "text-[var(--error)] hover:bg-[var(--error)]/5",
        success: "text-[var(--success)] hover:bg-[var(--success)]/5",
        warning: "text-[var(--warning)] hover:bg-[var(--warning)]/5",
        primary: "text-[var(--accent)] hover:bg-[var(--accent)]/5"
      },
      disabled: {
        true: "opacity-50 cursor-not-allowed pointer-events-none",
        false: ""
      }
    },
    defaultVariants: {
      variant: "default",
      disabled: false
    }
  }
);

export interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  shortcut?: string;
  disabled?: boolean;
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'primary';
  onClick?: () => void;
  href?: string;
  subMenu?: MenuItem[];
  divider?: boolean; // Add divider after this item
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
    size,
    position,
    ...props
  }, ref) => {
    const [internalOpen, setInternalOpen] = useState(false);
    const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const submenuTimerRef = useRef<NodeJS.Timeout>();

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
        if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
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
      
      if (!item.subMenu) {
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
          <div
            role="menuitem"
            tabIndex={item.disabled ? -1 : 0}
            className={cn(
              menuItemVariants({ 
                variant: item.variant,
                disabled: item.disabled 
              })
            )}
            onClick={() => handleItemClick(item)}
            onMouseEnter={() => hasSubmenu && handleSubmenuHover(item.id)}
            onMouseLeave={() => hasSubmenu && handleSubmenuHover(null)}
          >
            {/* Icon */}
            {item.icon && (
              <div className="w-4 h-4 flex-shrink-0">
                {item.icon}
              </div>
            )}

            {/* Label */}
            <span className="flex-1 truncate">{item.label}</span>

            {/* Shortcut */}
            {item.shortcut && (
              <span className="text-xs text-[var(--muted)] font-mono">
                {item.shortcut}
              </span>
            )}

            {/* Submenu indicator */}
            {hasSubmenu && (
              <ChevronRightIcon className="w-4 h-4 text-[var(--muted)]" />
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
          </div>

          {/* Divider */}
          {item.divider && <MenuDivider />}
        </React.Fragment>
      );
    };

    return (
      <div ref={menuRef} className={cn("relative inline-block", className)} {...props}>
        {/* Trigger */}
        {trigger && (
          <div
            className={cn(
              "cursor-pointer",
              disabled && "opacity-50 cursor-not-allowed pointer-events-none",
              triggerClassName
            )}
            onClick={() => !disabled && handleOpenChange(!isOpen)}
          >
            {trigger}
          </div>
        )}

        {/* Menu Panel */}
        {isOpen && (
          <div
            ref={ref}
            className={cn(
              menuVariants({ size, position }),
              panelClassName
            )}
            role="menu"
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
const MenuDivider = () => (
  <div className="border-t border-gray-100 my-1" />
);

// Menu Label/Header Component
export interface MenuLabelProps {
  children: React.ReactNode;
  className?: string;
}

const MenuLabel = ({ children, className }: MenuLabelProps) => (
  <div className={cn(
    "px-4 py-2 text-xs font-medium text-[var(--muted)] uppercase tracking-wide",
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
          <div
            key={item.id}
            className={cn(
              menuItemVariants({ 
                variant: item.variant,
                disabled: item.disabled 
              })
            )}
            onClick={() => {
              if (!item.disabled) {
                item.onClick?.();
                hideContextMenu();
              }
            }}
          >
            {item.icon && (
              <div className="w-4 h-4 flex-shrink-0">
                {item.icon}
              </div>
            )}
            <span className="flex-1">{item.label}</span>
            {item.shortcut && (
              <span className="text-xs text-[var(--muted)] font-mono">
                {item.shortcut}
              </span>
            )}
          </div>
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

// Default Action Menu Trigger
export const MenuTrigger = ({ className, ...props }: React.HTMLAttributes<HTMLButtonElement>) => (
  <button
    type="button"
    className={cn(
      "p-2 rounded-lg text-[var(--muted)] hover:text-[var(--dark)] hover:bg-gray-100 transition-colors",
      className
    )}
    {...props}
  >
    <EllipsisVerticalIcon className="w-4 h-4" />
  </button>
);

export { Menu, MenuDivider, MenuLabel };
export default Menu;