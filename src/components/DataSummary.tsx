import React from 'react';
import { Card, CardContent, Badge } from './ui';
import { useInventory } from '../context/InventoryContext';

// Icons
const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const BoxIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const StackIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
  </svg>
);

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
  delay?: number;
}

function StatCard({ icon, label, value, subValue, trend, delay = 0 }: StatCardProps) {
  const trendColors = {
    up: 'text-emerald-400',
    down: 'text-red-400',
    neutral: 'text-[var(--color-text-muted)]',
  };

  return (
    <Card 
      hover 
      className="animate-fade-in opacity-0" 
      style={{ animationDelay: `${delay}s`, animationFillMode: 'forwards' } as React.CSSProperties}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="p-2.5 bg-primary-500/10 rounded-lg text-primary-400">
            {icon}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--color-text-muted)]">{label}</p>
            <p className="text-2xl font-bold text-[var(--color-text)] mt-1">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {subValue && (
              <p className={`text-sm mt-0.5 ${trend ? trendColors[trend] : 'text-[var(--color-text-muted)]'}`}>
                {subValue}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DataSummary() {
  const { state } = useInventory();
  const { summary } = state;

  if (!summary || state.orders.length === 0) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[var(--color-surface-elevated)] rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-20 bg-[var(--color-surface-elevated)] rounded" />
                  <div className="h-8 w-24 bg-[var(--color-surface-elevated)] rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const formatDateRange = () => {
    const start = new Date(summary.dateRange.start).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    const end = new Date(summary.dateRange.end).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${start} - ${end}`;
  };

  const daySpan = Math.ceil(
    (new Date(summary.dateRange.end).getTime() - new Date(summary.dateRange.start).getTime()) /
    (1000 * 60 * 60 * 24)
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<ChartIcon />}
          label="Total Orders"
          value={summary.totalRecords}
          subValue={`~${Math.round(summary.totalRecords / Math.max(1, daySpan))} per day`}
          delay={0}
        />
        <StatCard
          icon={<BoxIcon />}
          label="Products"
          value={summary.totalProducts}
          subValue={summary.categories.length > 0 ? `${summary.categories.length} categories` : 'No categories'}
          delay={0.1}
        />
        <StatCard
          icon={<StackIcon />}
          label="Total Quantity"
          value={summary.totalQuantity}
          subValue={`Avg ${Math.round(summary.totalQuantity / summary.totalProducts)} per product`}
          delay={0.2}
        />
        <StatCard
          icon={<CalendarIcon />}
          label="Date Range"
          value={`${daySpan} days`}
          subValue={formatDateRange()}
          delay={0.3}
        />
      </div>

      {/* Categories and Suppliers */}
      {(summary.categories.length > 0 || summary.suppliers.length > 0) && (
        <Card className="animate-fade-in stagger-4">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-6">
              {summary.categories.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-muted)] mb-2">Categories</p>
                  <div className="flex flex-wrap gap-2">
                    {summary.categories.slice(0, 10).map(cat => (
                      <Badge key={cat} variant="info" size="sm">{cat}</Badge>
                    ))}
                    {summary.categories.length > 10 && (
                      <Badge variant="default" size="sm">+{summary.categories.length - 10} more</Badge>
                    )}
                  </div>
                </div>
              )}
              {summary.suppliers.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-muted)] mb-2">Suppliers</p>
                  <div className="flex flex-wrap gap-2">
                    {summary.suppliers.slice(0, 10).map(sup => (
                      <Badge key={sup} variant="default" size="sm">{sup}</Badge>
                    ))}
                    {summary.suppliers.length > 10 && (
                      <Badge variant="default" size="sm">+{summary.suppliers.length - 10} more</Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

