import { useCallback, useEffect } from 'react';
import { useInventory } from '../context/InventoryContext';
import { aggregateOrderData } from '../lib/aggregator';
import { calculateAllMetrics } from '../lib/metrics';
import { generateAllProjections } from '../lib/forecasting';
import type { ForecastSettings, AggregationPeriod } from '../types';

export function useProjections() {
  const {
    state,
    setAggregatedData,
    setMetrics,
    setProjections,
    updateSettings,
    setAggregationPeriod,
    setLoading,
  } = useInventory();

  // Recalculate projections when settings change
  const recalculateProjections = useCallback(() => {
    if (state.orders.length === 0) return;
    
    setLoading(true);
    
    // Use setTimeout to avoid blocking the UI
    setTimeout(() => {
      // Aggregate data
      const aggregated = aggregateOrderData(state.orders, state.aggregationPeriod);
      setAggregatedData(aggregated);
      
      // Calculate metrics
      const metricsData = calculateAllMetrics(aggregated, state.aggregationPeriod);
      setMetrics(metricsData);
      
      // Generate projections
      const projectionsData = generateAllProjections(
        aggregated,
        metricsData,
        state.settings,
        state.aggregationPeriod
      );
      setProjections(projectionsData);
      
      setLoading(false);
    }, 0);
  }, [
    state.orders,
    state.aggregationPeriod,
    state.settings,
    setAggregatedData,
    setMetrics,
    setProjections,
    setLoading,
  ]);

  // Update settings and recalculate
  const changeSettings = useCallback((newSettings: Partial<ForecastSettings>) => {
    updateSettings(newSettings);
  }, [updateSettings]);

  // Update aggregation period and recalculate
  const changePeriod = useCallback((period: AggregationPeriod) => {
    setAggregationPeriod(period);
  }, [setAggregationPeriod]);

  // Recalculate when settings or period change
  useEffect(() => {
    if (state.orders.length > 0) {
      recalculateProjections();
    }
  }, [state.settings, state.aggregationPeriod]);

  return {
    projections: state.projections,
    metrics: state.metrics,
    aggregatedData: state.aggregatedData,
    settings: state.settings,
    aggregationPeriod: state.aggregationPeriod,
    changeSettings,
    changePeriod,
    recalculateProjections,
    isLoading: state.isLoading,
  };
}

