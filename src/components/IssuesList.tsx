import React from 'react';
import { DataIssue } from '../types/data';
import { AlertTriangle, XCircle, Info, Zap } from 'lucide-react';

interface IssuesListProps {
  issues: DataIssue[];
}

export const IssuesList: React.FC<IssuesListProps> = ({ issues }) => {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <XCircle className="w-5 h-5 text-red-600" />;
      case 'medium': return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default: return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-50 border-red-200';
      case 'medium': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'missing': return '🔍';
      case 'duplicate': return '📋';
      case 'outlier': return '📊';
      case 'inconsistent': return '🔄';
      default: return '⚠️';
    }
  };

  const issuesByType = issues.reduce((acc, issue) => {
    acc[issue.type] = acc[issue.type] || [];
    acc[issue.type].push(issue);
    return acc;
  }, {} as Record<string, DataIssue[]>);

  const severityCounts = issues.reduce((acc, issue) => {
    acc[issue.severity] = (acc[issue.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="bg-gradient-to-r from-orange-500 to-red-600 w-12 h-12 rounded-full flex items-center justify-center">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-gray-900">Detected Issues</h3>
          <p className="text-gray-600">{issues.length} issues found across your dataset</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{severityCounts.high || 0}</div>
          <div className="text-sm text-red-700">High Priority</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-600">{severityCounts.medium || 0}</div>
          <div className="text-sm text-yellow-700">Medium Priority</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{severityCounts.low || 0}</div>
          <div className="text-sm text-blue-700">Low Priority</div>
        </div>
      </div>

      {issues.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">🎉</div>
          <h4 className="text-xl font-semibold text-gray-700 mb-2">No Issues Found!</h4>
          <p className="text-gray-500">Your dataset appears to be clean and ready for analysis.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(issuesByType).map(([type, typeIssues]) => (
            <div key={type} className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getTypeIcon(type)}</span>
                  <h4 className="font-semibold text-gray-900 capitalize">
                    {type} Issues ({typeIssues.length})
                  </h4>
                </div>
              </div>
              
              <div className="p-4 space-y-3">
                {typeIssues.map((issue, index) => (
                  <div key={index} className={`border rounded-lg p-4 ${getSeverityClass(issue.severity)}`}>
                    <div className="flex items-start space-x-3">
                      {getSeverityIcon(issue.severity)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-gray-900">{issue.column}</span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            issue.severity === 'high' ? 'bg-red-100 text-red-800' :
                            issue.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {issue.severity}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{issue.description}</p>
                        <p className="text-xs text-gray-600 italic">{issue.suggestion}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};