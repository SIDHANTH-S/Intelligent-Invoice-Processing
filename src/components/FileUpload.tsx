import React, { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { SupabaseImport } from './SupabaseImport';

interface FileUploadProps {
  onFileUpload: (file: File) => void;
  onDataImported?: (data: any[], filename: string) => void;
  isLoading: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, onDataImported, isLoading }) => {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      onFileUpload(files[0]);
    }
  }, [onFileUpload]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  const handleSupabaseImport = (data: any[], filename: string) => {
    if (onDataImported) {
      onDataImported(data, filename);
    }
  };

  return (
    <div className="space-y-6">
      {/* Supabase Import Section */}
      {onDataImported && (
        <SupabaseImport onDataImported={handleSupabaseImport} />
      )}
      
      {/* File Upload Section */}
      <div className="bg-white rounded-xl shadow-lg p-8">
      <div className="text-center mb-6">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Dataset</h2>
        <p className="text-gray-600">
          Upload CSV, XLSX, or XLS files to analyze and clean your data
        </p>
      </div>

      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200
          ${dragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }
          ${isLoading ? 'opacity-50 pointer-events-none' : ''}
        `}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
      >
        <Upload className={`w-12 h-12 mx-auto mb-4 ${dragOver ? 'text-blue-500' : 'text-gray-400'}`} />
        
        <div className="mb-4">
          <p className="text-lg font-medium text-gray-700 mb-2">
            {isLoading ? 'Processing...' : 'Drop your file here or click to browse'}
          </p>
          <p className="text-sm text-gray-500">
            Supported formats: CSV, XLSX, XLS (Max 50MB)
          </p>
        </div>

        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          disabled={isLoading}
          className="hidden"
          id="file-upload"
        />
        
        <label
          htmlFor="file-upload"
          className={`
            inline-flex items-center px-6 py-3 rounded-lg font-medium transition-colors cursor-pointer
            ${isLoading 
              ? 'bg-gray-300 text-gray-500' 
              : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
            }
          `}
        >
          <Upload className="w-5 h-5 mr-2" />
          Choose File
        </label>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Data Processing Information</p>
          <p>
            Your data will be analyzed for quality issues including missing values, duplicates, 
            outliers, and formatting inconsistencies. No data is stored on our servers.
          </p>
        </div>
      </div>
      </div>
    </div>
    </div>
  );
};