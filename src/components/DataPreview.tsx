import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, BarChart3 } from 'lucide-react';

interface DataPreviewProps {
  data: any[];
  title: string;
}

export const DataPreview: React.FC<DataPreviewProps> = ({ data, title }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const rowsPerPage = 10;
  const totalPages = Math.ceil(data.length / rowsPerPage);

  const paginatedData = data.slice(
    currentPage * rowsPerPage,
    (currentPage + 1) * rowsPerPage
  );

  const columns = data.length > 0 ? Object.keys(data[0]) : [];

  const getColumnStats = (columnName: string) => {
    const values = data.map(row => row[columnName]).filter(v => v !== null && v !== undefined && v !== '');
    const uniqueValues = [...new Set(values)];
    const nullCount = data.length - values.length;
    
    return {
      total: data.length,
      nonNull: values.length,
      unique: uniqueValues.length,
      nullPercentage: ((nullCount / data.length) * 100).toFixed(1)
    };
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Eye className="w-6 h-6 text-white" />
            <h3 className="text-xl font-bold text-white">{title}</h3>
            <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm text-white">
              {data.length} rows × {columns.length} columns
            </span>
          </div>
          <button
            onClick={() => setShowStats(!showStats)}
            className="flex items-center space-x-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition-colors text-white"
          >
            <BarChart3 className="w-4 h-4" />
            <span>{showStats ? 'Hide Stats' : 'Show Stats'}</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column, index) => (
                <th key={index} className="px-4 py-3 text-left text-sm font-semibold text-gray-700 border-b">
                  <div className="flex flex-col">
                    <span className="truncate max-w-32" title={column}>{column}</span>
                    {showStats && (
                      <div className="text-xs text-gray-500 mt-1">
                        {(() => {
                          const stats = getColumnStats(column);
                          return `${stats.nonNull}/${stats.total} (${stats.nullPercentage}% null)`;
                        })()}
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50 transition-colors">
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className="px-4 py-3 text-sm text-gray-900 border-b max-w-48">
                    <div className="truncate" title={row[column]?.toString()}>
                      {row[column] === null || row[column] === undefined || row[column] === '' 
                        ? <span className="text-gray-400 italic">null</span>
                        : row[column]?.toString()
                      }
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
          <div className="text-sm text-gray-600">
            Showing {currentPage * rowsPerPage + 1} to {Math.min((currentPage + 1) * rowsPerPage, data.length)} of {data.length} rows
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </button>
            
            <span className="px-3 py-2 text-sm text-gray-700">
              Page {currentPage + 1} of {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage === totalPages - 1}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};