import React, { useState } from 'react';
import { CleaningAction } from '../types/data';
import { CheckCircle, Download, BarChart3, RefreshCw } from 'lucide-react';
import Papa from 'papaparse';

interface CleaningResultsProps {
  actions: CleaningAction[];
  originalData: any[];
  cleanedData: any[];
  onExport: () => void;
  onStartOver: () => void;
  summaryText?: string;
  summaryLoading?: boolean;
  history?: Array<{ id: string; label: string }>;
  currentIndex?: number;
  onSelectVersion?: (index: number) => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const CleaningResults: React.FC<CleaningResultsProps> = ({ 
  actions, 
  originalData, 
  cleanedData, 
  onExport,
  onStartOver,
  summaryText,
  summaryLoading,
  history,
  currentIndex,
  onSelectVersion,
  onUndo,
  onRedo
}) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'actions'>('summary');

  const downloadCSV = () => {
    const csv = Papa.unparse(cleanedData);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cleaned_dataset.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const actionsByType = actions.reduce((acc, action) => {
    acc[action.type] = acc[action.type] || [];
    acc[action.type].push(action);
    return acc;
  }, {} as Record<string, CleaningAction[]>);

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'remove': return '🗑️';
      case 'impute': return '🔧';
      case 'standardize': return '📐';
      case 'correct': return '✏️';
      default: return '🔄';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-8 h-8 text-white" />
            <div>
              <h3 className="text-2xl font-bold text-white">Data Cleaning Complete</h3>
              <p className="text-green-100">{actions.length} cleaning actions performed</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {history && history.length > 0 && (
              <div className="hidden md:flex items-center space-x-2 bg-white bg-opacity-20 px-3 py-2 rounded-lg">
                <button onClick={onUndo} className="text-white/90 hover:text-white">⟲</button>
                <select
                  value={currentIndex ?? 0}
                  onChange={(e) => onSelectVersion && onSelectVersion(parseInt(e.target.value))}
                  className="bg-transparent text-white text-sm focus:outline-none"
                >
                  {history.map((h, i) => (
                    <option key={h.id} value={i}>{h.label}</option>
                  ))}
                </select>
                <button onClick={onRedo} className="text-white/90 hover:text-white">⟳</button>
              </div>
            )}
            <button
              onClick={downloadCSV}
              className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition-colors text-white"
            >
              <Download className="w-4 h-4" />
              <span>Download CSV</span>
            </button>
            <button
              onClick={onStartOver}
              className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition-colors text-white"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Start Over</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab('summary')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'summary'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Summary</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'actions'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4" />
              <span>Actions ({actions.length})</span>
            </div>
          </button>
        </nav>
      </div>

      <div className="p-6">
        {summaryLoading ? (
          <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 text-emerald-900 text-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-600 animate-pulse"></span>
              Generating summary...
            </div>
          </div>
        ) : summaryText ? (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-lg p-4">
            <div className="text-sm">{summaryText}</div>
          </div>
        ) : null}
        {activeTab === 'summary' ? (
          <div className="space-y-6">
            {/* Before/After Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-red-50 rounded-lg p-4">
                <h4 className="font-semibold text-red-900 mb-3">Before Cleaning</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-red-700">Rows:</span>
                    <span className="font-medium text-red-900">{originalData.length.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-red-700">Columns:</span>
                    <span className="font-medium text-red-900">{Object.keys(originalData[0] || {}).length}</span>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-semibold text-green-900 mb-3">After Cleaning</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-700">Rows:</span>
                    <span className="font-medium text-green-900">{cleanedData.length.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Columns:</span>
                    <span className="font-medium text-green-900">{Object.keys(cleanedData[0] || {}).length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Summary */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-3">Actions Performed</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(actionsByType).map(([type, typeActions]) => (
                  <div key={type} className="text-center">
                    <div className="text-2xl mb-1">{getActionIcon(type)}</div>
                    <div className="text-lg font-bold text-blue-900">{typeActions.length}</div>
                    <div className="text-xs text-blue-700 capitalize">{type}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Impact Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {originalData.length - cleanedData.length}
                </div>
                <div className="text-sm text-gray-600">Rows Removed</div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {Math.round(((cleanedData.length / originalData.length) * 100))}%
                </div>
                <div className="text-sm text-gray-600">Data Retained</div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {actions.length}
                </div>
                <div className="text-sm text-gray-600">Total Actions</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {actions.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🔧</div>
                <h4 className="text-lg font-semibold text-gray-700">No Actions Performed</h4>
                <p className="text-gray-500">Your data was already clean!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {actions.map((action, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">{getActionIcon(action.type)}</span>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-gray-900">{action.column}</span>
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full capitalize">
                            {action.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{action.description}</p>
                        {action.originalValue !== action.newValue && (
                          <div className="mt-2 text-xs">
                            <span className="text-gray-500">
                              {action.originalValue} → {action.newValue}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};