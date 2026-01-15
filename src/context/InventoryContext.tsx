import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import type { 
  AppState, 
  AppAction, 
  OrderRecord, 
  ForecastSettings,
  AggregationPeriod,
  FilterState,
  ViewMode,
  ImportedFile,
  DataSummary,
  ProductAggregation,
  ProductMetrics,
  ProductProjection,
} from '../types';

// ==========================================
// Initial State
// ==========================================

const defaultSettings: ForecastSettings = {
  method: 'wma',
  timeframe: '4_weeks',
  periods: 4,
  safetyStockPercent: 20,
  leadTimeDays: 7,
  confidenceLevel: 0.95,
};

const defaultFilters: FilterState = {
  selectedProducts: [],
  selectedCategories: [],
  searchQuery: '',
};

const initialState: AppState = {
  orders: [],
  files: [],
  summary: null,
  aggregatedData: new Map(),
  metrics: new Map(),
  projections: new Map(),
  settings: defaultSettings,
  aggregationPeriod: 'weekly',
  filters: defaultFilters,
  viewMode: 'both',
  selectedProductId: null,
  isLoading: false,
  error: null,
};

// ==========================================
// Reducer
// ==========================================

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'ADD_FILE':
      return { ...state, files: [...state.files, action.payload] };
    
    case 'UPDATE_FILE':
      return {
        ...state,
        files: state.files.map(f => 
          f.id === action.payload.id ? { ...f, ...action.payload } : f
        ),
      };
    
    case 'REMOVE_FILE':
      return {
        ...state,
        files: state.files.filter(f => f.id !== action.payload),
      };
    
    case 'ADD_ORDERS':
      return { ...state, orders: [...state.orders, ...action.payload] };
    
    case 'CLEAR_DATA':
      return {
        ...initialState,
        settings: state.settings,
        aggregationPeriod: state.aggregationPeriod,
      };
    
    case 'SET_SUMMARY':
      return { ...state, summary: action.payload };
    
    case 'SET_AGGREGATED_DATA':
      return { ...state, aggregatedData: action.payload };
    
    case 'SET_METRICS':
      return { ...state, metrics: action.payload };
    
    case 'SET_PROJECTIONS':
      return { ...state, projections: action.payload };
    
    case 'UPDATE_SETTINGS':
      return { 
        ...state, 
        settings: { ...state.settings, ...action.payload },
      };
    
    case 'SET_AGGREGATION_PERIOD':
      return { ...state, aggregationPeriod: action.payload };
    
    case 'SET_FILTERS':
      return { 
        ...state, 
        filters: { ...state.filters, ...action.payload },
      };
    
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.payload };
    
    case 'SELECT_PRODUCT':
      return { ...state, selectedProductId: action.payload };
    
    default:
      return state;
  }
}

// ==========================================
// Context
// ==========================================

interface InventoryContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  
  // Convenience actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addFile: (file: ImportedFile) => void;
  updateFile: (id: string, updates: Partial<ImportedFile>) => void;
  removeFile: (id: string) => void;
  addOrders: (orders: OrderRecord[]) => void;
  clearData: () => void;
  setSummary: (summary: DataSummary) => void;
  setAggregatedData: (data: Map<string, ProductAggregation>) => void;
  setMetrics: (metrics: Map<string, ProductMetrics>) => void;
  setProjections: (projections: Map<string, ProductProjection>) => void;
  updateSettings: (settings: Partial<ForecastSettings>) => void;
  setAggregationPeriod: (period: AggregationPeriod) => void;
  setFilters: (filters: Partial<FilterState>) => void;
  setViewMode: (mode: ViewMode) => void;
  selectProduct: (productId: string | null) => void;
  
  // Computed values
  filteredProducts: ProductProjection[];
  selectedProduct: ProductProjection | null;
}

const InventoryContext = createContext<InventoryContextType | null>(null);

// ==========================================
// Provider
// ==========================================

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  
  // Convenience action creators
  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);
  
  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);
  
  const addFile = useCallback((file: ImportedFile) => {
    dispatch({ type: 'ADD_FILE', payload: file });
  }, []);
  
  const updateFile = useCallback((id: string, updates: Partial<ImportedFile>) => {
    dispatch({ type: 'UPDATE_FILE', payload: { id, ...updates } });
  }, []);
  
  const removeFile = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_FILE', payload: id });
  }, []);
  
  const addOrders = useCallback((orders: OrderRecord[]) => {
    dispatch({ type: 'ADD_ORDERS', payload: orders });
  }, []);
  
  const clearData = useCallback(() => {
    dispatch({ type: 'CLEAR_DATA' });
  }, []);
  
  const setSummary = useCallback((summary: DataSummary) => {
    dispatch({ type: 'SET_SUMMARY', payload: summary });
  }, []);
  
  const setAggregatedData = useCallback((data: Map<string, ProductAggregation>) => {
    dispatch({ type: 'SET_AGGREGATED_DATA', payload: data });
  }, []);
  
  const setMetrics = useCallback((metrics: Map<string, ProductMetrics>) => {
    dispatch({ type: 'SET_METRICS', payload: metrics });
  }, []);
  
  const setProjections = useCallback((projections: Map<string, ProductProjection>) => {
    dispatch({ type: 'SET_PROJECTIONS', payload: projections });
  }, []);
  
  const updateSettings = useCallback((settings: Partial<ForecastSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  }, []);
  
  const setAggregationPeriod = useCallback((period: AggregationPeriod) => {
    dispatch({ type: 'SET_AGGREGATION_PERIOD', payload: period });
  }, []);
  
  const setFilters = useCallback((filters: Partial<FilterState>) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);
  
  const setViewMode = useCallback((mode: ViewMode) => {
    dispatch({ type: 'SET_VIEW_MODE', payload: mode });
  }, []);
  
  const selectProduct = useCallback((productId: string | null) => {
    dispatch({ type: 'SELECT_PRODUCT', payload: productId });
  }, []);
  
  // Computed values
  const filteredProducts = useMemo(() => {
    const products = Array.from(state.projections.values());
    const { selectedProducts, selectedCategories, searchQuery } = state.filters;
    
    return products.filter(p => {
      // Filter by selected products
      if (selectedProducts.length > 0 && !selectedProducts.includes(p.productId)) {
        return false;
      }
      
      // Filter by category
      if (selectedCategories.length > 0 && !selectedCategories.includes(p.category || '')) {
        return false;
      }
      
      // Filter by search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = p.productName.toLowerCase().includes(query);
        const matchesId = p.productId.toLowerCase().includes(query);
        if (!matchesName && !matchesId) {
          return false;
        }
      }
      
      return true;
    });
  }, [state.projections, state.filters]);
  
  const selectedProduct = useMemo(() => {
    if (!state.selectedProductId) return null;
    return state.projections.get(state.selectedProductId) || null;
  }, [state.selectedProductId, state.projections]);
  
  const value: InventoryContextType = {
    state,
    dispatch,
    setLoading,
    setError,
    addFile,
    updateFile,
    removeFile,
    addOrders,
    clearData,
    setSummary,
    setAggregatedData,
    setMetrics,
    setProjections,
    updateSettings,
    setAggregationPeriod,
    setFilters,
    setViewMode,
    selectProduct,
    filteredProducts,
    selectedProduct,
  };
  
  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

// ==========================================
// Hook
// ==========================================

export function useInventory() {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
}

