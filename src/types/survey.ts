export interface SurveySchema {
  id: string;
  name: string;
  fields: SchemaField[];
  validationRules: ValidationRule[];
  skipPatterns: SkipPattern[];
}

export interface SchemaField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'categorical' | 'boolean' | 'scale';
  required: boolean;
  description?: string;
  validValues?: string[];
  range?: { min: number; max: number };
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
  confidence: number;
  transformation?: string;
}

export interface ValidationRule {
  id: string;
  name: string;
  type: 'range' | 'format' | 'required' | 'custom';
  field: string;
  condition: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface SkipPattern {
  id: string;
  name: string;
  condition: string;
  targetFields: string[];
  expectedValue: any;
}

export interface WeightVariable {
  column: string;
  type: 'design' | 'post_stratification' | 'raking';
  description: string;
}

export interface EstimationOptions {
  weighted: boolean;
  confidenceLevel: number;
  varianceMethod: 'taylor' | 'bootstrap' | 'jackknife';
  finitePopulationCorrection: boolean;
  populationSize?: number;
}

export interface SurveyEstimate {
  variable: string;
  estimate: number;
  standardError: number;
  marginOfError: number;
  confidenceInterval: [number, number];
  sampleSize: number;
  effectiveSampleSize?: number;
  designEffect?: number;
}

export interface NLPQuery {
  id: string;
  query: string;
  response: string;
  timestamp: Date;
  accepted: boolean;
  context: any;
}

export interface DataQualityReport {
  id: string;
  timestamp: Date;
  dataset: string;
  summary: {
    totalRows: number;
    totalColumns: number;
    qualityScore: number;
    issuesFound: number;
    issuesFixed: number;
  };
  columnProfiles: ColumnQualityProfile[];
  cleaningSteps: CleaningStep[];
  validationResults: ValidationResult[];
  estimates?: SurveyEstimate[];
}

export interface ColumnQualityProfile {
  name: string;
  type: string;
  completeness: number;
  uniqueness: number;
  validity: number;
  distribution: any;
  outliers: number;
  correlations: Array<{ column: string; correlation: number }>;
}

export interface CleaningStep {
  id: string;
  timestamp: Date;
  operation: string;
  column: string;
  description: string;
  affectedRows: number;
  parameters: any;
}

export interface ValidationResult {
  rule: ValidationRule;
  passed: boolean;
  violations: Array<{
    row: number;
    value: any;
    message: string;
  }>;
}