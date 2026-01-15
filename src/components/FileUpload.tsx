import React, { useState, useCallback, useRef } from 'react';
import { Card, CardContent, Button, Badge } from './ui';
import { useFileParser } from '../hooks/useFileParser';
import { useInventory } from '../context/InventoryContext';

// Icons
const UploadIcon = () => (
  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const FileIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SpinnerIcon = () => (
  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

export default function FileUpload() {
  const { processFiles, isLoading, error } = useFileParser();
  const { state, clearData, removeFile } = useInventory();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processFiles(files);
    }
  }, [processFiles]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFiles(files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [processFiles]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <Card
        className={`
          relative overflow-hidden cursor-pointer
          transition-all duration-300
          ${isDragging ? 'border-primary-500 bg-primary-500/5 shadow-glow' : ''}
        `}
        hover
      >
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className={`
                text-[var(--color-text-muted)] 
                transition-colors duration-300
                ${isDragging ? 'text-primary-400' : ''}
              `}>
                <UploadIcon />
              </div>
              
              <div>
                <p className="text-lg font-medium text-[var(--color-text)]">
                  {isDragging ? 'Drop files here' : 'Drag & drop your spreadsheets'}
                </p>
                <p className="text-sm text-[var(--color-text-muted)] mt-1">
                  or click to browse • CSV and Excel (.xlsx) files supported
                </p>
              </div>

              <Button variant="secondary" size="sm" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <SpinnerIcon />
                    Processing...
                  </>
                ) : (
                  'Select Files'
                )}
              </Button>
            </div>
          </CardContent>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Animated border on drag */}
        {isDragging && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-0 border-2 border-primary-500 rounded-xl animate-pulse" />
          </div>
        )}
      </Card>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Uploaded files list */}
      {state.files.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-[var(--color-border)]">
              {state.files.map((file, index) => (
                <div
                  key={file.id}
                  className="flex items-center gap-4 p-4 animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="p-2 bg-[var(--color-surface-elevated)] rounded-lg text-[var(--color-text-muted)]">
                    <FileIcon />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-[var(--color-text)] truncate">
                        {file.name}
                      </p>
                      <Badge
                        variant={
                          file.status === 'success' ? 'success' :
                          file.status === 'error' ? 'danger' : 'info'
                        }
                        size="sm"
                      >
                        {file.status === 'processing' && <SpinnerIcon />}
                        {file.status === 'success' && <CheckIcon />}
                        {file.status === 'error' && <XIcon />}
                        {file.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-[var(--color-text-muted)]">
                      <span>{formatFileSize(file.size)}</span>
                      {file.status === 'success' && (
                        <>
                          <span>•</span>
                          <span>{file.recordCount.toLocaleString()} records</span>
                        </>
                      )}
                      <span>•</span>
                      <span>{formatDate(file.uploadedAt)}</span>
                    </div>
                    {file.errorMessage && (
                      <p className="mt-1 text-sm text-red-400">{file.errorMessage}</p>
                    )}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(file.id);
                    }}
                  >
                    <XIcon />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Clear data button */}
      {state.orders.length > 0 && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={clearData}>
            Clear All Data
          </Button>
        </div>
      )}
    </div>
  );
}

