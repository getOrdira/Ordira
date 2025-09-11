// src/components/ui/index.ts
// Centralized exports for all UI components

// =============================================================================
// PRIMITIVES - Core building blocks
// =============================================================================
export * from './primitives/button';
export * from './primitives/card';
export * from './primitives/checkbox';
export * from './primitives/input';
export * from './primitives/radio';
export * from './primitives/select';
export * from './primitives/slider';
export * from './primitives/switch';
export * from './primitives/textarea';

// =============================================================================
// DATA DISPLAY - Components for showing data
// =============================================================================
export * from './data-display/avatar';
export * from './data-display/badge';
export * from './data-display/chip';
export * from './data-display/empty-state';
export * from './data-display/key-value';
export * from './data-display/progress';
export * from './data-display/skeleton';
export * from './data-display/status-badge';

// Table components (re-export from table index)
export * from './data-display/table';

// Metrics components
export * from './data-display/metrics/analytics-chart';
export * from './data-display/metrics/metric';
export * from './data-display/metrics/metrics-grid';

// =============================================================================
// FEEDBACK - User feedback and notifications
// =============================================================================
export * from './feedback/alert';
export * from './feedback/banner';
export * from './feedback/dialog';
export * from './feedback/loading-spinner';
export * from './feedback/modal';
export * from './feedback/popover';
export * from './feedback/toast';
export * from './feedback/tooltip';

// =============================================================================
// LAYOUT - Layout and spacing components
// =============================================================================
export * from './layout/card';
export * from './layout/container';
export * from './layout/divider';
export * from './layout/flex';
export * from './layout/grid';
export * from './layout/page-header';
export * from './layout/spacer';

// =============================================================================
// NAVIGATION - Navigation and menu components
// =============================================================================
export * from './navigation/avatar-menu-wrapper';
export * from './navigation/breadcrumb';
export * from './navigation/button-link';
export * from './navigation/dropdown';
export * from './navigation/menu';
export * from './navigation/nav-section';
export * from './navigation/notification-dropdown-wrapper';
export * from './navigation/notifications-dropdown';
export * from './navigation/pagination';
export * from './navigation/pill-nav';
export * from './navigation/tabs';
export * from './navigation/use-avatar-menu';

// =============================================================================
// TYPE EXPORTS - Re-export important types for external use
// =============================================================================

// Primitive types
export type {
  ButtonProps,
  ButtonVariant,
  ButtonSize
} from './primitives/button';

export type {
  InputProps,
  PasswordInputProps,
  SearchInputProps
} from './primitives/input';

export type {
  CheckboxProps,
  CheckboxCardProps,
  ToggleCheckboxProps
} from './primitives/checkbox';

export type {
  RadioProps,
  RadioCardProps
} from './primitives/radio';

export type {
  SelectProps,
  SelectOption
} from './primitives/select';

export type {
  SliderProps,
  RangeSliderProps
} from './primitives/slider';

export type {
  SwitchProps
} from './primitives/switch';

export type {
  TextareaProps
} from './primitives/textarea';

// Data display types
export type {
  AvatarProps,
  AvatarSize,
  AvatarShape,
  AvatarVariant
} from './data-display/avatar';

export type {
  BadgeProps,
  BadgeVariant,
  BadgeSize
} from './data-display/badge';

export type {
  ChipProps,
  UserChipProps
} from './data-display/chip';

export type {
  EmptyStateProps,
  EmptyStateVariant,
  EmptyStateSize
} from './data-display/empty-state';

export type {
  ProgressProps,
  CircularProgressProps,
  StepProgressProps
} from './data-display/progress';

export type {
  SkeletonProps,
  CardSkeletonProps,
  TableSkeletonProps
} from './data-display/skeleton';

export type {
  StatusBadgeProps,
  StatusBadgeStatus
} from './data-display/status-badge';

// Feedback types
export type {
  AlertProps,
  AlertVariant
} from './feedback/alert';

export type {
  DialogProps,
  ConfirmationDialogProps,
  FormDialogProps
} from './feedback/dialog';

export type {
  LoadingSpinnerProps,
  SpinnerVariant
} from './feedback/loading-spinner';

export type {
  ModalProps,
  ConfirmationModalProps,
  FormModalProps
} from './feedback/modal';

export type {
  PopoverProps,
  PopoverTrigger,
  PopoverPlacement
} from './feedback/popover';

export type {
  ToastProps,
  ToastVariant,
  ToastPosition
} from './feedback/toast';

export type {
  TooltipProps,
  TooltipVariant,
  TooltipPlacement
} from './feedback/tooltip';

// Layout types
export type {
  ContainerProps,
  ContainerSize
} from './layout/container';

export type {
  FlexProps,
  FlexDirection,
  FlexAlign,
  FlexJustify
} from './layout/flex';

export type {
  GridProps,
  GridCols,
  GridGap
} from './layout/grid';

export type {
  PageHeaderProps,
  PageHeaderAction
} from './layout/page-header';

// Navigation types
export type {
  BreadcrumbProps,
  BreadcrumbItem
} from './navigation/breadcrumb';

export type {
  DropdownProps,
  DropdownItem,
  DropdownSection
} from './navigation/dropdown';

export type {
  MenuProps,
  MenuItem,
  MenuSection
} from './navigation/menu';

export type {
  PaginationProps
} from './navigation/pagination';

export type {
  TabsProps,
  Tab
} from './navigation/tabs';
