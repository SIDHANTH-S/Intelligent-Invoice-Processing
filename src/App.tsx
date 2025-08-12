import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { DataPreview } from './components/DataPreview';
import { QualityDashboard } from './components/QualityDashboard';
import { IssuesList } from './components/IssuesList';
import { CleaningOptions } from './components/CleaningOptions';
import { CleaningResults } from './components/CleaningResults';
import { DataParser } from './utils/dataParser';
import { DataProfiler } from './utils/dataProfiler';
import { DataCleaner } from './utils/dataCleaner';
import { DataProfile, DataIssue, QualityMetrics, CleaningAction, CleaningOptions as CleaningOptionsType } from './types/data';
import { Database, Sparkles } from 'lucide-react';

type AppState = 'upload' | 'analysis' | 'cleaning' | 'results';

function App() {
  const [state, setState] = useState<AppState>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Data states
  const [originalData, setOriginalData] = useState<any[]>([]);
  const [cleanedData, setCleanedData] = useState<any[]>([]);
  const [profile, setProfile] = useState<DataProfile | null>(null);
  const [issues, setIssues] = useState<DataIssue[]>([]);
  const [metrics, setMetrics] = useState<QualityMetrics | null>(null);
  const [cleaningActions, setCleaningActions] = useState<CleaningAction[]>([]);
  const [fileName, setFileName] = useState<string>('');

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setFileName(file.name);
    
    try {
      const data = await DataParser.parseFile(file);
      
      if (data.length === 0) {
        throw new Error('The uploaded file appears to be empty');
      }

      setOriginalData(data);
      
      // Profile the data
      const dataProfile = DataProfiler.profileDataset(data);
      setProfile(dataProfile);
      
      // Detect issues
      const detectedIssues = DataProfiler.detectIssues(data, dataProfile);
      setIssues(detectedIssues);
      
      // Calculate quality metrics
      const qualityMetrics = DataProfiler.calculateQualityMetrics(data, dataProfile);
      setMetrics(qualityMetrics);
      
      setState('analysis');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCleanData = async (options: CleaningOptionsType) => {
    if (!originalData.length) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { cleanedData: cleaned, actions } = DataCleaner.cleanDataset(originalData, options);
      setCleanedData(cleaned);
      setCleaningActions(actions);
      setState('results');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clean data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartOver = () => {
    setOriginalData([]);
    setCleanedData([]);
    setProfile(null);
    setIssues([]);
    setMetrics(null);
    setCleaningActions([]);
    setFileName('');
    setError(null);
    setState('upload');
  };

  const renderContent = () => {
    switch (state) {
      case 'upload':
        return (
          <div className="max-w-4xl mx-auto">
            <FileUpload onFileUpload={handleFileUpload} isLoading={isLoading} />
            {error && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="text-red-600 font-medium">Error:</div>
                  <div className="text-red-700">{error}</div>
                </div>
              </div>
            )}
          </div>
        );

      case 'analysis':
        return (
          <div className="max-w-7xl mx-auto space-y-8">
            {metrics && profile && <QualityDashboard metrics={metrics} profile={profile} />}
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <DataPreview data={originalData.slice(0, 100)} title="Original Dataset" />
              <IssuesList issues={issues} />
            </div>
            
            <CleaningOptions onCleanData={handleCleanData} isLoading={isLoading} />
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="text-red-600 font-medium">Error:</div>
                  <div className="text-red-700">{error}</div>
                </div>
              </div>
            )}
          </div>
        );

      case 'results':
        return (
          <div className="max-w-7xl mx-auto space-y-8">
            <CleaningResults
              actions={cleaningActions}
              originalData={originalData}
              cleanedData={cleanedData}
              onExport={() => console.log('Export functionality')}
              onStartOver={handleStartOver}
            />
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <DataPreview data={originalData.slice(0, 100)} title="Original Dataset" />
              <DataPreview data={cleanedData.slice(0, 100)} title="Cleaned Dataset" />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 w-12 h-12 rounded-xl flex items-center justify-center">
                <Database className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Data Quality Analyzer</h1>
                <p className="text-sm text-gray-600">Automated data cleaning and quality assessment</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {fileName && (
                <div className="bg-blue-50 px-4 py-2 rounded-lg">
                  <div className="text-sm font-medium text-blue-900">{fileName}</div>
                  <div className="text-xs text-blue-700">
                    {originalData.length.toLocaleString()} rows
                  </div>
                </div>
              )}
              
              <div className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 py-2 rounded-lg">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {state === 'upload' ? 'Ready' : 
                   state === 'analysis' ? 'Analyzing' :
                   state === 'results' ? 'Complete' : 'Processing'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8 px-6">
        {renderContent()}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="text-center">
            <p className="text-sm text-gray-500">
              Built with advanced data profiling and automated cleaning algorithms
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;