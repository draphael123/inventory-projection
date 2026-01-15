import { useCallback } from 'react';
import { useInventory } from '../context/InventoryContext';
import { parseFile, getFileType } from '../lib/parsers';
import { calculateDataSummary } from '../lib/validators';
import { aggregateOrderData } from '../lib/aggregator';
import { calculateAllMetrics } from '../lib/metrics';
import { generateAllProjections } from '../lib/forecasting';
import type { ImportedFile } from '../types';

function generateId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function useFileParser() {
  const {
    state,
    addFile,
    updateFile,
    addOrders,
    setSummary,
    setAggregatedData,
    setMetrics,
    setProjections,
    setLoading,
    setError,
  } = useInventory();

  const processFile = useCallback(async (file: File) => {
    const fileId = generateId();
    const fileType = getFileType(file);
    
    if (!fileType) {
      setError(`Unsupported file type: ${file.name}`);
      return;
    }
    
    // Add file to state with processing status
    const importedFile: ImportedFile = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: fileType,
      uploadedAt: new Date(),
      recordCount: 0,
      dateRange: { start: new Date(), end: new Date() },
      status: 'processing',
    };
    
    addFile(importedFile);
    setLoading(true);
    setError(null);
    
    try {
      // Parse file
      const result = await parseFile(file);
      
      if (!result.isValid && result.validRecords.length === 0) {
        const errorMessage = result.errors[0]?.message || 'Failed to parse file';
        updateFile(fileId, { 
          status: 'error', 
          errorMessage,
        });
        setError(errorMessage);
        setLoading(false);
        return;
      }
      
      // Add valid records to state
      addOrders(result.validRecords);
      
      // Update file status
      const summary = calculateDataSummary(result.validRecords);
      updateFile(fileId, {
        status: 'success',
        recordCount: result.validRecords.length,
        dateRange: summary.dateRange,
      });
      
      // Recalculate everything with all orders (including newly added)
      const allOrders = [...state.orders, ...result.validRecords];
      const fullSummary = calculateDataSummary(allOrders);
      setSummary(fullSummary);
      
      // Aggregate data
      const aggregated = aggregateOrderData(allOrders, state.aggregationPeriod);
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
      
      // Return results for UI feedback
      return {
        success: true,
        recordCount: result.validRecords.length,
        skippedRows: result.skippedRows,
        warnings: result.warnings,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateFile(fileId, { 
        status: 'error', 
        errorMessage,
      });
      setError(errorMessage);
      setLoading(false);
      
      return {
        success: false,
        error: errorMessage,
      };
    }
  }, [
    state.orders,
    state.aggregationPeriod,
    state.settings,
    addFile,
    updateFile,
    addOrders,
    setSummary,
    setAggregatedData,
    setMetrics,
    setProjections,
    setLoading,
    setError,
  ]);

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const results = [];
    
    for (const file of Array.from(files)) {
      const result = await processFile(file);
      results.push({ file: file.name, ...result });
    }
    
    return results;
  }, [processFile]);

  return {
    processFile,
    processFiles,
    isLoading: state.isLoading,
    error: state.error,
  };
}

