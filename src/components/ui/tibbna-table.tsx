'use client';

import { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

interface Column {
  header: string;
  accessor: string;
  render?: (value: any, row: any) => ReactNode;
  mobileHide?: boolean;
  mobileLabel?: string;
}

interface TibbnaTableProps {
  columns: Column[];
  data: any[];
  onRowClick?: (row: any) => void;
  mobileCardView?: boolean;
}

export function TibbnaTable({
  columns,
  data,
  onRowClick,
  mobileCardView = false,
}: TibbnaTableProps) {
  if (mobileCardView) {
    return (
      <>
        {/* Desktop table */}
        <div className="hidden md:block tibbna-table-container">
          <table className="tibbna-table">
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.accessor}>{col.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr
                  key={i}
                  onClick={() => onRowClick?.(row)}
                  className={onRowClick ? 'cursor-pointer' : ''}
                >
                  {columns.map((col) => (
                    <td key={col.accessor}>
                      {col.render ? col.render(row[col.accessor], row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden mobile-card-list">
          {data.map((row, i) => (
            <div
              key={i}
              onClick={() => onRowClick?.(row)}
              className={`tibbna-card ${onRowClick ? 'cursor-pointer active:bg-gray-50' : ''}`}
            >
              <div className="tibbna-card-content space-y-1.5">
                {columns
                  .filter((col) => !col.mobileHide)
                  .map((col) => (
                    <div key={col.accessor} className="mobile-card-row">
                      <span className="mobile-card-label">
                        {col.mobileLabel || col.header}
                      </span>
                      <span className="mobile-card-value">
                        {col.render ? col.render(row[col.accessor], row) : row[col.accessor]}
                      </span>
                    </div>
                  ))}
                {onRowClick && (
                  <div className="flex justify-end pt-1">
                    <ChevronRight size={16} className="text-gray-400" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </>
    );
  }

  // Standard scrollable table
  return (
    <div className="tibbna-table-container">
      <table className="tibbna-table">
        <thead>
          <tr>
            {columns
              .filter((col) => !col.mobileHide)
              .map((col) => (
                <th key={col.accessor}>{col.header}</th>
              ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              onClick={() => onRowClick?.(row)}
              className={onRowClick ? 'cursor-pointer' : ''}
            >
              {columns
                .filter((col) => !col.mobileHide)
                .map((col) => (
                  <td key={col.accessor}>
                    {col.render ? col.render(row[col.accessor], row) : row[col.accessor]}
                  </td>
                ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
