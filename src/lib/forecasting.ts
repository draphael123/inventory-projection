import type {
  ProductAggregation,
  ProductMetrics,
  ProductProjection,
  ProjectionPoint,
  ForecastSettings,
  ForecastMethod,
  AggregationPeriod,
} from '../types';
import { generateFuturePeriods, timeframeToPeriods } from './aggregator';
import { linearRegression, mean, stdDeviation } from './metrics';

// ==========================================
// T-Distribution Critical Values
// ==========================================

// Critical values for common confidence levels
const T_CRITICAL: Record<number, Record<number, number>> = {
  // 90% confidence
  0.90: { 5: 2.015, 10: 1.812, 20: 1.725, 30: 1.697, 50: 1.676, 100: 1.660, Infinity: 1.645 },
  // 95% confidence
  0.95: { 5: 2.571, 10: 2.228, 20: 2.086, 30: 2.042, 50: 2.009, 100: 1.984, Infinity: 1.960 },
  // 99% confidence
  0.99: { 5: 4.032, 10: 3.169, 20: 2.845, 30: 2.750, 50: 2.678, 100: 2.626, Infinity: 2.576 },
};

function getTCritical(confidence: number, df: number): number {
  const confidenceTable = T_CRITICAL[confidence] || T_CRITICAL[0.95];
  const dfs = Object.keys(confidenceTable).map(k => k === 'Infinity' ? Infinity : parseInt(k));
  
  for (let i = 0; i < dfs.length; i++) {
    if (df <= dfs[i]) {
      return confidenceTable[dfs[i]];
    }
  }
  
  return confidenceTable[Infinity];
}

// ==========================================
// Forecasting Methods
// ==========================================

/**
 * Simple Moving Average
 */
function simpleMovingAverage(
  values: number[],
  periods: number
): { forecast: number; standardError: number } {
  if (values.length === 0) {
    return { forecast: 0, standardError: 0 };
  }
  
  const n = Math.min(periods, values.length);
  const recentValues = values.slice(-n);
  const forecast = mean(recentValues);
  const standardError = stdDeviation(recentValues) / Math.sqrt(n);
  
  return { forecast, standardError };
}

/**
 * Weighted Moving Average
 * More recent periods have higher weights
 */
function weightedMovingAverage(
  values: number[],
  periods: number
): { forecast: number; standardError: number } {
  if (values.length === 0) {
    return { forecast: 0, standardError: 0 };
  }
  
  const n = Math.min(periods, values.length);
  const recentValues = values.slice(-n);
  
  // Generate linear weights (1, 2, 3, ..., n)
  const weights = recentValues.map((_, i) => i + 1);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  
  // Calculate weighted average
  let weightedSum = 0;
  for (let i = 0; i < recentValues.length; i++) {
    weightedSum += recentValues[i] * weights[i];
  }
  const forecast = weightedSum / totalWeight;
  
  // Calculate weighted standard error
  let weightedVariance = 0;
  for (let i = 0; i < recentValues.length; i++) {
    weightedVariance += weights[i] * Math.pow(recentValues[i] - forecast, 2);
  }
  weightedVariance /= totalWeight;
  const standardError = Math.sqrt(weightedVariance) / Math.sqrt(n);
  
  return { forecast, standardError };
}

/**
 * Linear Regression Forecast
 */
function linearRegressionForecast(
  values: number[],
  periodsAhead: number
): { forecasts: number[]; standardErrors: number[]; rSquared: number } {
  if (values.length < 2) {
    return {
      forecasts: Array(periodsAhead).fill(values[0] || 0),
      standardErrors: Array(periodsAhead).fill(0),
      rSquared: 0,
    };
  }
  
  const regression = linearRegression(values);
  const n = values.length;
  
  // Calculate standard error of estimate
  const predictions = values.map((_, i) => regression.predict(i));
  const residuals = values.map((v, i) => v - predictions[i]);
  const residualSS = residuals.reduce((sum, r) => sum + r * r, 0);
  const standardErrorEstimate = Math.sqrt(residualSS / (n - 2));
  
  // Calculate mean of x values
  const xMean = (n - 1) / 2;
  const xVariance = values.reduce((sum, _, i) => sum + Math.pow(i - xMean, 2), 0);
  
  // Generate forecasts
  const forecasts: number[] = [];
  const standardErrors: number[] = [];
  
  for (let i = 0; i < periodsAhead; i++) {
    const x = n + i;
    const forecast = regression.predict(x);
    forecasts.push(Math.max(0, forecast)); // Don't predict negative demand
    
    // Standard error for prediction increases with distance from mean
    const distanceFromMean = Math.pow(x - xMean, 2);
    const se = standardErrorEstimate * Math.sqrt(1 + 1/n + distanceFromMean/xVariance);
    standardErrors.push(se);
  }
  
  return { forecasts, standardErrors, rSquared: regression.rSquared };
}

// ==========================================
// Confidence Intervals
// ==========================================

function calculateConfidenceInterval(
  forecast: number,
  standardError: number,
  sampleSize: number,
  confidenceLevel: number
): [number, number] {
  const df = Math.max(1, sampleSize - 1);
  const tCritical = getTCritical(confidenceLevel, df);
  const margin = tCritical * standardError;
  
  return [
    Math.max(0, forecast - margin),
    forecast + margin,
  ];
}

// ==========================================
// Main Projection Function
// ==========================================

/**
 * Generate projections for a product
 */
export function generateProductProjection(
  aggregation: ProductAggregation,
  metrics: ProductMetrics,
  settings: ForecastSettings,
  period: AggregationPeriod
): ProductProjection {
  const historicalQuantities = aggregation.data.map(d => d.totalQuantity);
  const numFuturePeriods = timeframeToPeriods(settings.timeframe, period);
  
  // Generate historical data points
  const historicalData: ProjectionPoint[] = aggregation.data.map(d => ({
    period: d.period,
    periodLabel: d.periodLabel,
    projectedDemand: d.totalQuantity,
    confidenceLow: d.totalQuantity,
    confidenceHigh: d.totalQuantity,
    isForecast: false,
  }));
  
  // Generate future periods
  const lastDate = new Date(aggregation.lastOrderDate);
  const futurePeriods = generateFuturePeriods(lastDate, numFuturePeriods, period);
  
  // Calculate projections based on method
  let projectedData: ProjectionPoint[] = [];
  
  switch (settings.method) {
    case 'sma': {
      const { forecast, standardError } = simpleMovingAverage(
        historicalQuantities,
        settings.periods
      );
      
      projectedData = futurePeriods.map(p => {
        const [low, high] = calculateConfidenceInterval(
          forecast,
          standardError,
          historicalQuantities.length,
          settings.confidenceLevel
        );
        
        return {
          period: p.period,
          periodLabel: p.periodLabel,
          projectedDemand: Math.round(forecast * 100) / 100,
          confidenceLow: Math.round(low * 100) / 100,
          confidenceHigh: Math.round(high * 100) / 100,
          isForecast: true,
        };
      });
      break;
    }
    
    case 'wma': {
      const { forecast, standardError } = weightedMovingAverage(
        historicalQuantities,
        settings.periods
      );
      
      projectedData = futurePeriods.map(p => {
        const [low, high] = calculateConfidenceInterval(
          forecast,
          standardError,
          historicalQuantities.length,
          settings.confidenceLevel
        );
        
        return {
          period: p.period,
          periodLabel: p.periodLabel,
          projectedDemand: Math.round(forecast * 100) / 100,
          confidenceLow: Math.round(low * 100) / 100,
          confidenceHigh: Math.round(high * 100) / 100,
          isForecast: true,
        };
      });
      break;
    }
    
    case 'linear_regression': {
      const { forecasts, standardErrors } = linearRegressionForecast(
        historicalQuantities,
        numFuturePeriods
      );
      
      projectedData = futurePeriods.map((p, i) => {
        const [low, high] = calculateConfidenceInterval(
          forecasts[i],
          standardErrors[i],
          historicalQuantities.length,
          settings.confidenceLevel
        );
        
        return {
          period: p.period,
          periodLabel: p.periodLabel,
          projectedDemand: Math.round(forecasts[i] * 100) / 100,
          confidenceLow: Math.round(low * 100) / 100,
          confidenceHigh: Math.round(high * 100) / 100,
          isForecast: true,
        };
      });
      break;
    }
  }
  
  // Calculate totals and reorder suggestions
  const totalProjectedDemand = projectedData.reduce((sum, p) => sum + p.projectedDemand, 0);
  const avgProjectedDemand = projectedData.length > 0 
    ? totalProjectedDemand / projectedData.length 
    : 0;
  
  // Calculate safety stock
  const safetyStock = Math.ceil(avgProjectedDemand * (settings.safetyStockPercent / 100));
  
  // Calculate reorder point (demand during lead time + safety stock)
  const dailyDemand = metrics.avgDailyDemand;
  const leadTimeDemand = dailyDemand * settings.leadTimeDays;
  const reorderPoint = Math.ceil(leadTimeDemand + safetyStock);
  
  // Suggested reorder quantity (total projected + safety stock)
  const suggestedReorderQty = Math.ceil(totalProjectedDemand + safetyStock);
  
  return {
    productId: aggregation.productId,
    productName: aggregation.productName,
    category: aggregation.category,
    historicalData,
    projectedData,
    totalProjectedDemand: Math.round(totalProjectedDemand * 100) / 100,
    avgProjectedDemand: Math.round(avgProjectedDemand * 100) / 100,
    suggestedReorderQty,
    reorderPoint,
    safetyStock,
    confidenceLevel: settings.confidenceLevel * 100,
    method: settings.method,
    metrics,
  };
}

/**
 * Generate projections for all products
 */
export function generateAllProjections(
  aggregatedData: Map<string, ProductAggregation>,
  metricsData: Map<string, ProductMetrics>,
  settings: ForecastSettings,
  period: AggregationPeriod
): Map<string, ProductProjection> {
  const projectionsMap = new Map<string, ProductProjection>();
  
  for (const [productId, aggregation] of aggregatedData) {
    const metrics = metricsData.get(productId);
    if (metrics && aggregation.data.length > 0) {
      projectionsMap.set(
        productId,
        generateProductProjection(aggregation, metrics, settings, period)
      );
    }
  }
  
  return projectionsMap;
}

/**
 * Get method display name
 */
export function getMethodDisplayName(method: ForecastMethod): string {
  switch (method) {
    case 'sma':
      return 'Simple Moving Average';
    case 'wma':
      return 'Weighted Moving Average';
    case 'linear_regression':
      return 'Linear Regression';
  }
}

/**
 * Get timeframe display name
 */
export function getTimeframeDisplayName(timeframe: string): string {
  const weekMatch = timeframe.match(/(\d+)_week/);
  const monthMatch = timeframe.match(/(\d+)_month/);
  
  if (weekMatch) {
    const weeks = parseInt(weekMatch[1], 10);
    return `${weeks} ${weeks === 1 ? 'Week' : 'Weeks'}`;
  }
  
  if (monthMatch) {
    const months = parseInt(monthMatch[1], 10);
    return `${months} ${months === 1 ? 'Month' : 'Months'}`;
  }
  
  return timeframe;
}

