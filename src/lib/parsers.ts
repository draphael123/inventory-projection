import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { OrderRecord, ValidationResult, ValidationError } from '../types';

// ==========================================
// Column Mapping
// ==========================================

const COLUMN_MAPPINGS: Record<string, string[]> = {
  date: ['date', 'order_date', 'orderdate', 'order date', 'transaction_date', 'transactiondate'],
  productId: ['product_id', 'productid', 'product id', 'sku', 'item_id', 'itemid', 'item id', 'id'],
  productName: ['product_name', 'productname', 'product name', 'name', 'item_name', 'itemname', 'item name', 'description', 'product'],
  quantity: ['quantity', 'qty', 'quantity_ordered', 'quantityordered', 'order_quantity', 'orderquantity', 'units', 'amount'],
  category: ['category', 'product_category', 'productcategory', 'type', 'group'],
  unitPrice: ['unit_price', 'unitprice', 'unit price', 'price', 'cost', 'unit_cost', 'unitcost'],
  supplier: ['supplier', 'vendor', 'supplier_name', 'suppliername', 'vendor_name', 'vendorname'],
};

function normalizeColumnName(name: string): string {
  return name.toLowerCase().trim().replace(/[_\s]+/g, '_');
}

function mapColumns(headers: string[]): Map<string, string> {
  const mapping = new Map<string, string>();
  const normalizedHeaders = headers.map(h => normalizeColumnName(h));
  
  for (const [field, aliases] of Object.entries(COLUMN_MAPPINGS)) {
    for (const alias of aliases) {
      const normalizedAlias = normalizeColumnName(alias);
      const headerIndex = normalizedHeaders.findIndex(h => h === normalizedAlias || h.includes(normalizedAlias));
      if (headerIndex !== -1) {
        mapping.set(field, headers[headerIndex]);
        break;
      }
    }
  }
  
  return mapping;
}

// ==========================================
// Data Validation
// ==========================================

function parseDate(value: string): Date | null {
  if (!value) return null;
  
  // Try native Date parsing first
  const parsed = new Date(value);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  
  // Try manual parsing for common formats
  const parts = value.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const [a, b, c] = parts.map(p => parseInt(p, 10));
    
    // Assume MM/DD/YYYY or DD/MM/YYYY based on values
    if (c > 1900) {
      // Year is last
      if (a > 12) {
        // a is day, b is month (DD/MM/YYYY)
        return new Date(c, b - 1, a);
      } else {
        // Assume MM/DD/YYYY (US format)
        return new Date(c, a - 1, b);
      }
    } else if (a > 1900) {
      // Year is first (YYYY/MM/DD)
      return new Date(a, b - 1, c);
    }
  }
  
  return null;
}

function parseNumber(value: string | number | undefined): number | null {
  if (value === undefined || value === null || value === '') return null;
  
  if (typeof value === 'number') return isNaN(value) ? null : value;
  
  // Remove currency symbols and commas
  const cleaned = value.toString().replace(/[$€£¥,\s]/g, '');
  const parsed = parseFloat(cleaned);
  
  return isNaN(parsed) ? null : parsed;
}

function validateRecord(
  raw: Record<string, unknown>,
  columnMapping: Map<string, string>,
  rowIndex: number
): { record: OrderRecord | null; errors: ValidationError[] } {
  const errors: ValidationError[] = [];
  
  // Get mapped values
  const dateCol = columnMapping.get('date');
  const productIdCol = columnMapping.get('productId');
  const productNameCol = columnMapping.get('productName');
  const quantityCol = columnMapping.get('quantity');
  const categoryCol = columnMapping.get('category');
  const unitPriceCol = columnMapping.get('unitPrice');
  const supplierCol = columnMapping.get('supplier');
  
  // Validate required fields
  const dateValue = dateCol ? raw[dateCol] as string : '';
  const date = parseDate(dateValue);
  if (!date) {
    errors.push({
      row: rowIndex,
      field: 'date',
      value: String(dateValue || ''),
      message: 'Invalid or missing date',
    });
  }
  
  const productId = productIdCol ? String(raw[productIdCol] || '').trim() : '';
  if (!productId) {
    errors.push({
      row: rowIndex,
      field: 'productId',
      value: '',
      message: 'Missing product ID/SKU',
    });
  }
  
  const productName = productNameCol ? String(raw[productNameCol] || '').trim() : '';
  if (!productName) {
    errors.push({
      row: rowIndex,
      field: 'productName',
      value: '',
      message: 'Missing product name',
    });
  }
  
  const quantityValue = quantityCol ? raw[quantityCol] : undefined;
  const quantity = parseNumber(quantityValue as string | number);
  if (quantity === null || quantity < 0) {
    errors.push({
      row: rowIndex,
      field: 'quantity',
      value: String(quantityValue || ''),
      message: 'Invalid or missing quantity',
    });
  }
  
  if (errors.length > 0) {
    return { record: null, errors };
  }
  
  // Build valid record
  const record: OrderRecord = {
    date: date!,
    productId,
    productName,
    quantity: quantity!,
  };
  
  // Add optional fields
  if (categoryCol && raw[categoryCol]) {
    record.category = String(raw[categoryCol]).trim();
  }
  
  if (unitPriceCol) {
    const price = parseNumber(raw[unitPriceCol] as string | number);
    if (price !== null) {
      record.unitPrice = price;
    }
  }
  
  if (supplierCol && raw[supplierCol]) {
    record.supplier = String(raw[supplierCol]).trim();
  }
  
  return { record, errors: [] };
}

// ==========================================
// CSV Parser
// ==========================================

export function parseCSV(file: File): Promise<ValidationResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || [];
        const columnMapping = mapColumns(headers);
        
        // Check for required columns
        const requiredFields = ['date', 'productId', 'productName', 'quantity'];
        const missingFields = requiredFields.filter(f => !columnMapping.has(f));
        
        if (missingFields.length > 0) {
          resolve({
            isValid: false,
            errors: [{
              row: 0,
              field: 'headers',
              value: headers.join(', '),
              message: `Missing required columns: ${missingFields.join(', ')}. Found columns: ${headers.join(', ')}`,
            }],
            warnings: [],
            validRecords: [],
            skippedRows: results.data.length,
          });
          return;
        }
        
        const validRecords: OrderRecord[] = [];
        const errors: ValidationError[] = [];
        const warnings: ValidationError[] = [];
        let skippedRows = 0;
        
        results.data.forEach((row, index) => {
          const { record, errors: rowErrors } = validateRecord(
            row as Record<string, unknown>,
            columnMapping,
            index + 2 // Account for header row and 1-based indexing
          );
          
          if (record) {
            validRecords.push(record);
          } else {
            errors.push(...rowErrors);
            skippedRows++;
          }
        });
        
        resolve({
          isValid: errors.length === 0,
          errors,
          warnings,
          validRecords,
          skippedRows,
        });
      },
      error: (error) => {
        reject(new Error(`CSV parsing error: ${error.message}`));
      },
    });
  });
}

// ==========================================
// Excel Parser
// ==========================================

export function parseExcel(file: File): Promise<ValidationResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        
        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          raw: false,
          dateNF: 'yyyy-mm-dd',
        });
        
        if (jsonData.length === 0) {
          resolve({
            isValid: false,
            errors: [{
              row: 0,
              field: 'data',
              value: '',
              message: 'No data found in the spreadsheet',
            }],
            warnings: [],
            validRecords: [],
            skippedRows: 0,
          });
          return;
        }
        
        // Get headers from first row
        const headers = Object.keys(jsonData[0] as object);
        const columnMapping = mapColumns(headers);
        
        // Check for required columns
        const requiredFields = ['date', 'productId', 'productName', 'quantity'];
        const missingFields = requiredFields.filter(f => !columnMapping.has(f));
        
        if (missingFields.length > 0) {
          resolve({
            isValid: false,
            errors: [{
              row: 0,
              field: 'headers',
              value: headers.join(', '),
              message: `Missing required columns: ${missingFields.join(', ')}. Found columns: ${headers.join(', ')}`,
            }],
            warnings: [],
            validRecords: [],
            skippedRows: jsonData.length,
          });
          return;
        }
        
        const validRecords: OrderRecord[] = [];
        const errors: ValidationError[] = [];
        const warnings: ValidationError[] = [];
        let skippedRows = 0;
        
        jsonData.forEach((row, index) => {
          const { record, errors: rowErrors } = validateRecord(
            row as Record<string, unknown>,
            columnMapping,
            index + 2
          );
          
          if (record) {
            validRecords.push(record);
          } else {
            errors.push(...rowErrors);
            skippedRows++;
          }
        });
        
        resolve({
          isValid: errors.length === 0,
          errors,
          warnings,
          validRecords,
          skippedRows,
        });
      } catch (error) {
        reject(new Error(`Excel parsing error: ${(error as Error).message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

// ==========================================
// File Type Detection
// ==========================================

export function getFileType(file: File): 'csv' | 'xlsx' | null {
  const name = file.name.toLowerCase();
  
  if (name.endsWith('.csv')) return 'csv';
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return 'xlsx';
  
  // Check MIME type as fallback
  if (file.type === 'text/csv') return 'csv';
  if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'xlsx';
  if (file.type === 'application/vnd.ms-excel') return 'xlsx';
  
  return null;
}

export async function parseFile(file: File): Promise<ValidationResult> {
  const fileType = getFileType(file);
  
  if (!fileType) {
    return {
      isValid: false,
      errors: [{
        row: 0,
        field: 'file',
        value: file.name,
        message: 'Unsupported file type. Please upload a CSV or Excel (.xlsx) file.',
      }],
      warnings: [],
      validRecords: [],
      skippedRows: 0,
    };
  }
  
  return fileType === 'csv' ? parseCSV(file) : parseExcel(file);
}

