import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardContent, CardTitle, Input, Badge } from './ui';
import { useInventory } from '../context/InventoryContext';

const SearchIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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

export default function ProductSelector() {
  const { state, filteredProducts, selectProduct, setFilters } = useInventory();
  const [searchQuery, setSearchQuery] = useState('');

  const products = useMemo(() => {
    if (!searchQuery) return filteredProducts;
    
    const query = searchQuery.toLowerCase();
    return filteredProducts.filter(p =>
      p.productName.toLowerCase().includes(query) ||
      p.productId.toLowerCase().includes(query)
    );
  }, [filteredProducts, searchQuery]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setFilters({ searchQuery: e.target.value });
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendUpIcon />;
      case 'decreasing':
        return <TrendDownIcon />;
      default:
        return <TrendStableIcon />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return 'text-emerald-400';
      case 'decreasing':
        return 'text-red-400';
      default:
        return 'text-[var(--color-text-muted)]';
    }
  };

  if (state.projections.size === 0) {
    return null;
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Products</CardTitle>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          {products.length} of {state.projections.size} products
        </p>
      </CardHeader>
      
      <div className="px-5 pb-3">
        <Input
          placeholder="Search products..."
          value={searchQuery}
          onChange={handleSearch}
          icon={<SearchIcon />}
        />
      </div>

      <CardContent className="flex-1 overflow-auto p-0">
        <div className="divide-y divide-[var(--color-border)]">
          {/* All Products option */}
          <button
            onClick={() => selectProduct(null)}
            className={`
              w-full px-5 py-3 text-left transition-colors
              hover:bg-[var(--color-surface-elevated)]
              ${state.selectedProductId === null ? 'bg-primary-500/10 border-l-2 border-l-primary-500' : ''}
            `}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[var(--color-text)]">All Products</p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  View aggregated data
                </p>
              </div>
              <Badge variant="info" size="sm">{state.projections.size}</Badge>
            </div>
          </button>

          {/* Individual products */}
          {products.map((product, index) => (
            <button
              key={product.productId}
              onClick={() => selectProduct(product.productId)}
              className={`
                w-full px-5 py-3 text-left transition-colors animate-fade-in
                hover:bg-[var(--color-surface-elevated)]
                ${state.selectedProductId === product.productId ? 'bg-primary-500/10 border-l-2 border-l-primary-500' : ''}
              `}
              style={{ animationDelay: `${index * 0.02}s` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--color-text)] truncate">
                    {product.productName}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-[var(--color-text-muted)] font-mono">
                      {product.productId}
                    </span>
                    {product.category && (
                      <>
                        <span className="text-[var(--color-border)]">•</span>
                        <Badge variant="default" size="sm">{product.category}</Badge>
                      </>
                    )}
                  </div>
                </div>
                <div className={`flex items-center gap-1 ${getTrendColor(product.metrics.trend)}`}>
                  {getTrendIcon(product.metrics.trend)}
                </div>
              </div>
              <div className="mt-2 flex items-center gap-4 text-sm text-[var(--color-text-muted)]">
                <span>
                  Projected: <span className="text-[var(--color-text)]">
                    {Math.round(product.totalProjectedDemand).toLocaleString()}
                  </span>
                </span>
                <span>
                  Reorder: <span className="text-[var(--color-text)]">
                    {product.suggestedReorderQty.toLocaleString()}
                  </span>
                </span>
              </div>
            </button>
          ))}

          {products.length === 0 && (
            <div className="px-5 py-8 text-center text-[var(--color-text-muted)]">
              <p>No products found</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

