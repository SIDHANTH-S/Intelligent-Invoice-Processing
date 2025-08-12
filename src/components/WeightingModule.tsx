import React, { useState } from 'react';
import { WeightVariable } from '../types/survey';
import { Scale, TrendingUp, BarChart3, Settings } from 'lucide-react';

interface WeightingModuleProps {
  columns: string[];
  data: any[];
  onWeightApplied: (weightVariable: WeightVariable) => void;
}

export const WeightingModule: React.FC<WeightingModuleProps> = ({
  columns,
  data,
  onWeightApplied
}) => {
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [weightType, setWeightType] = useState<'design' | 'post_stratification' | 'raking'>('design');
  const [description, setDescription] = useState<string>('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleApplyWeight = () => {
    if (!selectedColumn) return;

    const weightVariable: WeightVariable = {
      column: selectedColumn,
      type: weightType,
      description: description || `${weightType} weight using ${selectedColumn}`
    };

    onWeightApplied(weightVariable);
  };

  const getWeightStats = (column: string) => {
    if (!column || !data.length) return null;

    const weights = data
      .map(row => parseFloat(row[column]))
      .filter(w => !isNaN(w) && w > 0);

    if (weights.length === 0) return null;

    const sum = weights.reduce((a, b) => a + b, 0);
    const mean = sum / weights.length;
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const variance = weights.reduce((acc, w) => acc + Math.pow(w - mean, 2), 0) / weights.length;
    const std = Math.sqrt(variance);

    return { mean, min, max, std, count: weights.length };
  };

  const stats = selectedColumn ? getWeightStats(selectedColumn) : null;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 w-12 h-12 rounded-full flex items-center justify-center">
          <Scale className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Survey Weighting</h3>
          <p className="text-gray-600">Apply design weights for accurate population estimates</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Weight Variable
            </label>
            <select
              value={selectedColumn}
              onChange={(e) => setSelectedColumn(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">Select weight column...</option>
              {columns
                .filter(col => {
                  // Only show numeric columns
                  const sample = data.slice(0, 10).map(row => row[col]);
                  return sample.some(val => !isNaN(parseFloat(val)));
                })
                .map(column => (
                  <option key={column} value={column}>{column}</option>
                ))
              }
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Weight Type
            </label>
            <select
              value={weightType}
              onChange={(e) => setWeightType(e.target.value as any)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="design">Design Weights</option>
              <option value="post_stratification">Post-Stratification Weights</option>
              <option value="raking">Raking Weights</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description of the weighting methodology..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              rows={3}
            />
          </div>

          <button
            onClick={handleApplyWeight}
            disabled={!selectedColumn}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            Apply Weights
          </button>
        </div>

        <div className="space-y-4">
          {stats && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <BarChart3 className="w-5 h-5 text-gray-600" />
                <h4 className="font-semibold text-gray-900">Weight Statistics</h4>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Mean:</span>
                  <span className="font-medium text-gray-900 ml-2">{stats.mean.toFixed(3)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Std Dev:</span>
                  <span className="font-medium text-gray-900 ml-2">{stats.std.toFixed(3)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Min:</span>
                  <span className="font-medium text-gray-900 ml-2">{stats.min.toFixed(3)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Max:</span>
                  <span className="font-medium text-gray-900 ml-2">{stats.max.toFixed(3)}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Valid Weights:</span>
                  <span className="font-medium text-gray-900 ml-2">{stats.count} / {data.length}</span>
                </div>
              </div>

              {stats.std / stats.mean > 0.5 && (
                <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  ⚠️ High weight variability detected. Consider reviewing weight distribution.
                </div>
              )}
            </div>
          )}

          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Weight Type Information</h4>
            <div className="text-sm text-blue-800">
              {weightType === 'design' && (
                <p>Design weights adjust for unequal selection probabilities in the sampling design.</p>
              )}
              {weightType === 'post_stratification' && (
                <p>Post-stratification weights adjust the sample to match known population totals.</p>
              )}
              {weightType === 'raking' && (
                <p>Raking weights iteratively adjust multiple variables to match population margins.</p>
              )}
            </div>
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-700"
          >
            <Settings className="w-4 h-4" />
            <span>{showAdvanced ? 'Hide' : 'Show'} Advanced Options</span>
          </button>

          {showAdvanced && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="normalize-weights"
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="normalize-weights" className="text-sm text-gray-700">
                  Normalize weights to sum to sample size
                </label>
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="trim-weights"
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="trim-weights" className="text-sm text-gray-700">
                  Trim extreme weights (top/bottom 1%)
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};