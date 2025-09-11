import React, { useState } from 'react';
import { Database, Download, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { convertToCSV, downloadCSV, availableTables, hasSupabaseConfig } from '../utils/supabaseClient';

interface SupabaseImportProps {
  onDataImported: (data: any[], filename: string) => void;
}

export const SupabaseImport: React.FC<SupabaseImportProps> = ({ onDataImported }) => {
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleImportData = async () => {
    if (!hasSupabaseConfig) {
      setError('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }
    if (!selectedTable) {
      setError('Please select a table to import');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { fetchTableData } = await import('../utils/supabaseClient');
      const data = await fetchTableData(selectedTable);
      
      if (data.length === 0) {
        setError(`No data found in table: ${selectedTable}`);
        return;
      }

      // Convert to CSV and create a file-like object
      const csvContent = convertToCSV(data);
      const filename = `${selectedTable}_export.csv`;
      
      // Create a blob and simulate file upload
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const file = new File([blob], filename, { type: 'text/csv' });
      
      // Parse the CSV back to array format for the data analyzer
      const rows = csvContent.split('\n');
      const headers = rows[0].split(',');
      const parsedData = rows.slice(1).map(row => {
        const values = row.split(',');
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = values[index] || null;
        });
        return obj;
      });

      onDataImported(parsedData, filename);
      setSuccess(`Successfully imported ${data.length} records from ${selectedTable}`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import data from Supabase');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadCSV = async () => {
    if (!hasSupabaseConfig) {
      setError('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
      return;
    }
    if (!selectedTable) {
      setError('Please select a table to download');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { fetchTableData } = await import('../utils/supabaseClient');
      const data = await fetchTableData(selectedTable);
      
      if (data.length === 0) {
        setError(`No data found in table: ${selectedTable}`);
        return;
      }

      const csvContent = convertToCSV(data);
      const filename = `${selectedTable}_export.csv`;
      
      downloadCSV(csvContent, filename);
      setSuccess(`Downloaded ${data.length} records as ${filename}`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download data from Supabase');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-6 mb-6">
      <div className="flex items-center space-x-3 mb-4">
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 w-10 h-10 rounded-full flex items-center justify-center">
          <Database className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Import from Supabase</h3>
          <p className="text-sm text-gray-600">Fetch data directly from your Supabase database</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Table
          </label>
          <select
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isLoading}
          >
            <option value="">Choose a table...</option>
            {availableTables.map((table) => (
              <option key={table.name} value={table.name}>
                {table.label} - {table.description}
              </option>
            ))}
          </select>
        </div>

        {selectedTable && (
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <strong>Selected:</strong> {availableTables.find(t => t.name === selectedTable)?.label}
            </p>
            <p className="text-xs text-blue-600 mt-1">
              {availableTables.find(t => t.name === selectedTable)?.description}
            </p>
          </div>
        )}

        <div className="flex space-x-3">
          <button
            onClick={handleImportData}
            disabled={!selectedTable || isLoading}
            className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <Upload className="w-4 h-4" />
            <span>{isLoading ? 'Importing...' : 'Import & Analyze'}</span>
          </button>
          
          <button
            onClick={handleDownloadCSV}
            disabled={!selectedTable || isLoading}
            className="flex items-center justify-center space-x-2 bg-gray-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV</span>
          </button>
        </div>

        {error && (
          <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}
      </div>
    </div>
  );
};