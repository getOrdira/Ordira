// src/components/ui/layout/flex.tsx
'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const flexVariants = cva(
  // Base flex styles with Ordira typography
  "flex font-satoshi",
  {
    variants: {
      direction: {
        row: "flex-row",
        "row-reverse": "flex-row-reverse",
        col: "flex-col",
        "col-reverse": "flex-col-reverse"
      },
      wrap: {
        nowrap: "flex-nowrap",
        wrap: "flex-wrap",
        "wrap-reverse": "flex-wrap-reverse"
      },
      justify: {
        start: "justify-start",
        end: "justify-end", 
        center: "justify-center",
        between: "justify-between",
        around: "justify-around",
        evenly: "justify-evenly"
      },
      align: {
        start: "items-start",
        end: "items-end",
        center: "items-center",
        baseline: "items-baseline",
        stretch: "items-stretch"
      },
      gap: {
        none: "gap-0",
        xs: "gap-1",
        sm: "gap-2",
        md: "gap-4",
        lg: "gap-6",
        xl: "gap-8",
        "2xl": "gap-12"
      },
      grow: {
        0: "flex-grow-0",
        1: "flex-grow"
      },
      shrink: {
        0: "flex-shrink-0",
        1: "flex-shrink"
      }
    },
    defaultVariants: {
      direction: "row",
      wrap: "nowrap",
      justify: "start",
      align: "start",
      gap: "none",
      grow: 0,
      shrink: 1
    }
  }
);

export interface FlexProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof flexVariants> {
  as?: React.ElementType;
}

const Flex = React.forwardRef<HTMLDivElement, FlexProps>(
  ({ 
    className, 
    direction, 
    wrap, 
    justify, 
    align, 
    gap, 
    grow, 
    shrink, 
    as: Component = 'div',
    ...props 
  }, ref) => (
    <Component
      ref={ref}
      className={cn(flexVariants({ 
        direction, 
        wrap, 
        justify, 
        align, 
        gap, 
        grow, 
        shrink 
      }), className)}
      {...props}
    />
  )
);

Flex.displayName = "Flex";

// Row - Horizontal flex container (common pattern) with Ordira styling
export interface RowProps extends Omit<FlexProps, 'direction'> {
  gutter?: VariantProps<typeof flexVariants>['gap'];
}

const Row = React.forwardRef<HTMLDivElement, RowProps>(
  ({ gutter, gap, className, ...props }, ref) => (
    <Flex 
      ref={ref} 
      direction="row" 
      gap={gutter || gap}
      className={cn("font-satoshi", className)}
      {...props} 
    />
  )
);

Row.displayName = "Row";

// Column - Vertical flex container (common pattern) with Ordira styling
export interface ColumnProps extends Omit<FlexProps, 'direction'> {
  space?: VariantProps<typeof flexVariants>['gap'];
}

const Column = React.forwardRef<HTMLDivElement, ColumnProps>(
  ({ space, gap, className, ...props }, ref) => (
    <Flex 
      ref={ref} 
      direction="col" 
      gap={space || gap}
      className={cn("font-satoshi", className)}
      {...props} 
    />
  )
);

Column.displayName = "Column";

// Center - Center aligned flex container with Ordira styling
export interface CenterProps extends Omit<FlexProps, 'justify' | 'align'> {}

const Center = React.forwardRef<HTMLDivElement, CenterProps>(
  ({ className, ...props }, ref) => (
    <Flex 
      ref={ref} 
      justify="center" 
      align="center"
      className={cn("font-satoshi", className)}
      {...props} 
    />
  )
);

Center.displayName = "Center";

// Spacer - Flexible spacer element
export interface SpacerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'auto' | number;
  variant?: 'transparent' | 'subtle' | 'accent';
}

const Spacer = React.forwardRef<HTMLDivElement, SpacerProps>(
  ({ size = 'auto', variant = 'transparent', className, ...props }, ref) => {
    const variantStyles = {
      transparent: "",
      subtle: "bg-[var(--border)]",
      accent: "bg-[var(--primary)]"
    };

    return (
      <div
        ref={ref}
        className={cn(
          "font-satoshi",
          size === 'auto' ? "flex-1" : "",
          variantStyles[variant],
          className
        )}
        style={typeof size === 'number' ? { flexBasis: `${size}px` } : undefined}
        {...props}
      />
    );
  }
);

Spacer.displayName = "Spacer";

// Stack - Vertical stack with consistent spacing and Ordira styling
export interface StackProps extends Omit<FlexProps, 'direction'> {
  space?: VariantProps<typeof flexVariants>['gap'];
  divider?: React.ReactNode;
}

const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ space = 'md', gap, divider, children, className, ...props }, ref) => {
    if (divider) {
      const childArray = React.Children.toArray(children);
      const childrenWithDividers = childArray.reduce<React.ReactNode[]>((acc, child, index) => {
        acc.push(child);
        if (index < childArray.length - 1) {
          acc.push(
            <div key={`divider-${index}`} className="font-satoshi">
              {divider}
            </div>
          );
        }
        return acc;
      }, []);

      return (
        <Flex 
          ref={ref} 
          direction="col" 
          gap={space || gap}
          className={cn("font-satoshi", className)}
          {...props}
        >
          {childrenWithDividers}
        </Flex>
      );
    }

    return (
      <Flex 
        ref={ref} 
        direction="col" 
        gap={space || gap}
        className={cn("font-satoshi", className)}
        {...props}
      >
        {children}
      </Flex>
    );
  }
);

Stack.displayName = "Stack";

// HStack - Horizontal stack with consistent spacing and Ordira styling
export interface HStackProps extends Omit<FlexProps, 'direction'> {
  space?: VariantProps<typeof flexVariants>['gap'];
  divider?: React.ReactNode;
}

const HStack = React.forwardRef<HTMLDivElement, HStackProps>(
  ({ space = 'md', gap, divider, children, className, ...props }, ref) => {
    if (divider) {
      const childArray = React.Children.toArray(children);
      const childrenWithDividers = childArray.reduce<React.ReactNode[]>((acc, child, index) => {
        acc.push(child);
        if (index < childArray.length - 1) {
          acc.push(
            <div key={`divider-${index}`} className="flex items-center font-satoshi">
              {divider}
            </div>
          );
        }
        return acc;
      }, []);

      return (
        <Flex 
          ref={ref} 
          direction="row" 
          gap={space || gap} 
          align="center"
          className={cn("font-satoshi", className)}
          {...props}
        >
          {childrenWithDividers}
        </Flex>
      );
    }

    return (
      <Flex 
        ref={ref} 
        direction="row" 
        gap={space || gap} 
        align="center"
        className={cn("font-satoshi", className)}
        {...props}
      >
        {children}
      </Flex>
    );
  }
);

HStack.displayName = "HStack";

// Between - Flex container with space-between and Ordira styling
export interface BetweenProps extends Omit<FlexProps, 'justify'> {}

const Between = React.forwardRef<HTMLDivElement, BetweenProps>(
  ({ align = 'center', className, ...props }, ref) => (
    <Flex 
      ref={ref} 
      justify="between" 
      align={align}
      className={cn("font-satoshi", className)}
      {...props} 
    />
  )
);

Between.displayName = "Between";

// FlexItem - Individual flex item with control and Ordira styling
export interface FlexItemProps extends React.HTMLAttributes<HTMLDivElement> {
  flex?: string | number;
  grow?: 0 | 1;
  shrink?: 0 | 1;
  basis?: string | number;
  order?: number;
  alignSelf?: 'auto' | 'start' | 'end' | 'center' | 'baseline' | 'stretch';
}

const FlexItem = React.forwardRef<HTMLDivElement, FlexItemProps>(
  ({ 
    className, 
    flex, 
    grow, 
    shrink, 
    basis, 
    order, 
    alignSelf,
    style,
    ...props 
  }, ref) => {
    const itemClassName = cn(
      "font-satoshi",
      grow === 1 && "flex-grow",
      grow === 0 && "flex-grow-0",
      shrink === 1 && "flex-shrink",
      shrink === 0 && "flex-shrink-0",
      alignSelf === 'start' && "self-start",
      alignSelf === 'end' && "self-end",
      alignSelf === 'center' && "self-center",
      alignSelf === 'baseline' && "self-baseline",
      alignSelf === 'stretch' && "self-stretch",
      className
    );

    const itemStyle = {
      ...style,
      ...(flex !== undefined && { flex }),
      ...(basis !== undefined && { flexBasis: typeof basis === 'number' ? `${basis}px` : basis }),
      ...(order !== undefined && { order })
    };

    return (
      <div
        ref={ref}
        className={itemClassName}
        style={itemStyle}
        {...props}
      />
    );
  }
);

FlexItem.displayName = "FlexItem";

// Dashboard Layout Components - Specific to dashboard layouts

// Header Flex - For dashboard headers with proper spacing
export interface HeaderFlexProps extends Omit<FlexProps, 'align' | 'justify'> {
  variant?: 'default' | 'elevated' | 'minimal';
}

const HeaderFlex = React.forwardRef<HTMLDivElement, HeaderFlexProps>(
  ({ variant = 'default', className, ...props }, ref) => {
    const variantStyles = {
      default: "bg-[var(--background)] border-b border-[var(--border)]",
      elevated: "bg-[var(--card-bg)] shadow-[var(--card-shadow)] border border-[var(--card-border)]",
      minimal: "bg-transparent"
    };

    return (
      <Flex
        ref={ref}
        align="center"
        justify="between"
        className={cn(
          "px-6 py-4 font-satoshi",
          variantStyles[variant],
          className
        )}
        {...props}
      />
    );
  }
);

HeaderFlex.displayName = "HeaderFlex";

// Sidebar Flex - For sidebar navigation layouts
export interface SidebarFlexProps extends Omit<FlexProps, 'direction'> {
  variant?: 'default' | 'compact' | 'minimal';
}

const SidebarFlex = React.forwardRef<HTMLDivElement, SidebarFlexProps>(
  ({ variant = 'default', className, ...props }, ref) => {
    const variantStyles = {
      default: "bg-[var(--card-bg)] border-r border-[var(--border)]",
      compact: "bg-[var(--background-secondary)] border-r border-[var(--border)]",
      minimal: "bg-transparent"
    };

    return (
      <Flex
        ref={ref}
        direction="col"
        className={cn(
          "font-satoshi",
          variantStyles[variant],
          className
        )}
        {...props}
      />
    );
  }
);

SidebarFlex.displayName = "SidebarFlex";

// Metric Flex - For dashboard metrics and KPI layouts
export interface MetricFlexProps extends Omit<FlexProps, 'direction' | 'align'> {
  variant?: 'default' | 'card' | 'inline';
}

const MetricFlex = React.forwardRef<HTMLDivElement, MetricFlexProps>(
  ({ variant = 'default', className, gap = 'md', ...props }, ref) => {
    const variantStyles = {
      default: "",
      card: "bg-[var(--card-bg)] rounded-2xl p-6 border border-[var(--card-border)] shadow-[var(--card-shadow)]",
      inline: "bg-[var(--background-secondary)] rounded-xl p-4"
    };

    return (
      <Flex
        ref={ref}
        direction="col"
        align="start"
        gap={gap}
        className={cn(
          "font-satoshi",
          variantStyles[variant],
          className
        )}
        {...props}
      />
    );
  }
);

MetricFlex.displayName = "MetricFlex";

// Action Flex - For action buttons and controls
export interface ActionFlexProps extends Omit<FlexProps, 'align'> {
  variant?: 'default' | 'toolbar' | 'floating';
}

const ActionFlex = React.forwardRef<HTMLDivElement, ActionFlexProps>(
  ({ variant = 'default', className, gap = 'sm', ...props }, ref) => {
    const variantStyles = {
      default: "",
      toolbar: "bg-[var(--background-secondary)] rounded-xl p-2 border border-[var(--border)]",
      floating: "bg-[var(--card-bg)] rounded-2xl p-3 shadow-[var(--card-shadow-lg)] border border-[var(--card-border)]"
    };

    return (
      <Flex
        ref={ref}
        align="center"
        gap={gap}
        className={cn(
          "font-satoshi",
          variantStyles[variant],
          className
        )}
        {...props}
      />
    );
  }
);

ActionFlex.displayName = "ActionFlex";

// Responsive flex utilities with Ordira styling
export interface ResponsiveFlexProps extends FlexProps {
  sm?: Partial<Pick<FlexProps, 'direction' | 'justify' | 'align' | 'wrap'>>;
  md?: Partial<Pick<FlexProps, 'direction' | 'justify' | 'align' | 'wrap'>>;
  lg?: Partial<Pick<FlexProps, 'direction' | 'justify' | 'align' | 'wrap'>>;
  xl?: Partial<Pick<FlexProps, 'direction' | 'justify' | 'align' | 'wrap'>>;
}

const ResponsiveFlex = React.forwardRef<HTMLDivElement, ResponsiveFlexProps>(
  ({ sm, md, lg, xl, className, ...props }, ref) => {
    const responsiveClasses = cn(
      // SM breakpoint classes
      sm?.direction === 'row' && 'sm:flex-row',
      sm?.direction === 'col' && 'sm:flex-col',
      sm?.justify === 'start' && 'sm:justify-start',
      sm?.justify === 'center' && 'sm:justify-center',
      sm?.justify === 'between' && 'sm:justify-between',
      sm?.align === 'start' && 'sm:items-start',
      sm?.align === 'center' && 'sm:items-center',
      sm?.align === 'end' && 'sm:items-end',
      
      // MD breakpoint classes  
      md?.direction === 'row' && 'md:flex-row',
      md?.direction === 'col' && 'md:flex-col',
      md?.justify === 'start' && 'md:justify-start',
      md?.justify === 'center' && 'md:justify-center',
      md?.justify === 'between' && 'md:justify-between',
      md?.align === 'start' && 'md:items-start',
      md?.align === 'center' && 'md:items-center',
      md?.align === 'end' && 'md:items-end',
      
      // LG breakpoint classes
      lg?.direction === 'row' && 'lg:flex-row',
      lg?.direction === 'col' && 'lg:flex-col',
      lg?.justify === 'start' && 'lg:justify-start',
      lg?.justify === 'center' && 'lg:justify-center',
      lg?.justify === 'between' && 'lg:justify-between',
      lg?.align === 'start' && 'lg:items-start',
      lg?.align === 'center' && 'lg:items-center',
      lg?.align === 'end' && 'lg:items-end',
      
      // XL breakpoint classes
      xl?.direction === 'row' && 'xl:flex-row',
      xl?.direction === 'col' && 'xl:flex-col',
      xl?.justify === 'start' && 'xl:justify-start',
      xl?.justify === 'center' && 'xl:justify-center',
      xl?.justify === 'between' && 'xl:justify-between',
      xl?.align === 'start' && 'xl:items-start',
      xl?.align === 'center' && 'xl:items-center',
      xl?.align === 'end' && 'xl:items-end'
    );

    return (
      <Flex
        ref={ref}
        className={cn("font-satoshi", responsiveClasses, className)}
        {...props}
      />
    );
  }
);

ResponsiveFlex.displayName = "ResponsiveFlex";

export { 
  Flex, 
  Row, 
  Column, 
  Center, 
  Spacer, 
  Stack, 
  HStack, 
  Between, 
  FlexItem,
  HeaderFlex,
  SidebarFlex,
  MetricFlex,
  ActionFlex,
  ResponsiveFlex,
  flexVariants 
};