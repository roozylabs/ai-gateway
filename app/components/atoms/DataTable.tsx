'use client';

import React, { useState, useMemo } from 'react';
import { Table, Input, Space, Card, Button, Tooltip } from 'antd';
import type { TableProps, TableColumnType } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';

export interface DataTableProps<T extends object> extends TableProps<T> {
  /** Enable client-side global search across rows */
  searchable?: boolean;
  /** Custom search placeholder */
  searchPlaceholder?: string;
  /** Searchable field keys for client-side filtering. If empty, searches all string/number fields */
  searchFields?: (keyof T | string)[];
  /** External search term (for server-side searching) */
  searchValue?: string;
  /** Callback when search input changes (for server-side searching) */
  onSearchChange?: (val: string) => void;
  /** Callback when user clicks the refresh button */
  onRefresh?: () => void;
  /** Loading/refreshing state for the refresh button */
  refreshing?: boolean;
  /** Additional actions/filters to render on the right of the search bar */
  extraActions?: React.ReactNode;
}

export function DataTable<T extends object>({
  columns = [],
  dataSource = [],
  loading = false,
  rowKey = 'id',
  searchable = true,
  searchPlaceholder = 'Search...',
  searchFields,
  searchValue: externalSearchValue,
  onSearchChange,
  onRefresh,
  refreshing = false,
  extraActions,
  pagination = { pageSize: 10 },
  scroll = { x: 'max-content' },
  style,
  ...tableProps
}: DataTableProps<T>) {
  const [internalSearch, setInternalSearch] = useState('');

  const searchVal = externalSearchValue !== undefined ? externalSearchValue : internalSearch;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (externalSearchValue === undefined) {
      setInternalSearch(val);
    }
    if (onSearchChange) {
      onSearchChange(val);
    }
  };

  // Client-side filtered data when external search handler is NOT provided
  const filteredData = useMemo(() => {
    if (!dataSource || !searchVal.trim() || onSearchChange) {
      return dataSource;
    }

    const query = searchVal.toLowerCase().trim();

    return dataSource.filter((item: any) => {
      if (searchFields && searchFields.length > 0) {
        return searchFields.some((field) => {
          const val = item[field as string];
          return val !== undefined && val !== null && String(val).toLowerCase().includes(query);
        });
      }

      // Default: check all primitive values in the item object
      return Object.values(item).some((val) => {
        if (val === undefined || val === null) return false;
        if (typeof val === 'string' || typeof val === 'number') {
          return String(val).toLowerCase().includes(query);
        }
        return false;
      });
    });
  }, [dataSource, searchVal, searchFields, onSearchChange]);

  // Enhance columns to ensure proper sorting if sorter: true is specified
  const enhancedColumns: TableColumnType<T>[] = useMemo(() => {
    return columns.map((col: any) => {
      if (col.sorter === true && col.dataIndex) {
        const dataIndex = col.dataIndex;
        return {
          ...col,
          sorter: (a: T, b: T) => {
            const valA = (a as any)[dataIndex];
            const valB = (b as any)[dataIndex];
            if (typeof valA === 'number' && typeof valB === 'number') {
              return valA - valB;
            }
            return String(valA || '').localeCompare(String(valB || ''));
          },
        };
      }
      return col;
    });
  }, [columns]);

  const showToolbar = searchable || extraActions || onRefresh;

  return (
    <div style={{ width: '100%', ...style }}>
      {showToolbar && (
        <Card
          size="small"
          variant="borderless"
          style={{
            marginBottom: 16,
            borderRadius: 8,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            {searchable ? (
              <Input
                prefix={<SearchOutlined style={{ color: '#8c8c8c' }} />}
                placeholder={searchPlaceholder}
                value={searchVal}
                onChange={handleSearchChange}
                allowClear
                style={{ minWidth: 200, maxWidth: 320, flex: 1 }}
              />
            ) : <div />}

            <Space size="middle" wrap>
              {extraActions}
              {onRefresh && (
                <Tooltip title="Refresh Data">
                  <Button
                    icon={<ReloadOutlined spin={refreshing || (typeof loading === 'boolean' && loading)} />}
                    onClick={onRefresh}
                    disabled={refreshing || (typeof loading === 'boolean' && loading)}
                  >
                    Refresh
                  </Button>
                </Tooltip>
              )}
            </Space>
          </div>
        </Card>
      )}

      <Card size="small" variant="borderless" style={{ borderRadius: 8, overflowX: 'auto' }}>
        <Table<T>
          columns={enhancedColumns}
          dataSource={filteredData}
          loading={loading}
          rowKey={rowKey}
          pagination={pagination}
          scroll={scroll}
          size="middle"
          {...tableProps}
        />
      </Card>
    </div>
  );
}

export default DataTable;
