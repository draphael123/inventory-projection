import type { 
  ProductAggregation, 
  ProductMetrics, 
  TrendDirection, 
  OutlierData,
  AggregationPeriod,
} from '../types';
import { getPeriodsPerWeek, getPeriodsPerMonth } from './aggregator';

// ==========================================
// Statistical Functions
// ==========================================

/**
 * Calculate mean of an array
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Calculate variance of an array
 */
export function variance(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squaredDiffs = values.map(v => Math.pow(v - avg, 2));
  return squaredDiffs.reduce((sum, v) => sum + v, 0) / (values.length - 1);
}

/**
 * Calculate standard deviation
 */
export function stdDeviation(values: number[]): number {
  return Math.sqrt(variance(values));
}

/**
 * Calculate median
 */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Calculate coefficient of variation
 */
export function coefficientOfVariation(values: number[]): number {
  const avg = mean(values);
  if (avg === 0) return 0;
  return stdDeviation(values) / avg;
}

/**
 * Calculate z-score for a value
 */
export function zScore(value: number, avg: number, std: number): number {
  if (std === 0) return 0;
  return (value - avg) / std;
}

// ==========================================
// Linear Regression
// ==========================================

export interface RegressionResult {
  slope: number;
  intercept: number;
  rSquared: number;
  predict: (x: number) => number;
}

/**
 * Simple linear regression using least squares
 */
export function linearRegression(values: number[]): RegressionResult {
  const n = values.length;
  if (n < 2) {
    return {
      slope: 0,
      intercept: values[0] || 0,
      rSquared: 0,
      predict: () => values[0] || 0,
    };
  }
  
  // x values are indices (0, 1, 2, ...)
  const xValues = values.map((_, i) => i);
  
  const xMean = mean(xValues);
  const yMean = mean(values);
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n; i++) {
    const xDiff = xValues[i] - xMean;
    const yDiff = values[i] - yMean;
    numerator += xDiff * yDiff;
    denominator += xDiff * xDiff;
  }
  
  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;
  
  // Calculate R-squared
  const predictions = xValues.map(x => slope * x + intercept);
  const ssRes = values.reduce((sum, y, i) => sum + Math.pow(y - predictions[i], 2), 0);
  const ssTot = values.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
  const rSquared = ssTot !== 0 ? 1 - ssRes / ssTot : 0;
  
  return {
    slope,
    intercept,
    rSquared: Math.max(0, rSquared), // Clamp to avoid negative R²
    predict: (x: number) => slope * x + intercept,
  };
}

// ==========================================
// Trend Analysis
// ==========================================

/**
 * Determine trend direction from slope and R²
 */
export function determineTrend(
  slope: number, 
  rSquared: number, 
  avgValue: number
): TrendDirection {
  // Normalize slope relative to average
  const normalizedSlope = avgValue !== 0 ? slope / avgValue : 0;
  
  // Only consider it a trend if R² is meaningful and slope is significant
  const significantRSquared = rSquared > 0.1;
  const significantSlope = Math.abs(normalizedSlope) > 0.02; // 2% change per period
  
  if (!significantRSquared || !significantSlope) {
    return 'stable';
  }
  
  return slope > 0 ? 'increasing' : 'decreasing';
}

// ==========================================
// Outlier Detection
// ==========================================

/**
 * Detect outliers using IQR method
 */
export function detectOutliers(
  data: Array<{ period: string; quantity: number }>,
  zScoreThreshold: number = 2.5
): OutlierData[] {
  const quantities = data.map(d => d.quantity);
  const avg = mean(quantities);
  const std = stdDeviation(quantities);
  
  if (std === 0) return [];
  
  const outliers: OutlierData[] = [];
  
  for (const item of data) {
    const z = zScore(item.quantity, avg, std);
    
    if (Math.abs(z) > zScoreThreshold) {
      outliers.push({
        date: new Date(item.period),
        period: item.period,
        quantity: item.quantity,
        zScore: z,
        type: z > 0 ? 'spike' : 'drop',
      });
    }
  }
  
  return outliers;
}

// ==========================================
// Seasonality Detection
// ==========================================

/**
 * Detect monthly seasonality patterns
 * Returns an array of 12 seasonal indices (one per month)
 */
export function detectSeasonality(
  data: Array<{ period: string; quantity: number }>
): number[] | undefined {
  // Need at least 12 months of data
  if (data.length < 12) return undefined;
  
  // Group by month
  const monthlyData: number[][] = Array.from({ length: 12 }, () => []);
  
  for (const item of data) {
    const date = new Date(item.period);
    const month = date.getMonth();
    monthlyData[month].push(item.quantity);
  }
  
  // Check if we have data for each month
  if (monthlyData.some(m => m.length === 0)) return undefined;
  
  // Calculate monthly averages
  const monthlyAverages = monthlyData.map(m => mean(m));
  const overallAverage = mean(monthlyAverages);
  
  if (overallAverage === 0) return undefined;
  
  // Calculate seasonal indices (ratio to overall average)
  const seasonalIndices = monthlyAverages.map(avg => avg / overallAverage);
  
  // Check if seasonality is significant (variance in indices)
  const indexVariance = variance(seasonalIndices);
  if (indexVariance < 0.01) return undefined; // Less than 1% variance
  
  return seasonalIndices;
}

// ==========================================
// Metrics Calculator
// ==========================================

/**
 * Calculate all metrics for a product
 */
export function calculateProductMetrics(
  aggregation: ProductAggregation,
  period: AggregationPeriod
): ProductMetrics {
  const quantities = aggregation.data.map(d => d.totalQuantity);
  
  // Basic statistics
  const avgQuantity = mean(quantities);
  const varianceValue = variance(quantities);
  const stdDev = stdDeviation(quantities);
  const cv = coefficientOfVariation(quantities);
  const medianValue = median(quantities);
  const minValue = Math.min(...quantities);
  const maxValue = Math.max(...quantities);
  
  // Convert to daily/weekly/monthly demand
  const periodsPerWeek = getPeriodsPerWeek(period);
  const periodsPerMonth = getPeriodsPerMonth(period);
  
  const avgDailyDemand = avgQuantity / (7 / periodsPerWeek);
  const avgWeeklyDemand = avgQuantity * periodsPerWeek;
  const avgMonthlyDemand = avgQuantity * periodsPerMonth;
  
  // Trend analysis
  const regression = linearRegression(quantities);
  const trend = determineTrend(regression.slope, regression.rSquared, avgQuantity);
  
  // Outlier detection
  const dataForOutliers = aggregation.data.map(d => ({
    period: d.period,
    quantity: d.totalQuantity,
  }));
  const outliers = detectOutliers(dataForOutliers);
  
  // Seasonality (only for monthly data with sufficient history)
  const seasonalityIndex = period === 'monthly' 
    ? detectSeasonality(dataForOutliers)
    : undefined;
  
  return {
    productId: aggregation.productId,
    productName: aggregation.productName,
    avgDailyDemand,
    avgWeeklyDemand,
    avgMonthlyDemand,
    variance: varianceValue,
    stdDeviation: stdDev,
    coefficientOfVariation: cv,
    trend,
    trendSlope: regression.slope,
    trendStrength: regression.rSquared,
    seasonalityIndex,
    outliers,
    minDemand: minValue,
    maxDemand: maxValue,
    medianDemand: medianValue,
  };
}

/**
 * Calculate metrics for all products
 */
export function calculateAllMetrics(
  aggregatedData: Map<string, ProductAggregation>,
  period: AggregationPeriod
): Map<string, ProductMetrics> {
  const metricsMap = new Map<string, ProductMetrics>();
  
  for (const [productId, aggregation] of aggregatedData) {
    if (aggregation.data.length > 0) {
      metricsMap.set(productId, calculateProductMetrics(aggregation, period));
    }
  }
  
  return metricsMap;
}

