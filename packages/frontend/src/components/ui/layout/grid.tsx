// src/components/ui/layout/grid.tsx
'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const gridVariants = cva(
  // Base grid styles
  "grid",
  {
    variants: {
      cols: {
        1: "grid-cols-1",
        2: "grid-cols-2", 
        3: "grid-cols-3",
        4: "grid-cols-4",
        5: "grid-cols-5",
        6: "grid-cols-6",
        7: "grid-cols-7",
        8: "grid-cols-8",
        9: "grid-cols-9",
        10: "grid-cols-10",
        11: "grid-cols-11",
        12: "grid-cols-12",
        none: "grid-cols-none",
        subgrid: "grid-cols-subgrid"
      },
      rows: {
        1: "grid-rows-1",
        2: "grid-rows-2",
        3: "grid-rows-3", 
        4: "grid-rows-4",
        5: "grid-rows-5",
        6: "grid-rows-6",
        none: "grid-rows-none",
        subgrid: "grid-rows-subgrid"
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
      flow: {
        row: "grid-flow-row",
        col: "grid-flow-col",
        "row-dense": "grid-flow-row-dense",
        "col-dense": "grid-flow-col-dense"
      },
      autoRows: {
        auto: "auto-rows-auto",
        min: "auto-rows-min",
        max: "auto-rows-max",
        fr: "auto-rows-fr"
      },
      autoCols: {
        auto: "auto-cols-auto",
        min: "auto-cols-min", 
        max: "auto-cols-max",
        fr: "auto-cols-fr"
      }
    },
    defaultVariants: {
      cols: 1,
      gap: "md",
      flow: "row"
    }
  }
);

export interface GridProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gridVariants> {
  as?: React.ElementType;
}

const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ 
    className, 
    cols, 
    rows, 
    gap, 
    flow, 
    autoRows, 
    autoCols, 
    as: Component = 'div',
    ...props 
  }, ref) => (
    <Component
      ref={ref}
      className={cn(gridVariants({ 
        cols, 
        rows, 
        gap, 
        flow, 
        autoRows, 
        autoCols 
      }), className)}
      {...props}
    />
  )
);

Grid.displayName = "Grid";

// Responsive Grid - Common responsive patterns
export interface ResponsiveGridProps extends Omit<GridProps, 'cols'> {
  cols?: number | {
    default: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
}

const ResponsiveGrid = React.forwardRef<HTMLDivElement, ResponsiveGridProps>(
  ({ cols = 1, className, ...props }, ref) => {
    let gridClasses = '';

    if (typeof cols === 'number') {
      // Simple number - apply to all breakpoints
      gridClasses = cn(
        cols === 1 && "grid-cols-1",
        cols === 2 && "grid-cols-1 md:grid-cols-2",
        cols === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
        cols === 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
        cols === 5 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
        cols === 6 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
        cols > 6 && `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-${Math.min(cols, 12)}`
      );
    } else {
      // Responsive object
      gridClasses = cn(
        `grid-cols-${cols.default}`,
        cols.sm && `sm:grid-cols-${cols.sm}`,
        cols.md && `md:grid-cols-${cols.md}`,
        cols.lg && `lg:grid-cols-${cols.lg}`,
        cols.xl && `xl:grid-cols-${cols.xl}`,
        cols['2xl'] && `2xl:grid-cols-${cols['2xl']}`
      );
    }

    return (
      <Grid
        ref={ref}
        className={cn(gridClasses, className)}
        {...props}
      />
    );
  }
);

ResponsiveGrid.displayName = "ResponsiveGrid";

// Grid Item - Individual grid item with positioning
export interface GridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  colSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'auto' | 'full';
  rowSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 'auto' | 'full';
  colStart?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 'auto';
  colEnd?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 'auto';
  rowStart?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 'auto';
  rowEnd?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 'auto';
  justifySelf?: 'auto' | 'start' | 'end' | 'center' | 'stretch';
  alignSelf?: 'auto' | 'start' | 'end' | 'center' | 'stretch';
}

const GridItem = React.forwardRef<HTMLDivElement, GridItemProps>(
  ({ 
    className, 
    colSpan, 
    rowSpan, 
    colStart, 
    colEnd, 
    rowStart, 
    rowEnd, 
    justifySelf, 
    alignSelf,
    ...props 
  }, ref) => {
    const itemClassName = cn(
      // Column span
      colSpan === 1 && "col-span-1",
      colSpan === 2 && "col-span-2",
      colSpan === 3 && "col-span-3",
      colSpan === 4 && "col-span-4",
      colSpan === 5 && "col-span-5",
      colSpan === 6 && "col-span-6",
      colSpan === 7 && "col-span-7",
      colSpan === 8 && "col-span-8",
      colSpan === 9 && "col-span-9",
      colSpan === 10 && "col-span-10",
      colSpan === 11 && "col-span-11",
      colSpan === 12 && "col-span-12",
      colSpan === 'auto' && "col-auto",
      colSpan === 'full' && "col-span-full",

      // Row span
      rowSpan === 1 && "row-span-1",
      rowSpan === 2 && "row-span-2", 
      rowSpan === 3 && "row-span-3",
      rowSpan === 4 && "row-span-4",
      rowSpan === 5 && "row-span-5",
      rowSpan === 6 && "row-span-6",
      rowSpan === 'auto' && "row-auto",
      rowSpan === 'full' && "row-span-full",

      // Column start
      colStart === 1 && "col-start-1",
      colStart === 2 && "col-start-2",
      colStart === 3 && "col-start-3",
      colStart === 4 && "col-start-4",
      colStart === 5 && "col-start-5",
      colStart === 6 && "col-start-6",
      colStart === 7 && "col-start-7",
      colStart === 8 && "col-start-8",
      colStart === 9 && "col-start-9",
      colStart === 10 && "col-start-10",
      colStart === 11 && "col-start-11",
      colStart === 12 && "col-start-12",
      colStart === 13 && "col-start-13",
      colStart === 'auto' && "col-start-auto",

      // Column end
      colEnd === 1 && "col-end-1",
      colEnd === 2 && "col-end-2",
      colEnd === 3 && "col-end-3",
      colEnd === 4 && "col-end-4",
      colEnd === 5 && "col-end-5",
      colEnd === 6 && "col-end-6",
      colEnd === 7 && "col-end-7",
      colEnd === 8 && "col-end-8",
      colEnd === 9 && "col-end-9",
      colEnd === 10 && "col-end-10",
      colEnd === 11 && "col-end-11",
      colEnd === 12 && "col-end-12",
      colEnd === 13 && "col-end-13",
      colEnd === 'auto' && "col-end-auto",

      // Row start
      rowStart === 1 && "row-start-1",
      rowStart === 2 && "row-start-2",
      rowStart === 3 && "row-start-3",
      rowStart === 4 && "row-start-4",
      rowStart === 5 && "row-start-5",
      rowStart === 6 && "row-start-6",
      rowStart === 7 && "row-start-7",
      rowStart === 'auto' && "row-start-auto",

      // Row end
      rowEnd === 1 && "row-end-1",
      rowEnd === 2 && "row-end-2",
      rowEnd === 3 && "row-end-3",
      rowEnd === 4 && "row-end-4",
      rowEnd === 5 && "row-end-5",
      rowEnd === 6 && "row-end-6",
      rowEnd === 7 && "row-end-7",
      rowEnd === 'auto' && "row-end-auto",

      // Justify self
      justifySelf === 'auto' && "justify-self-auto",
      justifySelf === 'start' && "justify-self-start",
      justifySelf === 'end' && "justify-self-end",
      justifySelf === 'center' && "justify-self-center",
      justifySelf === 'stretch' && "justify-self-stretch",

      // Align self
      alignSelf === 'auto' && "self-auto",
      alignSelf === 'start' && "self-start",
      alignSelf === 'end' && "self-end",
      alignSelf === 'center' && "self-center",
      alignSelf === 'stretch' && "self-stretch",

      className
    );

    return (
      <div
        ref={ref}
        className={itemClassName}
        {...props}
      />
    );
  }
);

GridItem.displayName = "GridItem";

// Stats Grid - Common pattern for dashboard metrics
export interface StatsGridProps extends Omit<GridProps, 'cols'> {
  columns?: 1 | 2 | 3 | 4 | 5 | 6;
}

const StatsGrid = React.forwardRef<HTMLDivElement, StatsGridProps>(
  ({ columns = 4, className, ...props }, ref) => {
    const responsiveColumns = cn(
      "grid auto-rows-fr",
      columns === 1 && "grid-cols-1",
      columns === 2 && "grid-cols-1 md:grid-cols-2",
      columns === 3 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
      columns === 4 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
      columns === 5 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
      columns === 6 && "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
    );

    return (
      <div
        ref={ref}
        className={cn(responsiveColumns, className)}
        {...props}
      />
    );
  }
);

StatsGrid.displayName = "StatsGrid";

// Cards Grid - For card layouts with consistent sizing
export interface CardsGridProps extends Omit<GridProps, 'cols'> {
  minWidth?: string;
  maxCols?: 1 | 2 | 3 | 4 | 5 | 6;
}

const CardsGrid = React.forwardRef<HTMLDivElement, CardsGridProps>(
  ({ minWidth = '300px', maxCols = 4, className, gap = 'lg', ...props }, ref) => {
    const gridTemplate = `repeat(auto-fit, minmax(${minWidth}, 1fr))`;
    
    return (
      <div
        ref={ref}
        className={cn(
          "grid auto-rows-fr",
          gap === 'xs' && "gap-1",
          gap === 'sm' && "gap-2", 
          gap === 'md' && "gap-4",
          gap === 'lg' && "gap-6",
          gap === 'xl' && "gap-8",
          gap === '2xl' && "gap-12",
          className
        )}
        style={{
          gridTemplateColumns: gridTemplate,
          gridTemplateRows: 'masonry' // Future CSS feature
        }}
        {...props}
      />
    );
  }
);

CardsGrid.displayName = "CardsGrid";

// Masonry Grid - For Pinterest-style layouts
export interface MasonryGridProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: 2 | 3 | 4 | 5;
  gap?: VariantProps<typeof gridVariants>['gap'];
}

const MasonryGrid = React.forwardRef<HTMLDivElement, MasonryGridProps>(
  ({ columns = 3, gap = 'md', className, children, ...props }, ref) => {
    const gapClass = cn(
      gap === 'none' && "gap-0",
      gap === 'xs' && "gap-1", 
      gap === 'sm' && "gap-2",
      gap === 'md' && "gap-4",
      gap === 'lg' && "gap-6",
      gap === 'xl' && "gap-8",
      gap === '2xl' && "gap-12"
    );

    return (
      <div
        ref={ref}
        className={cn(
          "columns-2 md:columns-3 lg:columns-4",
          columns === 2 && "md:columns-2 lg:columns-2",
          columns === 3 && "md:columns-2 lg:columns-3",
          columns === 4 && "md:columns-2 lg:columns-3 xl:columns-4",
          columns === 5 && "md:columns-2 lg:columns-3 xl:columns-4 2xl:columns-5",
          gapClass,
          className
        )}
        {...props}
      >
        {React.Children.map(children, (child, index) => (
          <div key={index} className="break-inside-avoid mb-4">
            {child}
          </div>
        ))}
      </div>
    );
  }
);

MasonryGrid.displayName = "MasonryGrid";

// Auto Grid - Automatically sized grid items
export interface AutoGridProps extends Omit<GridProps, 'cols'> {
  minItemWidth?: string;
  maxCols?: number;
}

const AutoGrid = React.forwardRef<HTMLDivElement, AutoGridProps>(
  ({ minItemWidth = '250px', maxCols = 6, className, ...props }, ref) => {
    const maxColsLimit = Math.min(maxCols, 12);
    
    return (
      <Grid
        ref={ref}
        className={cn(className)}
        style={{
          gridTemplateColumns: `repeat(auto-fit, minmax(${minItemWidth}, 1fr))`,
          gridTemplateColumns: `repeat(auto-fit, minmax(min(${minItemWidth}, 100%), 1fr))`
        }}
        {...props}
      />
    );
  }
);

AutoGrid.displayName = "AutoGrid";

export { 
  Grid, 
  ResponsiveGrid, 
  GridItem, 
  StatsGrid, 
  CardsGrid, 
  MasonryGrid, 
  AutoGrid,
  gridVariants 
};