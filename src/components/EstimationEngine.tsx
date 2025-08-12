import React, { useState, useEffect } from 'react';
import { SurveyEstimate, EstimationOptions, WeightVariable } from '../types/survey';
import { SurveyEstimator } from '../utils/surveyEstimator';
import { Calculator, TrendingUp, BarChart3, Download } from 'lucide-react';

interface EstimationEngineProps {
  data: any[];
  columns: string[];
  weightVariable?: WeightVariable;
}

export const EstimationEngine: React.FC<EstimationEngineProps> = ({
  data,
  columns,
  weightVariable
}) => {
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const [estimationType, setEstimationType] = useState<'mean' | 'proportion' | 'total'>('mean');
  const [categoryValue, setCategoryValue] = useState<string>('');
  const [options, setOptions] = useState<EstimationOptions>({
    weighted: !!weightVariable,
    confidenceLevel: 0.95,
    varianceMethod: 'taylor',
    finitePopulationCorrection: false
  });
  const [estimates, setEstimates] = useState<SurveyEstimate[]>([]);
  const [isCalculating, setIsCalculating] = useState(false);

  const numericColumns = columns.filter(col => {
    const sample = data.slice(0, 10).map(row => row[col]);
    return sample.some(val => !isNaN(parseFloat(val)));
  });

  const categoricalColumns = columns.filter(col => {
    const sample = data.slice(0, 100).map(row => row[col]);
    const unique = [...new Set(sample)].length;
    return unique < 20 && unique > 1; // Reasonable number of categories
  });

  const getUniqueValues = (column: string): string[] => {
    const values = [...new Set(data.map(row => row[column]))]
      .filter(val => val !== null && val !== undefined && val !== '')
      .slice(0, 10); // Limit to first 10 unique values
    return values.map(val => val.toString());
  };

  const calculateEstimates = async () => {
    if (selectedVariables.length === 0) return;

    setIsCalculating(true);
    const newEstimates: SurveyEstimate[] = [];

    try {
      for (const variable of selectedVariables) {
        if (estimationType === 'mean') {
          const estimate = SurveyEstimator.calculateWeightedMean(
            data,
            variable,
            weightVariable?.column,
            options
          );
          newEstimates.push(estimate);
        } else if (estimationType === 'total') {
          const estimate = SurveyEstimator.calculateWeightedTotal(
            data,
            variable,
            weightVariable?.column,
            options
          );
          newEstimates.push(estimate);
        } else if (estimationType === 'proportion' && categoryValue) {
          const estimate = SurveyEstimator.calculateWeightedProportion(
            data,
            variable,
            categoryValue,
            weightVariable?.column,
            options
          );
          newEstimates.push(estimate);
        }
      }
      setEstimates(newEstimates);
    } catch (error) {
      console.error('Error calculating estimates:', error);
      alert('Error calculating estimates. Please check your data and try again.');
    } finally {
      setIsCalculating(false);
    }
  };

  const exportEstimates = () => {
    const csvContent = [
      ['Variable', 'Estimate', 'Standard Error', 'Margin of Error', 'CI Lower', 'CI Upper', 'Sample Size', 'Design Effect'].join(','),
      ...estimates.map(est => [
        est.variable,
        est.estimate.toFixed(4),
        est.standardError.toFixed(4),
        est.marginOfError.toFixed(4),
        est.confidenceInterval[0].toFixed(4),
        est.confidenceInterval[1].toFixed(4),
        est.sampleSize,
        est.designEffect?.toFixed(3) || 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'survey_estimates.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-green-500 to-teal-600 w-12 h-12 rounded-full flex items-center justify-center">
            <Calculator className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900">Survey Estimation Engine</h3>
            <p className="text-gray-600">Calculate weighted estimates with confidence intervals</p>
          </div>
        </div>
        
        {estimates.length > 0 && (
          <button
            onClick={exportEstimates}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            <span>Export Results</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimation Type
            </label>
            <select
              value={estimationType}
              onChange={(e) => setEstimationType(e.target.value as any)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="mean">Weighted Mean</option>
              <option value="total">Weighted Total</option>
              <option value="proportion">Weighted Proportion</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Variables to Estimate
            </label>
            <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2">
              {(estimationType === 'proportion' ? categoricalColumns : numericColumns).map(column => (
                <label key={column} className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded">
                  <input
                    type="checkbox"
                    checked={selectedVariables.includes(column)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedVariables([...selectedVariables, column]);
                      } else {
                        setSelectedVariables(selectedVariables.filter(v => v !== column));
                      }
                    }}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-700">{column}</span>
                </label>
              ))}
            </div>
          </div>

          {estimationType === 'proportion' && selectedVariables.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category Value
              </label>
              <select
                value={categoryValue}
                onChange={(e) => setCategoryValue(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Select category...</option>
                {selectedVariables.length === 1 && getUniqueValues(selectedVariables[0]).map(value => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confidence Level
              </label>
              <select
                value={options.confidenceLevel}
                onChange={(e) => setOptions({...options, confidenceLevel: parseFloat(e.target.value)})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value={0.90}>90%</option>
                <option value={0.95}>95%</option>
                <option value={0.99}>99%</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Variance Method
              </label>
              <select
                value={options.varianceMethod}
                onChange={(e) => setOptions({...options, varianceMethod: e.target.value as any})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="taylor">Taylor Linearization</option>
                <option value="bootstrap">Bootstrap</option>
                <option value="jackknife">Jackknife</option>
              </select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="fpc"
              checked={options.finitePopulationCorrection}
              onChange={(e) => setOptions({...options, finitePopulationCorrection: e.target.checked})}
              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <label htmlFor="fpc" className="text-sm text-gray-700">
              Apply finite population correction
            </label>
          </div>

          {options.finitePopulationCorrection && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Population Size
              </label>
              <input
                type="number"
                value={options.populationSize || ''}
                onChange={(e) => setOptions({...options, populationSize: parseInt(e.target.value) || undefined})}
                placeholder="Enter population size..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          )}

          <button
            onClick={calculateEstimates}
            disabled={selectedVariables.length === 0 || isCalculating || (estimationType === 'proportion' && !categoryValue)}
            className="w-full bg-gradient-to-r from-green-500 to-teal-600 text-white py-3 px-6 rounded-lg font-medium hover:from-green-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isCalculating ? 'Calculating...' : 'Calculate Estimates'}
          </button>
        </div>

        <div className="space-y-4">
          {weightVariable && (
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold text-blue-900">Weighting Applied</h4>
              </div>
              <div className="text-sm text-blue-800">
                <p><strong>Weight Variable:</strong> {weightVariable.column}</p>
                <p><strong>Type:</strong> {weightVariable.type.replace('_', ' ')}</p>
                {weightVariable.description && (
                  <p><strong>Description:</strong> {weightVariable.description}</p>
                )}
              </div>
            </div>
          )}

          {estimates.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-4">
                <BarChart3 className="w-5 h-5 text-gray-600" />
                <h4 className="font-semibold text-gray-900">Estimation Results</h4>
              </div>
              
              <div className="space-y-4">
                {estimates.map((estimate, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-gray-900">{estimate.variable}</h5>
                      <span className="text-sm text-gray-500">n = {estimate.sampleSize}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Estimate:</span>
                        <span className="font-medium text-gray-900 ml-2">
                          {estimate.estimate.toFixed(4)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Std Error:</span>
                        <span className="font-medium text-gray-900 ml-2">
                          {estimate.standardError.toFixed(4)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Margin of Error:</span>
                        <span className="font-medium text-gray-900 ml-2">
                          ±{estimate.marginOfError.toFixed(4)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Design Effect:</span>
                        <span className="font-medium text-gray-900 ml-2">
                          {estimate.designEffect?.toFixed(3) || 'N/A'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-3 p-2 bg-green-50 rounded text-sm">
                      <span className="text-green-700">
                        {(options.confidenceLevel * 100)}% CI: [
                        {estimate.confidenceInterval[0].toFixed(4)}, 
                        {estimate.confidenceInterval[1].toFixed(4)}]
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {estimates.length === 0 && (
            <div className="bg-gray-50 rounded-lg p-8 text-center">
              <Calculator className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-700 mb-2">No Estimates Yet</h4>
              <p className="text-gray-500">
                Select variables and click "Calculate Estimates" to see results
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};