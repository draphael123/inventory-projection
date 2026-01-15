import type { OrderRecord, AggregatedData, ProductAggregation, AggregationPeriod } from '../types';

/**
 * Get the start of a period for a given date
 */
function getPeriodStart(date: Date, period: AggregationPeriod): Date {
  const d = new Date(date);
  
  switch (period) {
    case 'daily':
      return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    
    case 'weekly':
      // Start of week (Monday)
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      return new Date(d.getFullYear(), d.getMonth(), diff);
    
    case 'monthly':
      return new Date(d.getFullYear(), d.getMonth(), 1);
  }
}

/**
 * Format a period date for display
 */
function formatPeriodLabel(date: Date, period: AggregationPeriod): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };
  
  switch (period) {
    case 'daily':
      return date.toLocaleDateString('en-US', options);
    
    case 'weekly':
      const endOfWeek = new Date(date);
      endOfWeek.setDate(endOfWeek.getDate() + 6);
      return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', options)}`;
    
    case 'monthly':
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  }
}

/**
 * Generate all periods between start and end dates
 */
export function generatePeriods(
  startDate: Date, 
  endDate: Date, 
  period: AggregationPeriod
): Date[] {
  const periods: Date[] = [];
  let current = getPeriodStart(startDate, period);
  const end = getPeriodStart(endDate, period);
  
  while (current <= end) {
    periods.push(new Date(current));
    
    switch (period) {
      case 'daily':
        current.setDate(current.getDate() + 1);
        break;
      case 'weekly':
        current.setDate(current.getDate() + 7);
        break;
      case 'monthly':
        current.setMonth(current.getMonth() + 1);
        break;
    }
  }
  
  return periods;
}

/**
 * Aggregate orders by product and time period
 */
export function aggregateOrderData(
  orders: OrderRecord[],
  period: AggregationPeriod
): Map<string, ProductAggregation> {
  const productMap = new Map<string, ProductAggregation>();
  
  // Group orders by product
  for (const order of orders) {
    let productAgg = productMap.get(order.productId);
    
    if (!productAgg) {
      productAgg = {
        productId: order.productId,
        productName: order.productName,
        category: order.category,
        data: [],
        totalOrders: 0,
        totalQuantity: 0,
        firstOrderDate: order.date,
        lastOrderDate: order.date,
      };
      productMap.set(order.productId, productAgg);
    }
    
    productAgg.totalOrders++;
    productAgg.totalQuantity += order.quantity;
    
    if (order.date < productAgg.firstOrderDate) {
      productAgg.firstOrderDate = order.date;
    }
    if (order.date > productAgg.lastOrderDate) {
      productAgg.lastOrderDate = order.date;
    }
  }
  
  // Aggregate by time period for each product
  for (const [productId, productAgg] of productMap) {
    const periodData = new Map<string, AggregatedData>();
    const productOrders = orders.filter(o => o.productId === productId);
    
    // Generate all periods in range
    const allPeriods = generatePeriods(
      productAgg.firstOrderDate,
      productAgg.lastOrderDate,
      period
    );
    
    // Initialize all periods with zero
    for (const periodDate of allPeriods) {
      const periodKey = periodDate.toISOString();
      periodData.set(periodKey, {
        period: periodKey,
        periodLabel: formatPeriodLabel(periodDate, period),
        productId,
        productName: productAgg.productName,
        totalQuantity: 0,
        orderCount: 0,
        avgQuantityPerOrder: 0,
      });
    }
    
    // Aggregate actual orders
    for (const order of productOrders) {
      const periodStart = getPeriodStart(order.date, period);
      const periodKey = periodStart.toISOString();
      
      const data = periodData.get(periodKey);
      if (data) {
        data.totalQuantity += order.quantity;
        data.orderCount++;
      }
    }
    
    // Calculate averages and sort by period
    const sortedData = Array.from(periodData.values())
      .map(d => ({
        ...d,
        avgQuantityPerOrder: d.orderCount > 0 ? d.totalQuantity / d.orderCount : 0,
      }))
      .sort((a, b) => new Date(a.period).getTime() - new Date(b.period).getTime());
    
    productAgg.data = sortedData;
  }
  
  return productMap;
}

/**
 * Get aggregated data for a specific product
 */
export function getProductAggregation(
  aggregatedData: Map<string, ProductAggregation>,
  productId: string
): ProductAggregation | undefined {
  return aggregatedData.get(productId);
}

/**
 * Calculate the number of periods per unit time
 */
export function getPeriodsPerWeek(period: AggregationPeriod): number {
  switch (period) {
    case 'daily':
      return 7;
    case 'weekly':
      return 1;
    case 'monthly':
      return 0.25; // ~1 month per 4 weeks
  }
}

/**
 * Calculate the number of periods per month
 */
export function getPeriodsPerMonth(period: AggregationPeriod): number {
  switch (period) {
    case 'daily':
      return 30;
    case 'weekly':
      return 4.33;
    case 'monthly':
      return 1;
  }
}

/**
 * Convert projection timeframe to number of periods
 */
export function timeframeToPeriods(
  timeframe: string,
  period: AggregationPeriod
): number {
  const weekMatches = timeframe.match(/(\d+)_week/);
  const monthMatches = timeframe.match(/(\d+)_month/);
  
  if (weekMatches) {
    const weeks = parseInt(weekMatches[1], 10);
    return Math.ceil(weeks * getPeriodsPerWeek(period));
  }
  
  if (monthMatches) {
    const months = parseInt(monthMatches[1], 10);
    return Math.ceil(months * getPeriodsPerMonth(period));
  }
  
  return 4; // Default to 4 periods
}

/**
 * Generate future periods for projection
 */
export function generateFuturePeriods(
  lastDate: Date,
  numPeriods: number,
  period: AggregationPeriod
): Array<{ period: string; periodLabel: string }> {
  const periods: Array<{ period: string; periodLabel: string }> = [];
  let current = new Date(getPeriodStart(lastDate, period));
  
  for (let i = 0; i < numPeriods; i++) {
    switch (period) {
      case 'daily':
        current.setDate(current.getDate() + 1);
        break;
      case 'weekly':
        current.setDate(current.getDate() + 7);
        break;
      case 'monthly':
        current.setMonth(current.getMonth() + 1);
        break;
    }
    
    periods.push({
      period: current.toISOString(),
      periodLabel: formatPeriodLabel(current, period),
    });
  }
  
  return periods;
}

