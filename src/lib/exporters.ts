import * as XLSX from 'xlsx';
import type { ProductProjection, ExportData, ExportOptions } from '../types';
import { getMethodDisplayName } from './forecasting';

/**
 * Prepare data for export
 */
function prepareExportData(
  projections: ProductProjection[],
  options: ExportOptions
): ExportData[] {
  return projections.map(p => {
    const data: ExportData = {
      productId: p.productId,
      productName: p.productName,
      category: p.category,
    };
    
    if (options.includeMetrics) {
      data.avgDailyDemand = Math.round(p.metrics.avgDailyDemand * 100) / 100;
      data.avgWeeklyDemand = Math.round(p.metrics.avgWeeklyDemand * 100) / 100;
      data.trend = p.metrics.trend;
    }
    
    if (options.includeProjections) {
      data.projectedDemand = p.totalProjectedDemand;
      data.suggestedReorderQty = p.suggestedReorderQty;
      data.safetyStock = p.safetyStock;
      data.confidenceLevel = p.confidenceLevel;
      
      // Get average confidence interval
      const avgLow = p.projectedData.reduce((sum, d) => sum + d.confidenceLow, 0) / p.projectedData.length;
      const avgHigh = p.projectedData.reduce((sum, d) => sum + d.confidenceHigh, 0) / p.projectedData.length;
      data.confidenceLow = Math.round(avgLow * 100) / 100;
      data.confidenceHigh = Math.round(avgHigh * 100) / 100;
    }
    
    return data;
  });
}

/**
 * Export to CSV format
 */
export function exportToCSV(
  projections: ProductProjection[],
  options: ExportOptions
): string {
  const data = prepareExportData(projections, options);
  
  if (data.length === 0) {
    return '';
  }
  
  // Get headers from first item
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  const rows = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header as keyof ExportData];
        // Escape strings with commas
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value ?? '';
      }).join(',')
    ),
  ];
  
  return rows.join('\n');
}

/**
 * Export to Excel format
 */
export function exportToExcel(
  projections: ProductProjection[],
  options: ExportOptions
): Blob {
  const workbook = XLSX.utils.book_new();
  
  // Summary sheet
  const summaryData = prepareExportData(projections, options);
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  
  // Auto-size columns
  const colWidths = Object.keys(summaryData[0] || {}).map(key => ({
    wch: Math.max(key.length, 15)
  }));
  summarySheet['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Projections Summary');
  
  // Detailed projections sheet (if enabled)
  if (options.includeProjections && options.includeHistorical) {
    const detailedData: Array<Record<string, unknown>> = [];
    
    for (const projection of projections) {
      // Add historical data
      for (const point of projection.historicalData) {
        detailedData.push({
          'Product ID': projection.productId,
          'Product Name': projection.productName,
          'Period': point.periodLabel,
          'Type': 'Historical',
          'Demand': point.projectedDemand,
          'Confidence Low': '',
          'Confidence High': '',
        });
      }
      
      // Add projected data
      for (const point of projection.projectedData) {
        detailedData.push({
          'Product ID': projection.productId,
          'Product Name': projection.productName,
          'Period': point.periodLabel,
          'Type': 'Projected',
          'Demand': point.projectedDemand,
          'Confidence Low': point.confidenceLow,
          'Confidence High': point.confidenceHigh,
        });
      }
    }
    
    if (detailedData.length > 0) {
      const detailedSheet = XLSX.utils.json_to_sheet(detailedData);
      XLSX.utils.book_append_sheet(workbook, detailedSheet, 'Detailed Data');
    }
  }
  
  // Metrics sheet (if enabled)
  if (options.includeMetrics) {
    const metricsData = projections.map(p => ({
      'Product ID': p.productId,
      'Product Name': p.productName,
      'Category': p.category || '',
      'Avg Daily Demand': Math.round(p.metrics.avgDailyDemand * 100) / 100,
      'Avg Weekly Demand': Math.round(p.metrics.avgWeeklyDemand * 100) / 100,
      'Avg Monthly Demand': Math.round(p.metrics.avgMonthlyDemand * 100) / 100,
      'Standard Deviation': Math.round(p.metrics.stdDeviation * 100) / 100,
      'Coefficient of Variation': Math.round(p.metrics.coefficientOfVariation * 100) / 100,
      'Trend': p.metrics.trend,
      'Trend Strength (R²)': Math.round(p.metrics.trendStrength * 100) / 100,
      'Min Demand': p.metrics.minDemand,
      'Max Demand': p.metrics.maxDemand,
      'Median Demand': p.metrics.medianDemand,
      'Outliers Count': p.metrics.outliers.length,
    }));
    
    const metricsSheet = XLSX.utils.json_to_sheet(metricsData);
    XLSX.utils.book_append_sheet(workbook, metricsSheet, 'Metrics');
  }
  
  // Convert to blob
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([excelBuffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
}

/**
 * Download file
 */
export function downloadFile(
  content: string | Blob,
  filename: string,
  mimeType: string
) {
  const blob = content instanceof Blob 
    ? content 
    : new Blob([content], { type: mimeType });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export projections
 */
export function exportProjections(
  projections: ProductProjection[],
  options: ExportOptions
) {
  const timestamp = new Date().toISOString().split('T')[0];
  
  if (options.format === 'csv') {
    const csv = exportToCSV(projections, options);
    downloadFile(csv, `inventory-projections-${timestamp}.csv`, 'text/csv');
  } else {
    const xlsx = exportToExcel(projections, options);
    downloadFile(
      xlsx, 
      `inventory-projections-${timestamp}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  }
}

/**
 * Generate summary report text
 */
export function generateSummaryReport(
  projections: ProductProjection[],
  method: string
): string {
  const totalProducts = projections.length;
  const totalProjectedDemand = projections.reduce((sum, p) => sum + p.totalProjectedDemand, 0);
  const totalReorderQty = projections.reduce((sum, p) => sum + p.suggestedReorderQty, 0);
  
  const increasingTrends = projections.filter(p => p.metrics.trend === 'increasing').length;
  const decreasingTrends = projections.filter(p => p.metrics.trend === 'decreasing').length;
  const stableTrends = projections.filter(p => p.metrics.trend === 'stable').length;
  
  return `
INVENTORY PROJECTION REPORT
Generated: ${new Date().toLocaleString()}
Method: ${getMethodDisplayName(method as any)}

SUMMARY
-------
Total Products Analyzed: ${totalProducts}
Total Projected Demand: ${Math.round(totalProjectedDemand).toLocaleString()} units
Total Suggested Reorder Quantity: ${Math.round(totalReorderQty).toLocaleString()} units

TREND ANALYSIS
--------------
Products with Increasing Demand: ${increasingTrends} (${Math.round(increasingTrends/totalProducts*100)}%)
Products with Decreasing Demand: ${decreasingTrends} (${Math.round(decreasingTrends/totalProducts*100)}%)
Products with Stable Demand: ${stableTrends} (${Math.round(stableTrends/totalProducts*100)}%)

TOP 10 PRODUCTS BY PROJECTED DEMAND
-----------------------------------
${projections
  .sort((a, b) => b.totalProjectedDemand - a.totalProjectedDemand)
  .slice(0, 10)
  .map((p, i) => `${i + 1}. ${p.productName} (${p.productId}): ${Math.round(p.totalProjectedDemand).toLocaleString()} units`)
  .join('\n')}
`.trim();
}

