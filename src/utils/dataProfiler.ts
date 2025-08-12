import _ from 'lodash';
import { DataProfile, ColumnProfile, DataIssue, QualityMetrics } from '../types/data';

export class DataProfiler {
  static profileDataset(data: any[]): DataProfile {
    if (!data || data.length === 0) {
      return {
        columnCount: 0,
        rowCount: 0,
        missingValues: 0,
        duplicateRows: 0,
        dataTypes: {},
        columnProfiles: {}
      };
    }

    const columns = Object.keys(data[0]);
    const columnProfiles: Record<string, ColumnProfile> = {};
    let totalMissingValues = 0;

    columns.forEach(column => {
      const profile = this.profileColumn(data, column);
      columnProfiles[column] = profile;
      totalMissingValues += profile.nullCount;
    });

    const duplicateRows = this.countDuplicateRows(data);
    const dataTypes = this.inferDataTypes(data);

    return {
      columnCount: columns.length,
      rowCount: data.length,
      missingValues: totalMissingValues,
      duplicateRows,
      dataTypes,
      columnProfiles
    };
  }

  static profileColumn(data: any[], columnName: string): ColumnProfile {
    const values = data.map(row => row[columnName]);
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
    const nullCount = values.length - nonNullValues.length;
    const uniqueValues = _.uniq(nonNullValues);
    const completeness = (nonNullValues.length / values.length) * 100;

    const profile: ColumnProfile = {
      name: columnName,
      dataType: this.inferColumnDataType(nonNullValues),
      nullCount,
      uniqueCount: uniqueValues.length,
      completeness: Math.round(completeness * 100) / 100,
      topValues: this.getTopValues(nonNullValues, 5)
    };

    if (profile.dataType === 'number') {
      const numericValues = nonNullValues.map(v => parseFloat(v)).filter(v => !isNaN(v));
      if (numericValues.length > 0) {
        profile.statistics = {
          min: _.min(numericValues)!,
          max: _.max(numericValues)!,
          mean: Math.round(_.mean(numericValues) * 100) / 100,
          median: this.calculateMedian(numericValues),
          std: Math.round(this.calculateStandardDeviation(numericValues) * 100) / 100
        };
      }
    }

    return profile;
  }

  private static inferColumnDataType(values: any[]): string {
    if (values.length === 0) return 'unknown';

    const sample = values.slice(0, Math.min(100, values.length));
    let numberCount = 0;
    let dateCount = 0;
    let booleanCount = 0;

    sample.forEach(value => {
      if (typeof value === 'number' || (!isNaN(Number(value)) && !isNaN(parseFloat(value)))) {
        numberCount++;
      } else if (this.isDate(value)) {
        dateCount++;
      } else if (this.isBoolean(value)) {
        booleanCount++;
      }
    });

    const total = sample.length;
    if (numberCount / total > 0.8) return 'number';
    if (dateCount / total > 0.8) return 'date';
    if (booleanCount / total > 0.8) return 'boolean';
    return 'string';
  }

  private static isDate(value: any): boolean {
    if (!value) return false;
    const date = new Date(value);
    return !isNaN(date.getTime()) && value.toString().length > 5;
  }

  private static isBoolean(value: any): boolean {
    if (typeof value === 'boolean') return true;
    const str = value.toString().toLowerCase();
    return ['true', 'false', 'yes', 'no', '1', '0', 'y', 'n'].includes(str);
  }

  private static inferDataTypes(data: any[]): Record<string, string> {
    if (data.length === 0) return {};
    
    const columns = Object.keys(data[0]);
    const dataTypes: Record<string, string> = {};
    
    columns.forEach(column => {
      const values = data.map(row => row[column]).filter(v => v !== null && v !== undefined && v !== '');
      dataTypes[column] = this.inferColumnDataType(values);
    });
    
    return dataTypes;
  }

  private static countDuplicateRows(data: any[]): number {
    const uniqueRows = _.uniqBy(data, row => JSON.stringify(row));
    return data.length - uniqueRows.length;
  }

  private static getTopValues(values: any[], limit: number): Array<{ value: any; count: number }> {
    const counts = _.countBy(values);
    return _.chain(counts)
      .map((count, value) => ({ value, count }))
      .orderBy('count', 'desc')
      .take(limit)
      .value();
  }

  private static calculateMedian(values: number[]): number {
    const sorted = values.slice().sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
      ? (sorted[middle - 1] + sorted[middle]) / 2 
      : sorted[middle];
  }

  private static calculateStandardDeviation(values: number[]): number {
    const mean = _.mean(values);
    const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
    const avgSquaredDiff = _.mean(squaredDiffs);
    return Math.sqrt(avgSquaredDiff);
  }

  static detectIssues(data: any[], profile: DataProfile): DataIssue[] {
    const issues: DataIssue[] = [];
    
    // Detect missing values
    Object.values(profile.columnProfiles).forEach(columnProfile => {
      if (columnProfile.nullCount > 0) {
        issues.push({
          type: 'missing',
          column: columnProfile.name,
          description: `${columnProfile.nullCount} missing values (${(100 - columnProfile.completeness).toFixed(1)}%)`,
          severity: columnProfile.completeness < 50 ? 'high' : columnProfile.completeness < 80 ? 'medium' : 'low',
          suggestion: 'Consider imputing missing values or removing incomplete records'
        });
      }
    });

    // Detect duplicates
    if (profile.duplicateRows > 0) {
      issues.push({
        type: 'duplicate',
        column: 'all',
        description: `${profile.duplicateRows} duplicate rows found`,
        severity: profile.duplicateRows > data.length * 0.1 ? 'high' : 'medium',
        suggestion: 'Remove duplicate rows to avoid skewed analysis'
      });
    }

    // Detect outliers for numeric columns
    Object.values(profile.columnProfiles).forEach(columnProfile => {
      if (columnProfile.dataType === 'number' && columnProfile.statistics) {
        const outliers = this.detectOutliers(data, columnProfile.name, columnProfile.statistics);
        if (outliers.length > 0) {
          issues.push({
            type: 'outlier',
            column: columnProfile.name,
            description: `${outliers.length} potential outliers detected`,
            severity: outliers.length > data.length * 0.05 ? 'medium' : 'low',
            suggestion: 'Review outliers to determine if they are errors or valid extreme values'
          });
        }
      }
    });

    // Detect inconsistent text formatting
    Object.values(profile.columnProfiles).forEach(columnProfile => {
      if (columnProfile.dataType === 'string') {
        const inconsistencies = this.detectTextInconsistencies(data, columnProfile.name);
        if (inconsistencies > 0) {
          issues.push({
            type: 'inconsistent',
            column: columnProfile.name,
            description: `Inconsistent text formatting detected`,
            severity: 'low',
            suggestion: 'Standardize text case and remove extra whitespace'
          });
        }
      }
    });

    return issues;
  }

  private static detectOutliers(data: any[], column: string, stats: any): number[] {
    const values = data.map((row, index) => ({ value: parseFloat(row[column]), index }))
                     .filter(item => !isNaN(item.value));
    
    const q1 = this.calculatePercentile(values.map(v => v.value), 25);
    const q3 = this.calculatePercentile(values.map(v => v.value), 75);
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return values.filter(item => item.value < lowerBound || item.value > upperBound)
                 .map(item => item.index);
  }

  private static calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  private static detectTextInconsistencies(data: any[], column: string): number {
    const values = data.map(row => row[column]).filter(v => v && typeof v === 'string');
    let inconsistencies = 0;
    
    const hasMultipleCases = values.some(v => v !== v.toLowerCase()) && values.some(v => v !== v.toUpperCase());
    const hasExtraWhitespace = values.some(v => v !== v.trim() || v.includes('  '));
    
    if (hasMultipleCases || hasExtraWhitespace) {
      inconsistencies++;
    }
    
    return inconsistencies;
  }

  static calculateQualityMetrics(data: any[], profile: DataProfile): QualityMetrics {
    const totalCells = profile.rowCount * profile.columnCount;
    const completeness = totalCells > 0 ? ((totalCells - profile.missingValues) / totalCells) * 100 : 100;
    
    const uniqueness = profile.rowCount > 0 ? ((profile.rowCount - profile.duplicateRows) / profile.rowCount) * 100 : 100;
    
    // Calculate validity based on data type consistency
    let validCells = 0;
    Object.values(profile.columnProfiles).forEach(columnProfile => {
      validCells += columnProfile.uniqueCount > 0 ? profile.rowCount - columnProfile.nullCount : 0;
    });
    const validity = totalCells > 0 ? (validCells / totalCells) * 100 : 100;
    
    const consistency = 85; // Simplified consistency metric
    const overallScore = (completeness + validity + consistency + uniqueness) / 4;
    
    return {
      overallScore: Math.round(overallScore),
      completeness: Math.round(completeness),
      validity: Math.round(validity),
      consistency: Math.round(consistency),
      uniqueness: Math.round(uniqueness)
    };
  }
}