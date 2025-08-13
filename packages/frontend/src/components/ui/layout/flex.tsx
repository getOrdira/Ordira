// src/components/ui/layout/flex.tsx
'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const flexVariants = cva(
  // Base flex styles
  "flex",
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

// Row - Horizontal flex container (common pattern)
export interface RowProps extends Omit<FlexProps, 'direction'> {
  gutter?: VariantProps<typeof flexVariants>['gap'];
}

const Row = React.forwardRef<HTMLDivElement, RowProps>(
  ({ gutter, gap, ...props }, ref) => (
    <Flex 
      ref={ref} 
      direction="row" 
      gap={gutter || gap} 
      {...props} 
    />
  )
);

Row.displayName = "Row";

// Column - Vertical flex container (common pattern)
export interface ColumnProps extends Omit<FlexProps, 'direction'> {
  space?: VariantProps<typeof flexVariants>['gap'];
}

const Column = React.forwardRef<HTMLDivElement, ColumnProps>(
  ({ space, gap, ...props }, ref) => (
    <Flex 
      ref={ref} 
      direction="col" 
      gap={space || gap} 
      {...props} 
    />
  )
);

Column.displayName = "Column";

// Center - Center aligned flex container
export interface CenterProps extends Omit<FlexProps, 'justify' | 'align'> {}

const Center = React.forwardRef<HTMLDivElement, CenterProps>(
  (props, ref) => (
    <Flex 
      ref={ref} 
      justify="center" 
      align="center" 
      {...props} 
    />
  )
);

Center.displayName = "Center";

// Spacer - Flexible spacer element
export interface SpacerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'auto' | number;
}

const Spacer = React.forwardRef<HTMLDivElement, SpacerProps>(
  ({ size = 'auto', className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        size === 'auto' ? "flex-1" : "",
        className
      )}
      style={typeof size === 'number' ? { flexBasis: `${size}px` } : undefined}
      {...props}
    />
  )
);

Spacer.displayName = "Spacer";

// Stack - Vertical stack with consistent spacing
export interface StackProps extends Omit<FlexProps, 'direction'> {
  space?: VariantProps<typeof flexVariants>['gap'];
  divider?: React.ReactNode;
}

const Stack = React.forwardRef<HTMLDivElement, StackProps>(
  ({ space = 'md', gap, divider, children, ...props }, ref) => {
    if (divider) {
      const childArray = React.Children.toArray(children);
      const childrenWithDividers = childArray.reduce<React.ReactNode[]>((acc, child, index) => {
        acc.push(child);
        if (index < childArray.length - 1) {
          acc.push(
            <div key={`divider-${index}`}>
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
        {...props}
      >
        {children}
      </Flex>
    );
  }
);

Stack.displayName = "Stack";

// HStack - Horizontal stack with consistent spacing
export interface HStackProps extends Omit<FlexProps, 'direction'> {
  space?: VariantProps<typeof flexVariants>['gap'];
  divider?: React.ReactNode;
}

const HStack = React.forwardRef<HTMLDivElement, HStackProps>(
  ({ space = 'md', gap, divider, children, ...props }, ref) => {
    if (divider) {
      const childArray = React.Children.toArray(children);
      const childrenWithDividers = childArray.reduce<React.ReactNode[]>((acc, child, index) => {
        acc.push(child);
        if (index < childArray.length - 1) {
          acc.push(
            <div key={`divider-${index}`} className="flex items-center">
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
        {...props}
      >
        {children}
      </Flex>
    );
  }
);

HStack.displayName = "HStack";

// Between - Flex container with space-between
export interface BetweenProps extends Omit<FlexProps, 'justify'> {}

const Between = React.forwardRef<HTMLDivElement, BetweenProps>(
  ({ align = 'center', ...props }, ref) => (
    <Flex 
      ref={ref} 
      justify="between" 
      align={align}
      {...props} 
    />
  )
);

Between.displayName = "Between";

// FlexItem - Individual flex item with control
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

// Responsive flex utilities
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
        className={cn(responsiveClasses, className)}
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
  ResponsiveFlex,
  flexVariants 
};