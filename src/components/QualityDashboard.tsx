import React from 'react';
import { QualityMetrics, DataProfile } from '../types/data';
import { CheckCircle, AlertTriangle, XCircle, TrendingUp } from 'lucide-react';

interface QualityDashboardProps {
  metrics: QualityMetrics;
  profile: DataProfile;
}

export const QualityDashboard: React.FC<QualityDashboardProps> = ({ metrics, profile }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="w-5 h-5" />;
    if (score >= 60) return <AlertTriangle className="w-5 h-5" />;
    return <XCircle className="w-5 h-5" />;
  };

  const qualityMetrics = [
    { label: 'Overall Score', value: metrics.overallScore, icon: TrendingUp },
    { label: 'Completeness', value: metrics.completeness, icon: CheckCircle },
    { label: 'Validity', value: metrics.validity, icon: CheckCircle },
    { label: 'Consistency', value: metrics.consistency, icon: CheckCircle },
    { label: 'Uniqueness', value: metrics.uniqueness, icon: CheckCircle }
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 w-12 h-12 rounded-full flex items-center justify-center">
          <TrendingUp className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-2xl font-bold text-gray-900">Data Quality Assessment</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        {qualityMetrics.map((metric, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">{metric.label}</span>
              <div className={`p-1.5 rounded-full ${getScoreColor(metric.value)}`}>
                {getScoreIcon(metric.value)}
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">{metric.value}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${
                  metric.value >= 80 ? 'bg-green-500' : metric.value >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${metric.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="font-semibold text-blue-900 mb-2">Dataset Overview</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-blue-700">Total Rows:</span>
              <span className="font-medium text-blue-900">{profile.rowCount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Total Columns:</span>
              <span className="font-medium text-blue-900">{profile.columnCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-blue-700">Data Points:</span>
              <span className="font-medium text-blue-900">{(profile.rowCount * profile.columnCount).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4">
          <h4 className="font-semibold text-yellow-900 mb-2">Quality Issues</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-yellow-700">Missing Values:</span>
              <span className="font-medium text-yellow-900">{profile.missingValues.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-yellow-700">Duplicate Rows:</span>
              <span className="font-medium text-yellow-900">{profile.duplicateRows.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-yellow-700">Completeness:</span>
              <span className="font-medium text-yellow-900">
                {((1 - profile.missingValues / (profile.rowCount * profile.columnCount)) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-green-50 rounded-lg p-4">
          <h4 className="font-semibold text-green-900 mb-2">Data Types</h4>
          <div className="space-y-2 text-sm">
            {Object.entries(
              Object.values(profile.dataTypes).reduce((acc, type) => {
                acc[type] = (acc[type] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([type, count]) => (
              <div key={type} className="flex justify-between">
                <span className="text-green-700 capitalize">{type}:</span>
                <span className="font-medium text-green-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};