import { Card, CardHeader, CardContent, CardTitle, Select, Input, Button, Badge } from './ui';
import { useProjections } from '../hooks/useProjections';
import { useInventory } from '../context/InventoryContext';
import { exportProjections } from '../lib/exporters';
import { getMethodDisplayName, getTimeframeDisplayName } from '../lib/forecasting';
import type { ForecastMethod, ProjectionTimeframe, AggregationPeriod } from '../types';

const DownloadIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const RefreshIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const methodOptions: Array<{ value: ForecastMethod; label: string }> = [
  { value: 'sma', label: 'Simple Moving Average' },
  { value: 'wma', label: 'Weighted Moving Average' },
  { value: 'linear_regression', label: 'Linear Regression' },
];

const timeframeOptions: Array<{ value: ProjectionTimeframe; label: string }> = [
  { value: '1_week', label: '1 Week' },
  { value: '2_weeks', label: '2 Weeks' },
  { value: '4_weeks', label: '4 Weeks' },
  { value: '8_weeks', label: '8 Weeks' },
  { value: '12_weeks', label: '12 Weeks' },
  { value: '1_month', label: '1 Month' },
  { value: '2_months', label: '2 Months' },
  { value: '3_months', label: '3 Months' },
  { value: '6_months', label: '6 Months' },
];

const periodOptions: Array<{ value: AggregationPeriod; label: string }> = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const confidenceOptions = [
  { value: '0.90', label: '90%' },
  { value: '0.95', label: '95%' },
  { value: '0.99', label: '99%' },
];

export default function SettingsPanel() {
  const { settings, aggregationPeriod, changeSettings, changePeriod, recalculateProjections, isLoading } = useProjections();
  const { filteredProducts, state } = useInventory();

  const handleExport = (format: 'csv' | 'xlsx') => {
    if (filteredProducts.length === 0) return;

    exportProjections(filteredProducts, {
      format,
      includeHistorical: true,
      includeMetrics: true,
      includeProjections: true,
    });
  };

  const hasData = state.projections.size > 0;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Settings</CardTitle>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Configure projection parameters
        </p>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto space-y-6">
        {/* Aggregation Period */}
        <div>
          <h4 className="text-sm font-medium text-[var(--color-text)] mb-3">Data Aggregation</h4>
          <Select
            label="Time Period"
            options={periodOptions}
            value={aggregationPeriod}
            onChange={(e) => changePeriod(e.target.value as AggregationPeriod)}
          />
        </div>

        {/* Forecast Method */}
        <div>
          <h4 className="text-sm font-medium text-[var(--color-text)] mb-3">Forecasting</h4>
          <div className="space-y-3">
            <Select
              label="Method"
              options={methodOptions}
              value={settings.method}
              onChange={(e) => changeSettings({ method: e.target.value as ForecastMethod })}
            />

            <Select
              label="Projection Timeframe"
              options={timeframeOptions}
              value={settings.timeframe}
              onChange={(e) => changeSettings({ timeframe: e.target.value as ProjectionTimeframe })}
            />

            <Input
              label="Moving Average Periods"
              type="number"
              min={2}
              max={12}
              value={settings.periods}
              onChange={(e) => changeSettings({ periods: parseInt(e.target.value) || 4 })}
            />
          </div>
        </div>

        {/* Safety Stock & Lead Time */}
        <div>
          <h4 className="text-sm font-medium text-[var(--color-text)] mb-3">Inventory Parameters</h4>
          <div className="space-y-3">
            <Input
              label="Safety Stock %"
              type="number"
              min={0}
              max={100}
              value={settings.safetyStockPercent}
              onChange={(e) => changeSettings({ safetyStockPercent: parseInt(e.target.value) || 0 })}
            />

            <Input
              label="Lead Time (days)"
              type="number"
              min={0}
              max={90}
              value={settings.leadTimeDays}
              onChange={(e) => changeSettings({ leadTimeDays: parseInt(e.target.value) || 0 })}
            />

            <Select
              label="Confidence Level"
              options={confidenceOptions}
              value={settings.confidenceLevel.toString()}
              onChange={(e) => changeSettings({ confidenceLevel: parseFloat(e.target.value) })}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-[var(--color-border)] space-y-3">
          <Button
            variant="secondary"
            className="w-full"
            onClick={recalculateProjections}
            disabled={!hasData || isLoading}
          >
            <RefreshIcon />
            Recalculate
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="secondary"
              onClick={() => handleExport('csv')}
              disabled={!hasData}
            >
              <DownloadIcon />
              CSV
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleExport('xlsx')}
              disabled={!hasData}
            >
              <DownloadIcon />
              Excel
            </Button>
          </div>
        </div>

        {/* Current Settings Summary */}
        {hasData && (
          <div className="pt-4 border-t border-[var(--color-border)]">
            <h4 className="text-sm font-medium text-[var(--color-text)] mb-3">Current Configuration</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Method:</span>
                <Badge variant="info" size="sm">
                  {getMethodDisplayName(settings.method)}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Timeframe:</span>
                <span className="text-[var(--color-text)]">
                  {getTimeframeDisplayName(settings.timeframe)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Period:</span>
                <span className="text-[var(--color-text)] capitalize">
                  {aggregationPeriod}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Confidence:</span>
                <span className="text-[var(--color-text)]">
                  {settings.confidenceLevel * 100}%
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

