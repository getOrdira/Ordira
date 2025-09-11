// src/components/ui/data-display/table/index.ts
export { Table } from './table';
export { TableHead, Thead } from './thead';
export { TableBody, Tbody } from './tbody';
export { TableRow, Tr } from './tr';
export { TableHeader, Th } from './th';
export { TableCell, Td } from './td';

// Re-export types
export type {
  TableColumn,
  SortDirection,
  SortState,
  TableAction,
  BulkAction,
  TableProps
} from './table';

// Re-export helper cell components
export {
  ProductCell,
  StatusCell,
  RatingCell,
  CurrencyCell,
  DateCell,
  UserCell
} from './table';