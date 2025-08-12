import { ColumnMapping, SchemaField } from '../types/survey';
import _ from 'lodash';

export class SchemaMapper {
  static suggestMappings(
    dataColumns: string[],
    schemaFields: SchemaField[]
  ): ColumnMapping[] {
    const mappings: ColumnMapping[] = [];

    dataColumns.forEach(column => {
      const bestMatch = this.findBestMatch(column, schemaFields);
      if (bestMatch) {
        mappings.push({
          sourceColumn: column,
          targetField: bestMatch.field.id,
          confidence: bestMatch.confidence,
          transformation: bestMatch.transformation
        });
      }
    });

    return mappings;
  }

  private static findBestMatch(
    column: string,
    schemaFields: SchemaField[]
  ): { field: SchemaField; confidence: number; transformation?: string } | null {
    let bestMatch: { field: SchemaField; confidence: number; transformation?: string } | null = null;
    let highestScore = 0;

    schemaFields.forEach(field => {
      const score = this.calculateSimilarity(column, field);
      if (score > highestScore && score > 0.3) {
        bestMatch = {
          field,
          confidence: score,
          transformation: this.suggestTransformation(column, field)
        };
        highestScore = score;
      }
    });

    return bestMatch;
  }

  private static calculateSimilarity(column: string, field: SchemaField): number {
    const columnLower = column.toLowerCase().replace(/[_\s-]/g, '');
    const fieldLower = field.name.toLowerCase().replace(/[_\s-]/g, '');
    
    // Exact match
    if (columnLower === fieldLower) return 1.0;
    
    // Contains match
    if (columnLower.includes(fieldLower) || fieldLower.includes(columnLower)) {
      return 0.8;
    }
    
    // Levenshtein distance
    const distance = this.levenshteinDistance(columnLower, fieldLower);
    const maxLength = Math.max(columnLower.length, fieldLower.length);
    const similarity = 1 - (distance / maxLength);
    
    // Keyword matching
    const keywords = this.extractKeywords(field.description || '');
    const keywordMatch = keywords.some(keyword => 
      columnLower.includes(keyword.toLowerCase())
    );
    
    return keywordMatch ? Math.max(similarity, 0.6) : similarity;
  }

  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(null)
    );

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private static extractKeywords(description: string): string[] {
    return description.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 5);
  }

  private static suggestTransformation(column: string, field: SchemaField): string | undefined {
    const columnLower = column.toLowerCase();
    
    if (field.type === 'date' && !columnLower.includes('date')) {
      return 'parseDate';
    }
    
    if (field.type === 'number' && columnLower.includes('text')) {
      return 'parseNumber';
    }
    
    if (field.type === 'categorical' && field.validValues) {
      return 'mapCategories';
    }
    
    return undefined;
  }

  static applyMapping(
    data: any[],
    mappings: ColumnMapping[],
    schemaFields: SchemaField[]
  ): any[] {
    return data.map(row => {
      const mappedRow: any = {};
      
      mappings.forEach(mapping => {
        const sourceValue = row[mapping.sourceColumn];
        const targetField = schemaFields.find(f => f.id === mapping.targetField);
        
        if (targetField && sourceValue !== undefined) {
          mappedRow[mapping.targetField] = this.transformValue(
            sourceValue,
            mapping.transformation,
            targetField
          );
        }
      });
      
      return mappedRow;
    });
  }

  private static transformValue(
    value: any,
    transformation: string | undefined,
    field: SchemaField
  ): any {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    switch (transformation) {
      case 'parseDate':
        return new Date(value);
      case 'parseNumber':
        const num = parseFloat(value);
        return isNaN(num) ? null : num;
      case 'mapCategories':
        return this.mapToValidCategory(value, field.validValues || []);
      default:
        return value;
    }
  }

  private static mapToValidCategory(value: string, validValues: string[]): string | null {
    const valueLower = value.toString().toLowerCase();
    
    // Exact match
    const exactMatch = validValues.find(v => v.toLowerCase() === valueLower);
    if (exactMatch) return exactMatch;
    
    // Partial match
    const partialMatch = validValues.find(v => 
      v.toLowerCase().includes(valueLower) || valueLower.includes(v.toLowerCase())
    );
    
    return partialMatch || null;
  }
}