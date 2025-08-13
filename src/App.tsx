import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { DataPreview } from './components/DataPreview';
import { QualityDashboard } from './components/QualityDashboard';
import { IssuesList } from './components/IssuesList';
import { CleaningOptions } from './components/CleaningOptions';
import { CleaningResults } from './components/CleaningResults';
import { SchemaMapper } from './components/SchemaMapper';
import { WeightingModule } from './components/WeightingModule';
import { EstimationEngine } from './components/EstimationEngine';
import { ValidationDashboard } from './components/ValidationDashboard';
import { DataChat } from './components/DataChat';
import { DataParser } from './utils/dataParser';
import { DataProfiler } from './utils/dataProfiler';
import { DataCleaner } from './utils/dataCleaner';
import { SurveyEstimator } from './utils/surveyEstimator';
import { DataProfile, DataIssue, QualityMetrics, CleaningAction, CleaningOptions as CleaningOptionsType } from './types/data';
import { SurveySchema, ColumnMapping, WeightVariable, ValidationResult } from './types/survey';
import { Database, Sparkles } from 'lucide-react';

type AppState = 'upload' | 'schema' | 'analysis' | 'weighting' | 'validation' | 'cleaning' | 'estimation' | 'results' | 'chat';

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
  
  // Survey-specific states
  const [surveySchema, setSurveySchema] = useState<SurveySchema | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [weightVariable, setWeightVariable] = useState<WeightVariable | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [mappedData, setMappedData] = useState<any[]>([]);

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

  const handleSchemaUpload = (schema: SurveySchema) => {
    setSurveySchema(schema);
  };

  const handleMappingComplete = (mappings: ColumnMapping[]) => {
    setColumnMappings(mappings);
    if (surveySchema) {
      // Apply mappings to create mapped dataset
      const mapped = originalData.map(row => {
        const mappedRow: any = {};
        mappings.forEach(mapping => {
          mappedRow[mapping.targetField] = row[mapping.sourceColumn];
        });
        return mappedRow;
      });
      setMappedData(mapped);
    }
    setState('analysis');
  };

  const handleWeightApplied = (weight: WeightVariable) => {
    setWeightVariable(weight);
  };

  const handleValidationComplete = (results: ValidationResult[]) => {
    setValidationResults(results);
  };

  const handleCleanData = async (options: CleaningOptionsType) => {
    const dataToClean = mappedData.length > 0 ? mappedData : originalData;
    if (!dataToClean.length) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { cleanedData: cleaned, actions } = DataCleaner.cleanDataset(dataToClean, options);
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
    setMappedData([]);
    setProfile(null);
    setIssues([]);
    setMetrics(null);
    setCleaningActions([]);
    setSurveySchema(null);
    setColumnMappings([]);
    setWeightVariable(null);
    setValidationResults([]);
    setFileName('');
    setError(null);
    setState('upload');
  };

  const currentData = mappedData.length > 0 ? mappedData : originalData;
  const currentColumns = currentData.length > 0 ? Object.keys(currentData[0]) : [];

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

      case 'schema':
        return (
          <div className="max-w-7xl mx-auto">
            <SchemaMapper
              dataColumns={Object.keys(originalData[0] || {})}
              schema={surveySchema || undefined}
              onMappingComplete={handleMappingComplete}
              onSchemaUpload={handleSchemaUpload}
            />
          </div>
        );

      case 'analysis':
        return (
          <div className="max-w-7xl mx-auto space-y-8">
            {metrics && profile && <QualityDashboard metrics={metrics} profile={profile} />}
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <DataPreview data={currentData.slice(0, 100)} title={mappedData.length > 0 ? "Mapped Dataset" : "Original Dataset"} />
              <IssuesList issues={issues} />
            </div>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setState('weighting')}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Configure Weighting
              </button>
              <button
                onClick={() => setState('validation')}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Setup Validation
              </button>
              <button
                onClick={() => setState('cleaning')}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Clean Data
              </button>
              <button
                onClick={() => setState('estimation')}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Calculate Estimates
              </button>
              <button
                onClick={() => setState('chat')}
                className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                Chat with Data
              </button>
            </div>
            
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

      case 'weighting':
        return (
          <div className="max-w-7xl mx-auto space-y-8">
            <WeightingModule
              columns={currentColumns}
              data={currentData}
              onWeightApplied={handleWeightApplied}
            />
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setState('analysis')}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Back to Analysis
              </button>
              <button
                onClick={() => setState('estimation')}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Calculate Estimates
              </button>
            </div>
          </div>
        );

      case 'validation':
        return (
          <div className="max-w-7xl mx-auto space-y-8">
            <ValidationDashboard
              data={currentData}
              columns={currentColumns}
              dataTypes={profile?.dataTypes || {}}
              onValidationComplete={handleValidationComplete}
            />
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setState('analysis')}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Back to Analysis
              </button>
              <button
                onClick={() => setState('cleaning')}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Clean Data
              </button>
            </div>
          </div>
        );

      case 'cleaning':
        return (
          <div className="max-w-7xl mx-auto space-y-8">
            <CleaningOptions onCleanData={handleCleanData} isLoading={isLoading} />
            
            <div className="flex justify-center">
              <button
                onClick={() => setState('analysis')}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Back to Analysis
              </button>
            </div>
            
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

      case 'estimation':
        return (
          <div className="max-w-7xl mx-auto space-y-8">
            <EstimationEngine
              data={cleanedData.length > 0 ? cleanedData : currentData}
              columns={cleanedData.length > 0 ? Object.keys(cleanedData[0] || {}) : currentColumns}
              weightVariable={weightVariable || undefined}
            />
            
            <div className="flex justify-center">
              <button
                onClick={() => setState('analysis')}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Back to Analysis
              </button>
            </div>
          </div>
        );

      case 'results':
        return (
          <div className="max-w-7xl mx-auto space-y-8">
            <CleaningResults
              actions={cleaningActions}
              originalData={currentData}
              cleanedData={cleanedData}
              onExport={() => console.log('Export functionality')}
              onStartOver={handleStartOver}
            />
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <DataPreview data={currentData.slice(0, 100)} title="Original Dataset" />
              <DataPreview data={cleanedData.slice(0, 100)} title="Cleaned Dataset" />
            </div>
            
            <div className="flex justify-center">
              <button
                onClick={() => setState('estimation')}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Calculate Estimates
              </button>
            </div>
          </div>
        );

      case 'chat':
        return (
          <div className="max-w-7xl mx-auto space-y-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Chat with Your Data</h2>
              <p className="text-lg text-gray-600 mb-8">
                Ask questions about your dataset and get instant insights
              </p>
            </div>
            
            <DataChat 
              data={currentData} 
              columns={currentColumns} 
              profile={profile}
            />
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setState('analysis')}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Back to Analysis
              </button>
              <button
                onClick={() => setState('estimation')}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Calculate Estimates
              </button>
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
                    {mappedData.length > 0 && ` → ${mappedData.length.toLocaleString()} mapped`}
                  </div>
                </div>
              )}
              
              <div className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 py-2 rounded-lg">
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {state === 'upload' ? 'Ready' : 
                   state === 'schema' ? 'Mapping' :
                   state === 'analysis' ? 'Analyzing' :
                   state === 'weighting' ? 'Weighting' :
                   state === 'validation' ? 'Validating' :
                   state === 'cleaning' ? 'Cleaning' :
                   state === 'estimation' ? 'Estimating' :
                   state === 'results' ? 'Complete' :
                   state === 'chat' ? 'Chatting' : 'Processing'}
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
              Professional Survey Data Analysis Platform with Advanced Statistical Estimation
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;