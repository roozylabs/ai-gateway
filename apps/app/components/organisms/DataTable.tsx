'use client';

import React, { useState, useMemo } from 'react';
import { Input } from '@/components/atoms/Input';
import { Button } from '@/components/atoms/Button';
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  title: React.ReactNode;
  dataIndex?: keyof T;
  key: string;
  render?: (val: T[keyof T] | undefined, record: T, index: number) => React.ReactNode;
  className?: string;
  sortable?: boolean;
  sorter?: (a: T, b: T) => number;
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
  onRefresh?: () => void;
}

// Builds a windowed list of page numbers with ellipsis markers for large datasets.
function getPaginationItems(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const items = new Set<number>([1, total, current, current - 1, current + 1]);
  const sorted = [...items].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b);

  const result: (number | 'ellipsis')[] = [];
  let prev = 0;
  for (const n of sorted) {
    if (prev && n - prev > 1) result.push('ellipsis');
    result.push(n);
    prev = n;
  }
  return result;
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
  onRefresh,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: 'asc' | 'desc' | null;
  }>({ key: null, direction: null });

  // Simple client-side search filter
  const filteredData = useMemo(() => {
    return dataSource.filter((item) => {
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return Object.values(item).some(
        (val) => val != null && String(val).toLowerCase().includes(term)
      );
    });
  }, [dataSource, searchTerm]);

  // Client-side sort
  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return filteredData;

    const col = columns.find((c) => c.key === sortConfig.key);
    if (!col) return filteredData;

    return [...filteredData].sort((a, b) => {
      let result = 0;
      if (col.sorter) {
        result = col.sorter(a, b);
      } else if (col.dataIndex) {
        const valA = a[col.dataIndex];
        const valB = b[col.dataIndex];

        if (valA === valB) {
          result = 0;
        } else if (valA == null) {
          result = 1;
        } else if (valB == null) {
          result = -1;
        } else if (typeof valA === 'number' && typeof valB === 'number') {
          result = valA - valB;
        } else if (typeof valA === 'boolean' && typeof valB === 'boolean') {
          result = (valA ? 1 : 0) - (valB ? 1 : 0);
        } else {
          result = String(valA).localeCompare(String(valB), undefined, {
            numeric: true,
            sensitivity: 'base',
          });
        }
      }
      return sortConfig.direction === 'asc' ? result : -result;
    });
  }, [filteredData, sortConfig, columns]);

  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getRowKey = (item: T, index: number): string => {
    if (typeof rowKey === 'function') return rowKey(item);
    const val = item[rowKey];
    return val != null ? String(val) : String(index);
  };

  const handleSort = (col: Column<T>) => {
    const isSortable =
      col.sortable !== false &&
      (col.dataIndex !== undefined || col.sorter !== undefined || col.sortable === true);
    if (!isSortable) return;

    setSortConfig((prev) => {
      if (prev.key !== col.key) {
        return { key: col.key, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { key: col.key, direction: 'desc' };
      }
      if (prev.direction === 'desc') {
        return { key: null, direction: null };
      }
      return { key: col.key, direction: 'asc' };
    });
  };

  const showTopBar = Boolean(searchPlaceholder) || Boolean(onRefresh);

  return (
    <div className={cn('space-y-3', className)}>
      {showTopBar && (
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">
            Total: <strong className="font-mono text-foreground">{sortedData.length}</strong> items
          </span>
          <div className="flex items-center gap-2 max-w-xs flex-1 self-end sm:self-auto">
            {searchPlaceholder && (
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-8 text-xs h-9"
                />
              </div>
            )}
            {onRefresh && (
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={onRefresh}
                title="Refresh data"
                disabled={loading}
              >
                <RefreshCw className={cn('h-4 w-4 text-muted-foreground', loading && 'animate-spin')} />
              </Button>
            )}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-none border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 uppercase tracking-wider text-muted-foreground font-mono text-[11px]">
              <tr>
                {columns.map((col) => {
                  const isSortable =
                    col.sortable !== false &&
                    (col.dataIndex !== undefined || col.sorter !== undefined || col.sortable === true);
                  const isSorted = sortConfig.key === col.key && sortConfig.direction !== null;

                  return (
                    <th
                      key={col.key}
                      className={cn(
                        'px-4 py-3 font-semibold transition-colors',
                        isSortable && 'cursor-pointer select-none hover:bg-muted/70 hover:text-foreground',
                        col.className
                      )}
                      onClick={() => isSortable && handleSort(col)}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span>{col.title}</span>
                        {isSortable && (
                          <span className="inline-flex items-center text-muted-foreground">
                            {isSorted ? (
                              sortConfig.direction === 'asc' ? (
                                <ArrowUp className="h-3.5 w-3.5 text-primary font-bold" />
                              ) : (
                                <ArrowDown className="h-3.5 w-3.5 text-primary font-bold" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3.5 w-3.5 opacity-40 hover:opacity-100" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
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
              Page <strong className="font-mono text-foreground">{currentPage}</strong> of{' '}
              <strong className="font-mono text-foreground">{totalPages}</strong>
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {getPaginationItems(currentPage, totalPages).map((item, idx) =>
                item === 'ellipsis' ? (
                  <span
                    key={`ellipsis-${idx}`}
                    className="flex h-7 w-7 items-center justify-center text-muted-foreground"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </span>
                ) : (
                  <Button
                    key={item}
                    variant={item === currentPage ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 w-7 p-0 font-mono"
                    onClick={() => setCurrentPage(item)}
                    aria-label={`Page ${item}`}
                    aria-current={item === currentPage ? 'page' : undefined}
                  >
                    {item}
                  </Button>
                )
              )}
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                aria-label="Next page"
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

