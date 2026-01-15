// ==========================================
// Core Data Types
// ==========================================

export interface OrderRecord {
  date: Date;
  productId: string;
  productName: string;
  quantity: number;
  category?: string;
  unitPrice?: number;
  supplier?: string;
}

export interface RawOrderRecord {
  date: string;
  productId: string;
  productName: string;
  quantity: string | number;
  category?: string;
  unitPrice?: string | number;
  supplier?: string;
}

// ==========================================
// Aggregation Types
// ==========================================

export type AggregationPeriod = 'daily' | 'weekly' | 'monthly';

export interface AggregatedData {
  period: string; // ISO date string for the period start
  periodLabel: string; // Human-readable label
  productId: string;
  productName: string;
  totalQuantity: number;
  orderCount: number;
  avgQuantityPerOrder: number;
}

export interface ProductAggregation {
  productId: string;
  productName: string;
  category?: string;
  data: AggregatedData[];
  totalOrders: number;
  totalQuantity: number;
  firstOrderDate: Date;
  lastOrderDate: Date;
}

// ==========================================
// Metrics Types
// ==========================================

export type TrendDirection = 'increasing' | 'decreasing' | 'stable';

export interface ProductMetrics {
  productId: string;
  productName: string;
  avgDailyDemand: number;
  avgWeeklyDemand: number;
  avgMonthlyDemand: number;
  variance: number;
  stdDeviation: number;
  coefficientOfVariation: number;
  trend: TrendDirection;
  trendSlope: number;
  trendStrength: number; // R-squared value
  seasonalityIndex?: number[];
  outliers: OutlierData[];
  minDemand: number;
  maxDemand: number;
  medianDemand: number;
}

export interface OutlierData {
  date: Date;
  period: string;
  quantity: number;
  zScore: number;
  type: 'spike' | 'drop';
}

// ==========================================
// Forecasting Types
// ==========================================

export type ForecastMethod = 'sma' | 'wma' | 'linear_regression';

export type ProjectionTimeframe = 
  | '1_week' | '2_weeks' | '4_weeks' | '8_weeks' | '12_weeks'
  | '1_month' | '2_months' | '3_months' | '6_months';

export interface ForecastSettings {
  method: ForecastMethod;
  timeframe: ProjectionTimeframe;
  periods: number; // Number of periods for moving averages
  safetyStockPercent: number;
  leadTimeDays: number;
  confidenceLevel: number; // e.g., 0.95 for 95%
}

export interface ProjectionPoint {
  period: string;
  periodLabel: string;
  projectedDemand: number;
  confidenceLow: number;
  confidenceHigh: number;
  isForecast: boolean;
}

export interface ProductProjection {
  productId: string;
  productName: string;
  category?: string;
  currentStock?: number;
  historicalData: ProjectionPoint[];
  projectedData: ProjectionPoint[];
  totalProjectedDemand: number;
  avgProjectedDemand: number;
  suggestedReorderQty: number;
  reorderPoint: number;
  safetyStock: number;
  confidenceLevel: number;
  method: ForecastMethod;
  metrics: ProductMetrics;
}

// ==========================================
// Application State Types
// ==========================================

export interface ImportedFile {
  id: string;
  name: string;
  size: number;
  type: 'csv' | 'xlsx';
  uploadedAt: Date;
  recordCount: number;
  dateRange: {
    start: Date;
    end: Date;
  };
  status: 'processing' | 'success' | 'error';
  errorMessage?: string;
}

export interface DataSummary {
  totalRecords: number;
  totalProducts: number;
  totalQuantity: number;
  dateRange: {
    start: Date;
    end: Date;
  };
  categories: string[];
  suppliers: string[];
}

export interface ValidationError {
  row: number;
  field: string;
  value: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  validRecords: OrderRecord[];
  skippedRows: number;
}

// ==========================================
// UI State Types
// ==========================================

export type ViewMode = 'chart' | 'table' | 'both';

export interface FilterState {
  selectedProducts: string[];
  selectedCategories: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery: string;
}

export interface AppState {
  // Data state
  orders: OrderRecord[];
  files: ImportedFile[];
  summary: DataSummary | null;
  
  // Analysis state
  aggregatedData: Map<string, ProductAggregation>;
  metrics: Map<string, ProductMetrics>;
  projections: Map<string, ProductProjection>;
  
  // Settings
  settings: ForecastSettings;
  aggregationPeriod: AggregationPeriod;
  
  // UI state
  filters: FilterState;
  viewMode: ViewMode;
  selectedProductId: string | null;
  isLoading: boolean;
  error: string | null;
}

// ==========================================
// Action Types
// ==========================================

export type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_FILE'; payload: ImportedFile }
  | { type: 'UPDATE_FILE'; payload: Partial<ImportedFile> & { id: string } }
  | { type: 'REMOVE_FILE'; payload: string }
  | { type: 'ADD_ORDERS'; payload: OrderRecord[] }
  | { type: 'CLEAR_DATA' }
  | { type: 'SET_SUMMARY'; payload: DataSummary }
  | { type: 'SET_AGGREGATED_DATA'; payload: Map<string, ProductAggregation> }
  | { type: 'SET_METRICS'; payload: Map<string, ProductMetrics> }
  | { type: 'SET_PROJECTIONS'; payload: Map<string, ProductProjection> }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<ForecastSettings> }
  | { type: 'SET_AGGREGATION_PERIOD'; payload: AggregationPeriod }
  | { type: 'SET_FILTERS'; payload: Partial<FilterState> }
  | { type: 'SET_VIEW_MODE'; payload: ViewMode }
  | { type: 'SELECT_PRODUCT'; payload: string | null };

// ==========================================
// Export Types
// ==========================================

export interface ExportOptions {
  format: 'csv' | 'xlsx';
  includeHistorical: boolean;
  includeMetrics: boolean;
  includeProjections: boolean;
}

export interface ExportData {
  productId: string;
  productName: string;
  category?: string;
  avgDailyDemand?: number;
  avgWeeklyDemand?: number;
  trend?: TrendDirection;
  projectedDemand?: number;
  suggestedReorderQty?: number;
  safetyStock?: number;
  confidenceLevel?: number;
  confidenceLow?: number;
  confidenceHigh?: number;
}

