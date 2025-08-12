import React, { useState, useEffect } from 'react';
import { ValidationRule, SkipPattern, ValidationResult } from '../types/survey';
import { SurveyValidator } from '../utils/surveyValidator';
import { Shield, AlertTriangle, CheckCircle, XCircle, Plus, Edit } from 'lucide-react';

interface ValidationDashboardProps {
  data: any[];
  columns: string[];
  dataTypes: Record<string, string>;
  onValidationComplete: (results: ValidationResult[]) => void;
}

export const ValidationDashboard: React.FC<ValidationDashboardProps> = ({
  data,
  columns,
  dataTypes,
  onValidationComplete
}) => {
  const [rules, setRules] = useState<ValidationRule[]>([]);
  const [skipPatterns, setSkipPatterns] = useState<SkipPattern[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    // Generate common validation rules
    const commonRules = SurveyValidator.generateCommonRules(columns, dataTypes);
    setRules(commonRules);
  }, [columns, dataTypes]);

  const runValidation = async () => {
    setIsValidating(true);
    try {
      const results = SurveyValidator.validateData(data, rules, skipPatterns);
      setValidationResults(results);
      onValidationComplete(results);
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const addRule = (rule: ValidationRule) => {
    setRules([...rules, rule]);
    setShowRuleBuilder(false);
  };

  const removeRule = (ruleId: string) => {
    setRules(rules.filter(r => r.id !== ruleId));
  };

  const getSeverityIcon = (severity: string) => {
    return severity === 'error' ? 
      <XCircle className="w-5 h-5 text-red-600" /> : 
      <AlertTriangle className="w-5 h-5 text-yellow-600" />;
  };

  const getSeverityColor = (severity: string) => {
    return severity === 'error' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200';
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-red-500 to-pink-600 w-12 h-12 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Data Validation</h3>
            <p className="text-gray-600">Rule-based validation for survey data quality</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setShowRuleBuilder(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span>Add Rule</span>
          </button>
          <button
            onClick={runValidation}
            disabled={isValidating || rules.length === 0}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isValidating ? 'Validating...' : 'Run Validation'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Validation Rules */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-900">Validation Rules ({rules.length})</h4>
          
          {rules.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h5 className="text-lg font-medium text-gray-700 mb-2">No Rules Defined</h5>
              <p className="text-gray-500">Add validation rules to check data quality</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {rules.map((rule) => (
                <div key={rule.id} className={`border rounded-lg p-4 ${getSeverityColor(rule.severity)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getSeverityIcon(rule.severity)}
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{rule.name}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          <strong>Field:</strong> {rule.field} | <strong>Type:</strong> {rule.type}
                        </div>
                        {rule.condition && (
                          <div className="text-sm text-gray-600">
                            <strong>Condition:</strong> {rule.condition}
                          </div>
                        )}
                        <div className="text-sm text-gray-600 mt-1">{rule.message}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeRule(rule.id)}
                      className="text-red-600 hover:text-red-700 ml-2"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Validation Results */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-900">Validation Results</h4>
          
          {validationResults.length === 0 ? (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h5 className="text-lg font-medium text-gray-700 mb-2">No Results Yet</h5>
              <p className="text-gray-500">Run validation to see results</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {validationResults.map((result, index) => (
                <div key={index} className={`border rounded-lg p-4 ${
                  result.passed ? 'bg-green-50 border-green-200' : getSeverityColor(result.rule.severity)
                }`}>
                  <div className="flex items-start space-x-3">
                    {result.passed ? 
                      <CheckCircle className="w-5 h-5 text-green-600" /> : 
                      getSeverityIcon(result.rule.severity)
                    }
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{result.rule.name}</div>
                      <div className="text-sm text-gray-600">
                        {result.passed ? 
                          'All records passed validation' : 
                          `${result.violations.length} violations found`
                        }
                      </div>
                      
                      {!result.passed && result.violations.length > 0 && (
                        <div className="mt-2 max-h-32 overflow-y-auto">
                          <div className="text-xs text-gray-600 font-medium mb-1">Sample violations:</div>
                          {result.violations.slice(0, 3).map((violation, vIndex) => (
                            <div key={vIndex} className="text-xs text-gray-600 bg-white bg-opacity-50 rounded p-1 mb-1">
                              Row {violation.row}: {violation.message}
                            </div>
                          ))}
                          {result.violations.length > 3 && (
                            <div className="text-xs text-gray-500">
                              ... and {result.violations.length - 3} more
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {validationResults.length > 0 && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h5 className="font-semibold text-blue-900 mb-2">Summary</h5>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Rules Passed:</span>
                  <span className="font-medium text-blue-900 ml-2">
                    {validationResults.filter(r => r.passed).length}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Rules Failed:</span>
                  <span className="font-medium text-blue-900 ml-2">
                    {validationResults.filter(r => !r.passed).length}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Total Violations:</span>
                  <span className="font-medium text-blue-900 ml-2">
                    {validationResults.reduce((sum, r) => sum + r.violations.length, 0)}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Success Rate:</span>
                  <span className="font-medium text-blue-900 ml-2">
                    {Math.round((validationResults.filter(r => r.passed).length / validationResults.length) * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rule Builder Modal */}
      {showRuleBuilder && (
        <RuleBuilder
          columns={columns}
          dataTypes={dataTypes}
          onSave={addRule}
          onCancel={() => setShowRuleBuilder(false)}
        />
      )}
    </div>
  );
};

interface RuleBuilderProps {
  columns: string[];
  dataTypes: Record<string, string>;
  onSave: (rule: ValidationRule) => void;
  onCancel: () => void;
}

const RuleBuilder: React.FC<RuleBuilderProps> = ({ columns, dataTypes, onSave, onCancel }) => {
  const [rule, setRule] = useState<Partial<ValidationRule>>({
    type: 'range',
    severity: 'error'
  });

  const handleSave = () => {
    if (!rule.name || !rule.field || !rule.message) return;

    const newRule: ValidationRule = {
      id: `rule_${Date.now()}`,
      name: rule.name,
      type: rule.type!,
      field: rule.field,
      condition: rule.condition || '',
      message: rule.message,
      severity: rule.severity!
    };

    onSave(newRule);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Add Validation Rule</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rule Name</label>
            <input
              type="text"
              value={rule.name || ''}
              onChange={(e) => setRule({...rule, name: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter rule name..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Field</label>
            <select
              value={rule.field || ''}
              onChange={(e) => setRule({...rule, field: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select field...</option>
              {columns.map(column => (
                <option key={column} value={column}>{column}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Rule Type</label>
            <select
              value={rule.type || 'range'}
              onChange={(e) => setRule({...rule, type: e.target.value as any})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="range">Range Check</option>
              <option value="format">Format Validation</option>
              <option value="required">Required Field</option>
              <option value="custom">Custom Condition</option>
            </select>
          </div>

          {rule.type !== 'required' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
              <input
                type="text"
                value={rule.condition || ''}
                onChange={(e) => setRule({...rule, condition: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={
                  rule.type === 'range' ? 'e.g., between 0 and 100' :
                  rule.type === 'format' ? 'e.g., email, phone, or regex pattern' :
                  'e.g., field1 > 0 AND field2 != null'
                }
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Error Message</label>
            <input
              type="text"
              value={rule.message || ''}
              onChange={(e) => setRule({...rule, message: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter error message..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
            <select
              value={rule.severity || 'error'}
              onChange={(e) => setRule({...rule, severity: e.target.value as any})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="error">Error</option>
              <option value="warning">Warning</option>
            </select>
          </div>
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={handleSave}
            disabled={!rule.name || !rule.field || !rule.message}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Rule
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};