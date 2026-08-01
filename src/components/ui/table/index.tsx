import { ReactNode } from "react";

// Props for Table
interface TableProps {
  children: ReactNode; // Table content (thead, tbody, etc.)
  className?: string; // Optional className for styling
}

// Props for TableHeader
interface TableHeaderProps {
  children: ReactNode; // Header row(s)
  className?: string; // Optional className for styling
}

// Props for TableBody
interface TableBodyProps {
  children: ReactNode; // Body row(s)
  className?: string; // Optional className for styling
}

// Props for TableRow
interface TableRowProps {
  children: ReactNode; // Cells (th or td)
  className?: string; // Optional className for styling
}

// Props for TableCell
interface TableCellProps {
  children: ReactNode; // Cell content
  isHeader?: boolean; // If true, renders as <th>, otherwise <td>
  className?: string; // Optional className for styling
}

// Table Component
const Table: React.FC<TableProps> = ({ children, className = "" }) => {
  return (
    <table className={`w-full min-w-full border-collapse text-left ${className}`}>
      {children}
    </table>
  );
};

// TableHeader Component
const TableHeader: React.FC<TableHeaderProps> = ({ children, className = "" }) => {
  return (
    <thead
      className={`border-b border-gray-200 bg-gray-50/60 dark:border-gray-800 dark:bg-white/[0.02] ${className}`}
    >
      {children}
    </thead>
  );
};

// TableBody Component
const TableBody: React.FC<TableBodyProps> = ({ children, className = "" }) => {
  return (
    <tbody
      className={`divide-y divide-gray-100 dark:divide-gray-800 ${className}`}
    >
      {children}
    </tbody>
  );
};

// TableRow Component
const TableRow: React.FC<TableRowProps> = ({ children, className = "" }) => {
  return <tr className={className}>{children}</tr>;
};

// TableCell Component — compact by default; `className` still wins for one-offs.
const TableCell: React.FC<TableCellProps> = ({
  children,
  isHeader = false,
  className = "",
}) => {
  if (isHeader) {
    return <th className={`ui-th ${className}`}>{children}</th>;
  }
  return <td className={`ui-td ${className}`}>{children}</td>;
};

export { Table, TableHeader, TableBody, TableRow, TableCell };
