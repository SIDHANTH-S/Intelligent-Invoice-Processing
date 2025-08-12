import { ValidationRule, SkipPattern, ValidationResult } from '../types/survey';

export class SurveyValidator {
  static validateData(
    data: any[],
    rules: ValidationRule[],
    skipPatterns: SkipPattern[] = []
  ): ValidationResult[] {
    const results: ValidationResult[] = [];

    rules.forEach(rule => {
      const violations: Array<{ row: number; value: any; message: string }> = [];
      
      data.forEach((row, index) => {
        // Check if this field should be skipped based on skip patterns
        const shouldSkip = this.shouldSkipField(row, rule.field, skipPatterns);
        if (shouldSkip) return;

        const violation = this.validateRule(row, rule, index);
        if (violation) {
          violations.push(violation);
        }
      });

      results.push({
        rule,
        passed: violations.length === 0,
        violations
      });
    });

    return results;
  }

  private static shouldSkipField(
    row: any,
    fieldName: string,
    skipPatterns: SkipPattern[]
  ): boolean {
    return skipPatterns.some(pattern => {
      if (!pattern.targetFields.includes(fieldName)) return false;
      
      try {
        return this.evaluateCondition(row, pattern.condition);
      } catch (error) {
        console.warn(`Error evaluating skip pattern condition: ${pattern.condition}`, error);
        return false;
      }
    });
  }

  private static validateRule(
    row: any,
    rule: ValidationRule,
    rowIndex: number
  ): { row: number; value: any; message: string } | null {
    const value = row[rule.field];

    try {
      switch (rule.type) {
        case 'required':
          if (value === null || value === undefined || value === '') {
            return {
              row: rowIndex + 1,
              value,
              message: `${rule.field} is required but is missing`
            };
          }
          break;

        case 'range':
          const numValue = parseFloat(value);
          if (!isNaN(numValue)) {
            const condition = rule.condition;
            if (!this.evaluateRangeCondition(numValue, condition)) {
              return {
                row: rowIndex + 1,
                value,
                message: `${rule.field} value ${value} does not meet range condition: ${condition}`
              };
            }
          }
          break;

        case 'format':
          if (value && !this.validateFormat(value, rule.condition)) {
            return {
              row: rowIndex + 1,
              value,
              message: `${rule.field} value ${value} does not match required format: ${rule.condition}`
            };
          }
          break;

        case 'custom':
          if (!this.evaluateCondition(row, rule.condition)) {
            return {
              row: rowIndex + 1,
              value,
              message: rule.message || `Custom validation failed for ${rule.field}`
            };
          }
          break;
      }
    } catch (error) {
      console.warn(`Error validating rule for ${rule.field}:`, error);
    }

    return null;
  }

  private static evaluateRangeCondition(value: number, condition: string): boolean {
    // Parse conditions like ">=0 AND <=120", "between 18 and 65", etc.
    const betweenMatch = condition.match(/between\s+(\d+(?:\.\d+)?)\s+and\s+(\d+(?:\.\d+)?)/i);
    if (betweenMatch) {
      const min = parseFloat(betweenMatch[1]);
      const max = parseFloat(betweenMatch[2]);
      return value >= min && value <= max;
    }

    const rangeMatch = condition.match(/(>=?|<=?)\s*(\d+(?:\.\d+)?)/g);
    if (rangeMatch) {
      return rangeMatch.every(part => {
        const match = part.match(/(>=?|<=?)\s*(\d+(?:\.\d+)?)/);
        if (!match) return true;
        
        const operator = match[1];
        const threshold = parseFloat(match[2]);
        
        switch (operator) {
          case '>': return value > threshold;
          case '>=': return value >= threshold;
          case '<': return value < threshold;
          case '<=': return value <= threshold;
          default: return true;
        }
      });
    }

    return true;
  }

  private static validateFormat(value: string, format: string): boolean {
    switch (format.toLowerCase()) {
      case 'email':
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      case 'phone':
        return /^\+?[\d\s\-\(\)]{10,}$/.test(value);
      case 'date':
        return !isNaN(Date.parse(value));
      case 'numeric':
        return !isNaN(parseFloat(value));
      default:
        try {
          const regex = new RegExp(format);
          return regex.test(value);
        } catch {
          return true;
        }
    }
  }

  private static evaluateCondition(row: any, condition: string): boolean {
    try {
      // Simple condition evaluation - in production, use a proper expression parser
      const sanitizedCondition = condition
        .replace(/\b(\w+)\b/g, (match) => {
          if (['AND', 'OR', 'NOT', 'true', 'false', 'null'].includes(match.toUpperCase())) {
            return match.toUpperCase() === 'NULL' ? 'null' : match.toLowerCase();
          }
          const value = row[match];
          if (typeof value === 'string') {
            return `"${value}"`;
          }
          return value !== undefined ? JSON.stringify(value) : 'null';
        })
        .replace(/\bAND\b/g, '&&')
        .replace(/\bOR\b/g, '||')
        .replace(/\bNOT\b/g, '!')
        .replace(/=/g, '===');

      return Function(`"use strict"; return (${sanitizedCondition})`)();
    } catch (error) {
      console.warn('Error evaluating condition:', condition, error);
      return true;
    }
  }

  static validateSkipPatterns(
    data: any[],
    skipPatterns: SkipPattern[]
  ): Array<{ pattern: SkipPattern; violations: Array<{ row: number; issue: string }> }> {
    return skipPatterns.map(pattern => {
      const violations: Array<{ row: number; issue: string }> = [];

      data.forEach((row, index) => {
        try {
          const conditionMet = this.evaluateCondition(row, pattern.condition);
          
          if (conditionMet) {
            // Check if target fields have the expected value (usually null/empty)
            pattern.targetFields.forEach(field => {
              const value = row[field];
              const hasValue = value !== null && value !== undefined && value !== '';
              
              if (hasValue && pattern.expectedValue === null) {
                violations.push({
                  row: index + 1,
                  issue: `${field} should be empty when ${pattern.condition}, but has value: ${value}`
                });
              } else if (!hasValue && pattern.expectedValue !== null) {
                violations.push({
                  row: index + 1,
                  issue: `${field} should have value ${pattern.expectedValue} when ${pattern.condition}, but is empty`
                });
              }
            });
          }
        } catch (error) {
          console.warn(`Error validating skip pattern: ${pattern.name}`, error);
        }
      });

      return { pattern, violations };
    });
  }

  static generateCommonRules(columns: string[], dataTypes: Record<string, string>): ValidationRule[] {
    const rules: ValidationRule[] = [];

    columns.forEach(column => {
      const dataType = dataTypes[column];

      // Age validation
      if (column.toLowerCase().includes('age')) {
        rules.push({
          id: `${column}_age_range`,
          name: `${column} Age Range`,
          type: 'range',
          field: column,
          condition: 'between 0 and 120',
          message: 'Age must be between 0 and 120',
          severity: 'error'
        });
      }

      // Email validation
      if (column.toLowerCase().includes('email')) {
        rules.push({
          id: `${column}_email_format`,
          name: `${column} Email Format`,
          type: 'format',
          field: column,
          condition: 'email',
          message: 'Must be a valid email address',
          severity: 'error'
        });
      }

      // Phone validation
      if (column.toLowerCase().includes('phone')) {
        rules.push({
          id: `${column}_phone_format`,
          name: `${column} Phone Format`,
          type: 'format',
          field: column,
          condition: 'phone',
          message: 'Must be a valid phone number',
          severity: 'warning'
        });
      }

      // Numeric range validation for scores/ratings
      if (column.toLowerCase().includes('score') || column.toLowerCase().includes('rating')) {
        rules.push({
          id: `${column}_score_range`,
          name: `${column} Score Range`,
          type: 'range',
          field: column,
          condition: 'between 1 and 10',
          message: 'Score must be between 1 and 10',
          severity: 'warning'
        });
      }
    });

    return rules;
  }
}