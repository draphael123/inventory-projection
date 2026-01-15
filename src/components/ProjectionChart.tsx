import { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Card, CardHeader, CardContent, CardTitle, Badge } from './ui';
import { useInventory } from '../context/InventoryContext';

interface ChartDataPoint {
  period: string;
  periodLabel: string;
  historical?: number;
  projected?: number;
  confidenceLow?: number;
  confidenceHigh?: number;
  confidenceRange?: [number, number];
}

export default function ProjectionChart() {
  const { state, selectedProduct, filteredProducts } = useInventory();

  const chartData = useMemo(() => {
    if (selectedProduct) {
      // Single product view
      const historical = selectedProduct.historicalData.map(d => ({
        period: d.period,
        periodLabel: d.periodLabel,
        historical: d.projectedDemand,
      }));

      const projected = selectedProduct.projectedData.map(d => ({
        period: d.period,
        periodLabel: d.periodLabel,
        projected: d.projectedDemand,
        confidenceLow: d.confidenceLow,
        confidenceHigh: d.confidenceHigh,
        confidenceRange: [d.confidenceLow, d.confidenceHigh] as [number, number],
      }));

      return [...historical, ...projected];
    }

    // Aggregated view - sum all products per period
    if (filteredProducts.length === 0) return [];

    const periodMap = new Map<string, ChartDataPoint>();

    // Aggregate historical data
    for (const product of filteredProducts) {
      for (const point of product.historicalData) {
        const existing = periodMap.get(point.period);
        if (existing) {
          existing.historical = (existing.historical || 0) + point.projectedDemand;
        } else {
          periodMap.set(point.period, {
            period: point.period,
            periodLabel: point.periodLabel,
            historical: point.projectedDemand,
          });
        }
      }

      // Aggregate projected data
      for (const point of product.projectedData) {
        const existing = periodMap.get(point.period);
        if (existing) {
          existing.projected = (existing.projected || 0) + point.projectedDemand;
          existing.confidenceLow = (existing.confidenceLow || 0) + point.confidenceLow;
          existing.confidenceHigh = (existing.confidenceHigh || 0) + point.confidenceHigh;
        } else {
          periodMap.set(point.period, {
            period: point.period,
            periodLabel: point.periodLabel,
            projected: point.projectedDemand,
            confidenceLow: point.confidenceLow,
            confidenceHigh: point.confidenceHigh,
          });
        }
      }
    }

    return Array.from(periodMap.values())
      .sort((a, b) => new Date(a.period).getTime() - new Date(b.period).getTime())
      .map(d => ({
        ...d,
        confidenceRange: d.confidenceLow && d.confidenceHigh 
          ? [d.confidenceLow, d.confidenceHigh] as [number, number]
          : undefined,
      }));
  }, [selectedProduct, filteredProducts]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3 shadow-xl">
        <p className="font-medium text-[var(--color-text)] mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry: any, index: number) => {
            if (entry.dataKey === 'confidenceRange') return null;
            return (
              <div key={index} className="flex items-center gap-2 text-sm">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-[var(--color-text-muted)]">
                  {entry.name}:
                </span>
                <span className="font-medium text-[var(--color-text)]">
                  {typeof entry.value === 'number' 
                    ? Math.round(entry.value).toLocaleString() 
                    : entry.value}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (state.projections.size === 0) {
    return (
      <Card className="h-full">
        <CardContent className="h-full flex items-center justify-center">
          <div className="text-center text-[var(--color-text-muted)]">
            <p className="text-lg">No data to display</p>
            <p className="text-sm mt-1">Upload spreadsheet files to see projections</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const lastHistoricalIndex = chartData.findIndex(d => 'projected' in d && d.projected !== undefined);
  const dividerPeriod = lastHistoricalIndex > 0 ? chartData[lastHistoricalIndex - 1]?.period : null;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>
              {selectedProduct ? selectedProduct.productName : 'All Products'}
            </CardTitle>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              Historical demand and projections
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="info">
              {selectedProduct ? '1 Product' : `${filteredProducts.length} Products`}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <defs>
              <linearGradient id="historicalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="var(--color-border)" 
              opacity={0.5}
            />

            <XAxis
              dataKey="periodLabel"
              stroke="var(--color-text-muted)"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
              angle={-45}
              textAnchor="end"
              height={60}
              interval="preserveStartEnd"
            />

            <YAxis
              stroke="var(--color-text-muted)"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border)' }}
              tickFormatter={(value) => value.toLocaleString()}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => (
                <span className="text-[var(--color-text-muted)] text-sm">{value}</span>
              )}
            />

            {/* Confidence interval area */}
            <Area
              type="monotone"
              dataKey="confidenceRange"
              stroke="none"
              fill="url(#confidenceGradient)"
              name="Confidence Interval"
              legendType="none"
            />

            {/* Historical demand */}
            <Area
              type="monotone"
              dataKey="historical"
              stroke="#0ea5e9"
              strokeWidth={2}
              fill="url(#historicalGradient)"
              name="Historical Demand"
              dot={{ fill: '#0ea5e9', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: '#0ea5e9' }}
            />

            {/* Projected demand */}
            <Line
              type="monotone"
              dataKey="projected"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="Projected Demand"
              dot={{ fill: '#10b981', strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5, fill: '#10b981' }}
            />

            {/* Divider line between historical and projected */}
            {dividerPeriod && (
              <ReferenceLine
                x={chartData.find(d => d.period === dividerPeriod)?.periodLabel}
                stroke="var(--color-text-muted)"
                strokeDasharray="3 3"
                opacity={0.5}
                label={{
                  value: 'Forecast Start',
                  position: 'top',
                  fill: 'var(--color-text-muted)',
                  fontSize: 11,
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

