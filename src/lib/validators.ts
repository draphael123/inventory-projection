import type { OrderRecord, DataSummary } from '../types';

/**
 * Calculate summary statistics for imported order data
 */
export function calculateDataSummary(orders: OrderRecord[]): DataSummary {
  if (orders.length === 0) {
    return {
      totalRecords: 0,
      totalProducts: 0,
      totalQuantity: 0,
      dateRange: {
        start: new Date(),
        end: new Date(),
      },
      categories: [],
      suppliers: [],
    };
  }

  const productIds = new Set<string>();
  const categories = new Set<string>();
  const suppliers = new Set<string>();
  let totalQuantity = 0;
  let minDate = orders[0].date;
  let maxDate = orders[0].date;

  for (const order of orders) {
    productIds.add(order.productId);
    totalQuantity += order.quantity;

    if (order.category) {
      categories.add(order.category);
    }

    if (order.supplier) {
      suppliers.add(order.supplier);
    }

    if (order.date < minDate) {
      minDate = order.date;
    }
    if (order.date > maxDate) {
      maxDate = order.date;
    }
  }

  return {
    totalRecords: orders.length,
    totalProducts: productIds.size,
    totalQuantity,
    dateRange: {
      start: minDate,
      end: maxDate,
    },
    categories: Array.from(categories).sort(),
    suppliers: Array.from(suppliers).sort(),
  };
}

/**
 * Detect potential data quality issues
 */
export function detectDataIssues(orders: OrderRecord[]): string[] {
  const issues: string[] = [];
  
  if (orders.length === 0) {
    issues.push('No order records found');
    return issues;
  }

  // Check for duplicate records
  const seen = new Map<string, number>();
  for (const order of orders) {
    const key = `${order.date.toISOString()}-${order.productId}-${order.quantity}`;
    seen.set(key, (seen.get(key) || 0) + 1);
  }
  
  const duplicates = Array.from(seen.values()).filter(count => count > 1).length;
  if (duplicates > 0) {
    issues.push(`Found ${duplicates} potential duplicate records`);
  }

  // Check for very large quantities
  const avgQuantity = orders.reduce((sum, o) => sum + o.quantity, 0) / orders.length;
  const largeOrders = orders.filter(o => o.quantity > avgQuantity * 10).length;
  if (largeOrders > 0) {
    issues.push(`Found ${largeOrders} orders with unusually large quantities`);
  }

  // Check for zero quantities
  const zeroQuantities = orders.filter(o => o.quantity === 0).length;
  if (zeroQuantities > 0) {
    issues.push(`Found ${zeroQuantities} orders with zero quantity`);
  }

  // Check date range span
  const summary = calculateDataSummary(orders);
  const daySpan = Math.ceil(
    (summary.dateRange.end.getTime() - summary.dateRange.start.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daySpan < 30) {
    issues.push('Data spans less than 30 days - projections may be less accurate');
  }

  // Check for gaps in data
  const dateSet = new Set(
    orders.map(o => o.date.toISOString().split('T')[0])
  );
  
  if (daySpan > 7 && dateSet.size < daySpan * 0.3) {
    issues.push('Significant gaps found in order dates');
  }

  return issues;
}

/**
 * Get unique products from orders
 */
export function getUniqueProducts(orders: OrderRecord[]): Array<{
  productId: string;
  productName: string;
  category?: string;
  orderCount: number;
  totalQuantity: number;
}> {
  const productMap = new Map<string, {
    productId: string;
    productName: string;
    category?: string;
    orderCount: number;
    totalQuantity: number;
  }>();

  for (const order of orders) {
    const existing = productMap.get(order.productId);
    if (existing) {
      existing.orderCount++;
      existing.totalQuantity += order.quantity;
    } else {
      productMap.set(order.productId, {
        productId: order.productId,
        productName: order.productName,
        category: order.category,
        orderCount: 1,
        totalQuantity: order.quantity,
      });
    }
  }

  return Array.from(productMap.values()).sort((a, b) => 
    b.totalQuantity - a.totalQuantity
  );
}

