'use client';

import React, { useState } from 'react';
import { Input } from '@/components/atoms/Input';
import { Button } from '@/components/atoms/Button';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  title: React.ReactNode;
  dataIndex?: keyof T;
  key: string;
  render?: (val: T[keyof T] | undefined, record: T, index: number) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  dataSource: T[];
  columns: Column<T>[];
  rowKey: keyof T | ((record: T) => string);
  loading?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  emptyText?: string;
  className?: string;
}

export function DataTable<T extends object>({
  dataSource,
  columns,
  rowKey,
  loading = false,
  searchPlaceholder = 'Search records...',
  pageSize = 10,
  emptyText = 'No data available',
  className,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Simple client-side search filter
  const filteredData = dataSource.filter((item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return Object.values(item).some(
      (val) => val != null && String(val).toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getRowKey = (item: T, index: number): string => {
    if (typeof rowKey === 'function') return rowKey(item);
    const val = item[rowKey];
    return val != null ? String(val) : String(index);
  };

  return (
    <div className={cn('space-y-3', className)}>
      {searchPlaceholder && (
        <div className="flex flex-row-reverse items-center justify-between gap-4">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-8 text-xs"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            Total: <strong className="font-mono text-foreground">{filteredData.length}</strong> items
          </span>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 uppercase tracking-wider text-muted-foreground font-mono text-[11px]">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className={cn('px-4 py-3 font-semibold', col.className)}>
                    {col.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3.5">
                        <div className="h-4 w-3/4 rounded bg-muted/60" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground">
                    {emptyText}
                  </td>
                </tr>
              ) : (
                paginatedData.map((record, rowIndex) => (
                  <tr key={getRowKey(record, rowIndex)} className="transition-colors hover:bg-muted/30">
                    {columns.map((col) => {
                      const val = col.dataIndex ? record[col.dataIndex] : undefined;
                      return (
                        <td key={col.key} className={cn('px-4 py-3 align-middle', col.className)}>
                          {col.render ? col.render(val, record, rowIndex) : String(val ?? '')}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-2.5 bg-muted/10">
            <span className="text-xs text-muted-foreground">
              Page <strong className="font-mono text-foreground">{currentPage}</strong> of <strong className="font-mono text-foreground">{totalPages}</strong>
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
