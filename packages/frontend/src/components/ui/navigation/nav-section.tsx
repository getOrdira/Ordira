// src/components/ui/navigation/nav-section.tsx
'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight } from 'lucide-react';

const navSectionVariants = cva(
  // Base styles
  "w-full",
  {
    variants: {
      variant: {
        default: "space-y-1",
        compact: "space-y-0.5",
        spaced: "space-y-2"
      },
      collapsible: {
        true: "",
        false: ""
      }
    },
    defaultVariants: {
      variant: "default",
      collapsible: false
    }
  }
);

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon?: React.ElementType;
  badge?: string | number;
  children?: NavItem[];
  disabled?: boolean;
  external?: boolean;
}

export interface NavSectionProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof navSectionVariants> {
  title?: string;
  items: NavItem[];
  activeItem?: string;
  collapsed?: boolean;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  onItemClick?: (item: NavItem) => void;
  onToggleCollapse?: (collapsed: boolean) => void;
  showIcons?: boolean;
  showBadges?: boolean;
  level?: number; // For nested sections
  className?: string;
}

const NavSection = React.forwardRef<HTMLDivElement, NavSectionProps>(
  ({ 
    title,
    items,
    activeItem,
    collapsed = false,
    collapsible = false,
    defaultExpanded = true,
    onItemClick,
    onToggleCollapse,
    showIcons = true,
    showBadges = true,
    level = 0,
    variant = "default",
    className,
    ...props 
  }, ref) => {
    const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
    const [expandedItems, setExpandedItems] = React.useState<string[]>([]);
    
    const isCollapsed = collapsible ? !isExpanded : collapsed;
    
    const toggleExpanded = () => {
      if (collapsible) {
        const newExpanded = !isExpanded;
        setIsExpanded(newExpanded);
        onToggleCollapse?.(!newExpanded);
      }
    };
    
    const toggleItemExpanded = (itemId: string) => {
      setExpandedItems(prev => 
        prev.includes(itemId) 
          ? prev.filter(id => id !== itemId)
          : [...prev, itemId]
      );
    };
    
    const isItemActive = (item: NavItem): boolean => {
      if (activeItem === item.href) return true;
      if (item.children) {
        return item.children.some(child => isItemActive(child));
      }
      return false;
    };
    
    const renderNavItem = (item: NavItem, itemLevel: number = 0): React.ReactNode => {
      const hasChildren = item.children && item.children.length > 0;
      const isExpandedItem = expandedItems.includes(item.id);
      const isActive = isItemActive(item);
      const Icon = item.icon;
      
      const itemClasses = cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-satoshi-medium transition-all duration-200",
        "hover:bg-[var(--muted)] hover:text-[var(--muted-foreground)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
        isActive && "bg-[var(--primary)]/10 text-[var(--primary)] font-satoshi-semibold",
        item.disabled && "opacity-50 cursor-not-allowed",
        itemLevel > 0 && "ml-4"
      );
      
      const handleItemClick = () => {
        if (item.disabled) return;
        
        if (hasChildren) {
          toggleItemExpanded(item.id);
        }
        
        onItemClick?.(item);
      };
      
      const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleItemClick();
        }
      };
      
      return (
        <div key={item.id}>
          <div
            className={itemClasses}
            onClick={handleItemClick}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="button"
            aria-expanded={hasChildren ? isExpandedItem : undefined}
            aria-current={isActive ? 'page' : undefined}
          >
            {/* Icon */}
            {showIcons && Icon && (
              <Icon className={cn(
                "w-4 h-4 flex-shrink-0",
                isActive ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"
              )} />
            )}
            
            {/* Label */}
            <span className="flex-1 truncate">{item.label}</span>
            
            {/* Badge */}
            {showBadges && item.badge && (
              <span className={cn(
                "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-medium",
                isActive 
                  ? "bg-[var(--primary)] text-white" 
                  : "bg-[var(--muted)] text-[var(--muted-foreground)]"
              )}>
                {item.badge}
              </span>
            )}
            
            {/* Expand/Collapse Icon */}
            {hasChildren && (
              <div className="flex-shrink-0">
                {isExpandedItem ? (
                  <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)]" />
                )}
              </div>
            )}
          </div>
          
          {/* Children */}
          {hasChildren && isExpandedItem && (
            <div className="mt-1 space-y-1">
              {item.children?.map(child => renderNavItem(child, itemLevel + 1))}
            </div>
          )}
        </div>
      );
    };
    
    return (
      <div
        ref={ref}
        className={cn(navSectionVariants({ variant, collapsible }), className)}
        {...props}
      >
        {/* Section Title */}
        {title && (
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-xs font-satoshi-bold text-[var(--muted-foreground)] uppercase tracking-wider",
              collapsible && "cursor-pointer hover:text-[var(--foreground)] transition-colors",
              level > 0 && "ml-4"
            )}
            onClick={collapsible ? toggleExpanded : undefined}
            onKeyDown={(e) => {
              if (collapsible && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                toggleExpanded();
              }
            }}
            tabIndex={collapsible ? 0 : undefined}
            role={collapsible ? "button" : undefined}
            aria-expanded={collapsible ? isExpanded : undefined}
          >
            {title}
            {collapsible && (
              <div className="flex-shrink-0">
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Navigation Items */}
        {!isCollapsed && (
          <div className="space-y-1">
            {items.map(item => renderNavItem(item, level))}
          </div>
        )}
      </div>
    );
  }
);

NavSection.displayName = "NavSection";

// Convenience component for collapsible sections
export const CollapsibleNavSection = React.forwardRef<HTMLDivElement, Omit<NavSectionProps, 'collapsible'>>(
  (props, ref) => <NavSection {...props} collapsible={true} ref={ref} />
);
CollapsibleNavSection.displayName = "CollapsibleNavSection";

// Convenience component for compact sections
export const CompactNavSection = React.forwardRef<HTMLDivElement, Omit<NavSectionProps, 'variant'>>(
  (props, ref) => <NavSection {...props} variant="compact" ref={ref} />
);
CompactNavSection.displayName = "CompactNavSection";

export { NavSection };
export default NavSection;
