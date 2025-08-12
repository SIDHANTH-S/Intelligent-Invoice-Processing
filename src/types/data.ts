export interface DataIssue {
  type: 'missing' | 'duplicate' | 'inconsistent' | 'outlier' | 'invalid' | 'structural';
  column: string;
  row?: number;
  value?: any;
  description: string;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

export interface CleaningAction {
  type: 'remove' | 'impute' | 'standardize' | 'correct' | 'merge';
  column: string;
  originalValue: any;
  newValue: any;
  description: string;
}

export interface DataProfile {
  columnCount: number;
  rowCount: number;
  missingValues: number;
  duplicateRows: number;
  dataTypes: Record<string, string>;
  columnProfiles: Record<string, ColumnProfile>;
}

export interface ColumnProfile {
  name: string;
  dataType: string;
  nullCount: number;
  uniqueCount: number;
  completeness: number;
  statistics?: {
    min?: number;
    max?: number;
    mean?: number;
    median?: number;
    std?: number;
  };
  topValues?: Array<{ value: any; count: number }>;
}

export interface QualityMetrics {
  overallScore: number;
  completeness: number;
  validity: number;
  consistency: number;
  uniqueness: number;
}

export interface CleaningOptions {
  handleMissing: 'remove' | 'mean' | 'median' | 'mode' | 'forward_fill' | 'backward_fill';
  handleDuplicates: 'remove_first' | 'remove_last' | 'remove_all';
  handleOutliers: 'remove' | 'cap' | 'keep';
  standardizeText: boolean;
  validateFormats: boolean;
}