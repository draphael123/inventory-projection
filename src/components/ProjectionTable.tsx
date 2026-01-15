import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardContent, CardTitle, Button, Badge, Input } from './ui';
import { useInventory } from '../context/InventoryContext';

type SortField = 'productName' | 'projectedDemand' | 'suggestedReorderQty' | 'trend' | 'confidence';
type SortDirection = 'asc' | 'desc';

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const SortIcon = ({ direction }: { direction: SortDirection | null }) => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    {direction === 'asc' ? (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    ) : direction === 'desc' ? (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    ) : (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
    )}
  </svg>
);

const TrendUpIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
);

const TrendDownIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
  </svg>
);

const TrendStableIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
  </svg>
);

export default function ProjectionTable() {
  const { filteredProducts, selectProduct, state } = useInventory();
  const [sortField, setSortField] = useState<SortField>('projectedDemand');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState('');

  const sortedProducts = useMemo(() => {
    let products = [...filteredProducts];

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      products = products.filter(p =>
        p.productName.toLowerCase().includes(query) ||
        p.productId.toLowerCase().includes(query)
      );
    }

    // Sort
    products.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'productName':
          comparison = a.productName.localeCompare(b.productName);
          break;
        case 'projectedDemand':
          comparison = a.totalProjectedDemand - b.totalProjectedDemand;
          break;
        case 'suggestedReorderQty':
          comparison = a.suggestedReorderQty - b.suggestedReorderQty;
          break;
        case 'trend':
          const trendOrder = { increasing: 1, stable: 0, decreasing: -1 };
          comparison = trendOrder[a.metrics.trend] - trendOrder[b.metrics.trend];
          break;
        case 'confidence':
          comparison = a.confidenceLevel - b.confidenceLevel;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return products;
  }, [filteredProducts, sortField, sortDirection, searchQuery]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getTrendBadge = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return (
          <Badge variant="success" size="sm">
            <TrendUpIcon />
            Increasing
          </Badge>
        );
      case 'decreasing':
        return (
          <Badge variant="danger" size="sm">
            <TrendDownIcon />
            Decreasing
          </Badge>
        );
      default:
        return (
          <Badge variant="default" size="sm">
            <TrendStableIcon />
            Stable
          </Badge>
        );
    }
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-muted)] cursor-pointer hover:text-[var(--color-text)] transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-2">
        {children}
        <SortIcon direction={sortField === field ? sortDirection : null} />
      </div>
    </th>
  );

  if (state.projections.size === 0) {
    return null;
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle>Projection Details</CardTitle>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              {sortedProducts.length} products
            </p>
          </div>
          <div className="w-64">
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<SearchIcon />}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-0">
        <table className="w-full">
          <thead className="bg-[var(--color-surface-elevated)] sticky top-0">
            <tr className="border-b border-[var(--color-border)]">
              <SortableHeader field="productName">Product</SortableHeader>
              <SortableHeader field="projectedDemand">Projected Demand</SortableHeader>
              <SortableHeader field="suggestedReorderQty">Suggested Reorder</SortableHeader>
              <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-muted)]">
                Safety Stock
              </th>
              <SortableHeader field="trend">Trend</SortableHeader>
              <SortableHeader field="confidence">Confidence</SortableHeader>
              <th className="px-4 py-3 text-left text-sm font-medium text-[var(--color-text-muted)]">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {sortedProducts.map((product, index) => (
              <tr
                key={product.productId}
                className={`
                  hover:bg-[var(--color-surface-elevated)] transition-colors animate-fade-in
                  ${state.selectedProductId === product.productId ? 'bg-primary-500/5' : ''}
                `}
                style={{ animationDelay: `${index * 0.02}s` }}
              >
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-[var(--color-text)]">{product.productName}</p>
                    <p className="text-xs text-[var(--color-text-muted)] font-mono">
                      {product.productId}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-[var(--color-text)]">
                      {Math.round(product.totalProjectedDemand).toLocaleString()}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Avg: {Math.round(product.avgProjectedDemand).toLocaleString()} per period
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-primary-400">
                    {product.suggestedReorderQty.toLocaleString()}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <p className="text-[var(--color-text)]">
                    {product.safetyStock.toLocaleString()}
                  </p>
                </td>
                <td className="px-4 py-3">
                  {getTrendBadge(product.metrics.trend)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-[var(--color-surface-elevated)] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full transition-all duration-500"
                        style={{ width: `${product.confidenceLevel}%` }}
                      />
                    </div>
                    <span className="text-sm text-[var(--color-text-muted)]">
                      {product.confidenceLevel}%
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => selectProduct(
                      state.selectedProductId === product.productId ? null : product.productId
                    )}
                  >
                    {state.selectedProductId === product.productId ? 'Deselect' : 'View'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sortedProducts.length === 0 && (
          <div className="px-4 py-12 text-center text-[var(--color-text-muted)]">
            <p>No products found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

