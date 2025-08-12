import _ from 'lodash';
import { CleaningOptions, CleaningAction } from '../types/data';

export class DataCleaner {
  static cleanDataset(data: any[], options: CleaningOptions): { cleanedData: any[]; actions: CleaningAction[] } {
    let cleanedData = [...data];
    const actions: CleaningAction[] = [];

    // Handle missing values
    const missingActions = this.handleMissingValues(cleanedData, options.handleMissing);
    actions.push(...missingActions.actions);
    cleanedData = missingActions.data;

    // Handle duplicates
    const duplicateActions = this.handleDuplicates(cleanedData, options.handleDuplicates);
    actions.push(...duplicateActions.actions);
    cleanedData = duplicateActions.data;

    // Standardize text
    if (options.standardizeText) {
      const textActions = this.standardizeText(cleanedData);
      actions.push(...textActions.actions);
      cleanedData = textActions.data;
    }

    // Handle outliers
    const outlierActions = this.handleOutliers(cleanedData, options.handleOutliers);
    actions.push(...outlierActions.actions);
    cleanedData = outlierActions.data;

    return { cleanedData, actions };
  }

  private static handleMissingValues(data: any[], method: string): { data: any[]; actions: CleaningAction[] } {
    const actions: CleaningAction[] = [];
    let cleanedData = [...data];

    if (method === 'remove') {
      const originalCount = cleanedData.length;
      cleanedData = cleanedData.filter(row => {
        return Object.values(row).some(value => value !== null && value !== undefined && value !== '');
      });
      
      if (cleanedData.length < originalCount) {
        actions.push({
          type: 'remove',
          column: 'all',
          originalValue: `${originalCount} rows`,
          newValue: `${cleanedData.length} rows`,
          description: `Removed ${originalCount - cleanedData.length} rows with missing values`
        });
      }
    } else {
      // Imputation methods
      const columns = Object.keys(data[0] || {});
      
      columns.forEach(column => {
        const values = cleanedData.map(row => row[column]).filter(v => v !== null && v !== undefined && v !== '');
        
        if (values.length === 0) return;

        let imputeValue;
        switch (method) {
          case 'mean':
            const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
            if (numericValues.length > 0) {
              imputeValue = _.mean(numericValues);
            }
            break;
          case 'median':
            const sortedValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v)).sort((a, b) => a - b);
            if (sortedValues.length > 0) {
              const middle = Math.floor(sortedValues.length / 2);
              imputeValue = sortedValues.length % 2 === 0 
                ? (sortedValues[middle - 1] + sortedValues[middle]) / 2 
                : sortedValues[middle];
            }
            break;
          case 'mode':
            const counts = _.countBy(values);
            imputeValue = _.maxBy(Object.keys(counts), key => counts[key]);
            break;
          case 'forward_fill':
          case 'backward_fill':
            // Will be handled row by row below
            break;
        }

        if (imputeValue !== undefined) {
          let imputedCount = 0;
          cleanedData.forEach(row => {
            if (row[column] === null || row[column] === undefined || row[column] === '') {
              row[column] = imputeValue;
              imputedCount++;
            }
          });

          if (imputedCount > 0) {
            actions.push({
              type: 'impute',
              column,
              originalValue: 'missing',
              newValue: imputeValue,
              description: `Imputed ${imputedCount} missing values with ${method} (${imputeValue})`
            });
          }
        }
      });

      // Handle forward/backward fill
      if (method === 'forward_fill' || method === 'backward_fill') {
        columns.forEach(column => {
          let filledCount = 0;
          
          if (method === 'forward_fill') {
            for (let i = 1; i < cleanedData.length; i++) {
              if ((cleanedData[i][column] === null || cleanedData[i][column] === undefined || cleanedData[i][column] === '') &&
                  (cleanedData[i - 1][column] !== null && cleanedData[i - 1][column] !== undefined && cleanedData[i - 1][column] !== '')) {
                cleanedData[i][column] = cleanedData[i - 1][column];
                filledCount++;
              }
            }
          } else {
            for (let i = cleanedData.length - 2; i >= 0; i--) {
              if ((cleanedData[i][column] === null || cleanedData[i][column] === undefined || cleanedData[i][column] === '') &&
                  (cleanedData[i + 1][column] !== null && cleanedData[i + 1][column] !== undefined && cleanedData[i + 1][column] !== '')) {
                cleanedData[i][column] = cleanedData[i + 1][column];
                filledCount++;
              }
            }
          }

          if (filledCount > 0) {
            actions.push({
              type: 'impute',
              column,
              originalValue: 'missing',
              newValue: 'filled',
              description: `Forward/backward filled ${filledCount} missing values`
            });
          }
        });
      }
    }

    return { data: cleanedData, actions };
  }

  private static handleDuplicates(data: any[], method: string): { data: any[]; actions: CleaningAction[] } {
    const actions: CleaningAction[] = [];
    const originalCount = data.length;
    let cleanedData = [...data];

    if (method !== 'keep') {
      const duplicateGroups = _.groupBy(cleanedData, row => JSON.stringify(row));
      const duplicates = Object.values(duplicateGroups).filter(group => group.length > 1);

      if (duplicates.length > 0) {
        switch (method) {
          case 'remove_first':
            cleanedData = Object.values(duplicateGroups).map(group => group[group.length - 1]);
            break;
          case 'remove_last':
            cleanedData = Object.values(duplicateGroups).map(group => group[0]);
            break;
          case 'remove_all':
            cleanedData = Object.values(duplicateGroups).filter(group => group.length === 1).flat();
            break;
        }

        actions.push({
          type: 'remove',
          column: 'all',
          originalValue: `${originalCount} rows`,
          newValue: `${cleanedData.length} rows`,
          description: `Removed ${originalCount - cleanedData.length} duplicate rows using ${method}`
        });
      }
    }

    return { data: cleanedData, actions };
  }

  private static standardizeText(data: any[]): { data: any[]; actions: CleaningAction[] } {
    const actions: CleaningAction[] = [];
    let cleanedData = [...data];
    const columns = Object.keys(data[0] || {});

    columns.forEach(column => {
      let standardizedCount = 0;
      
      cleanedData.forEach(row => {
        if (typeof row[column] === 'string') {
          const original = row[column];
          const standardized = original.trim().replace(/\s+/g, ' ');
          
          if (original !== standardized) {
            row[column] = standardized;
            standardizedCount++;
          }
        }
      });

      if (standardizedCount > 0) {
        actions.push({
          type: 'standardize',
          column,
          originalValue: 'inconsistent formatting',
          newValue: 'standardized',
          description: `Standardized ${standardizedCount} text values (trimmed whitespace)`
        });
      }
    });

    return { data: cleanedData, actions };
  }

  private static handleOutliers(data: any[], method: string): { data: any[]; actions: CleaningAction[] } {
    const actions: CleaningAction[] = [];
    let cleanedData = [...data];

    if (method === 'keep') {
      return { data: cleanedData, actions };
    }

    const numericColumns = Object.keys(data[0] || {}).filter(column => {
      const values = data.map(row => row[column]).filter(v => v !== null && v !== undefined);
      return values.length > 0 && values.every(v => !isNaN(parseFloat(v)));
    });

    numericColumns.forEach(column => {
      const values = cleanedData.map(row => parseFloat(row[column])).filter(v => !isNaN(v));
      
      if (values.length === 0) return;

      const q1 = this.calculatePercentile(values, 25);
      const q3 = this.calculatePercentile(values, 75);
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;

      let handledCount = 0;

      if (method === 'remove') {
        const originalLength = cleanedData.length;
        cleanedData = cleanedData.filter(row => {
          const value = parseFloat(row[column]);
          return isNaN(value) || (value >= lowerBound && value <= upperBound);
        });
        handledCount = originalLength - cleanedData.length;
      } else if (method === 'cap') {
        cleanedData.forEach(row => {
          const value = parseFloat(row[column]);
          if (!isNaN(value)) {
            if (value < lowerBound) {
              row[column] = lowerBound;
              handledCount++;
            } else if (value > upperBound) {
              row[column] = upperBound;
              handledCount++;
            }
          }
        });
      }

      if (handledCount > 0) {
        actions.push({
          type: method === 'remove' ? 'remove' : 'correct',
          column,
          originalValue: 'outliers',
          newValue: method === 'remove' ? 'removed' : 'capped',
          description: `${method === 'remove' ? 'Removed' : 'Capped'} ${handledCount} outliers in ${column}`
        });
      }
    });

    return { data: cleanedData, actions };
  }

  private static calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;
    
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }
}