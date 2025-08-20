import { useMemo, useState } from 'react';
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
// import { SurveyEstimator } from './utils/surveyEstimator';
import { generateCleaningSummaryViaSonar } from './utils/sonar';
import { DataProfile, DataIssue, QualityMetrics, CleaningAction, CleaningOptions as CleaningOptionsType } from './types/data';
import { SurveySchema, ColumnMapping, WeightVariable, ValidationResult } from './types/survey';
import { Database, Sparkles, PlayCircle } from 'lucide-react';
import { GuidedDemo } from './components/GuidedDemo';

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
  // Cleaning history/versioning
  const [cleaningRuns, setCleaningRuns] = useState<Array<{ id: string; label: string; options: CleaningOptionsType; cleanedData: any[]; actions: CleaningAction[] }>>([]);
  const [currentRunIndex, setCurrentRunIndex] = useState<number>(-1);
  
  // Survey-specific states
  const [surveySchema, setSurveySchema] = useState<SurveySchema | null>(null);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [weightVariable, setWeightVariable] = useState<WeightVariable | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [mappedData, setMappedData] = useState<any[]>([]);
  const [lastEstimates, setLastEstimates] = useState<any[]>([]);
  const [aiSummary, setAiSummary] = useState<string | undefined>(undefined);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);

  // Guided demo state
  const [isDemoOpen, setIsDemoOpen] = useState(false);
  const [demoStep, setDemoStep] = useState(0);

  const demoSteps = useMemo(() => ([
    { key: 'upload', title: 'Upload', description: 'Start by uploading a CSV or Excel survey dataset. We automatically profile columns and detect issues.' },
    { key: 'analysis', title: 'Profile & Issues', description: 'Review summary stats and detected issues: missingness, duplicates, outliers, and text inconsistencies.' },
    { key: 'cleaning', title: 'Clean', description: 'Configure how to handle missing values, duplicates, and outliers. Then run cleaning.' },
    { key: 'weighting', title: 'Weight', description: 'Optionally apply survey weights for representative estimates.' },
    { key: 'estimation', title: 'Estimate', description: 'Compute weighted means, proportions, or totals with confidence intervals.' },
    { key: 'results', title: 'Report', description: 'Export cleaned data and view a plain-English summary you can paste into slides.' },
    { key: 'chat', title: 'Assistant', description: 'Use the AI assistant to ask questions or run commands like “impute median in Age”.' }
  ]), []);

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

      // Versioning: push new run
      const id = `run_${Date.now()}`;
      const label = new Date().toLocaleTimeString();
      const newRun = { id, label, options, cleanedData: cleaned, actions };
      const newHistory = [...cleaningRuns.slice(0, currentRunIndex + 1), newRun];
      setCleaningRuns(newHistory);
      setCurrentRunIndex(newHistory.length - 1);

      setState('results');

      // Kick off AI summary generation (non-blocking)
      setAiSummaryLoading(true);
      void (async () => {
        const summary = await generateCleaningSummaryViaSonar({
          profile: profile || undefined,
          metrics: metrics || undefined,
          actions,
          options,
          weightVariable,
          estimates: lastEstimates?.map((e: any) => ({ variable: e.variable, estimate: e.estimate, marginOfError: e.marginOfError })) || []
        });
        setAiSummary(summary);
        setAiSummaryLoading(false);
      })();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clean data');
    } finally {
      setIsLoading(false);
    }
  };

  const canUndo = currentRunIndex > 0;
  const canRedo = currentRunIndex >= 0 && currentRunIndex < cleaningRuns.length - 1;

  const undoCleaning = () => {
    if (!canUndo) return;
    const nextIndex = currentRunIndex - 1;
    setCurrentRunIndex(nextIndex);
    const run = cleaningRuns[nextIndex];
    setCleanedData(run.cleanedData);
    setCleaningActions(run.actions);
  };

  const redoCleaning = () => {
    if (!canRedo) return;
    const nextIndex = currentRunIndex + 1;
    setCurrentRunIndex(nextIndex);
    const run = cleaningRuns[nextIndex];
    setCleanedData(run.cleanedData);
    setCleaningActions(run.actions);
  };

  const selectCleaningVersion = (index: number) => {
    if (index < 0 || index >= cleaningRuns.length) return;
    setCurrentRunIndex(index);
    const run = cleaningRuns[index];
    setCleanedData(run.cleanedData);
    setCleaningActions(run.actions);
  };

  const generateCleaningSummary = (): string | undefined => {
    if (aiSummary) return aiSummary;
    if (!profile) return undefined;
    const totalCells = profile.rowCount * profile.columnCount;
    const missingPct = totalCells > 0 ? Math.round((profile.missingValues / totalCells) * 100) : 0;
    const dupPct = profile.rowCount > 0 ? Math.round((profile.duplicateRows / profile.rowCount) * 100) : 0;
    // Rough outlier count from actions
    const outlierCount = cleaningActions
      .filter(a => a.description.toLowerCase().includes('outlier'))
      .map(a => {
        const m = a.description.match(/(\d+)/);
        return m ? parseInt(m[1]) : 0;
      })
      .reduce((s, v) => s + v, 0);
    const outlierPct = profile.rowCount > 0 ? Math.round((outlierCount / profile.rowCount) * 100) : 0;

    const missingMethod = cleaningRuns[currentRunIndex]?.options.handleMissing || 'median';
    // const dupMethod = cleaningRuns[currentRunIndex]?.options.handleDuplicates || 'remove_first';
    const outlierMethod = cleaningRuns[currentRunIndex]?.options.handleOutliers || 'cap';

    const imputePhrase = missingMethod === 'remove' ? 'removed' : `imputed by ${missingMethod.replace('_', ' ')}`;
    // const dupPhrase = dupMethod ? 'removed' : 'kept';
    const outlierPhrase = outlierMethod === 'cap' ? 'winsorized' : outlierMethod === 'remove' ? 'removed' : 'kept';

    const est = lastEstimates && lastEstimates.length > 0 ? lastEstimates[0] : undefined;
    const estText = est ? ` Weighted ${est.variable} was ${est.estimate.toFixed(2)} ± ${est.marginOfError.toFixed(2)}.` : '';

    return `Your dataset had ${missingPct}% missing values (${imputePhrase}), ${dupPct}% duplicates (removed), and ${outlierPct}% extreme outliers (${outlierPhrase}).${estText}`;
  };

  const handleStartOver = () => {
    setOriginalData([]);
    setCleanedData([]);
    setMappedData([]);
    setProfile(null);
    setIssues([]);
    setMetrics(null);
    setCleaningActions([]);
    setCleaningRuns([]);
    setCurrentRunIndex(-1);
    setSurveySchema(null);
    setColumnMappings([]);
    setWeightVariable(null);
    setValidationResults([]);
    setLastEstimates([]);
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
              <button
                onClick={() => { setIsDemoOpen(true); setDemoStep(0); setState('upload'); }}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Guided Demo
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
              onEstimatesComputed={(estimates) => {
                setLastEstimates(estimates);
                // Refresh AI summary with estimates included
                setAiSummaryLoading(true);
                void (async () => {
                  const summary = await generateCleaningSummaryViaSonar({
                    profile: profile || undefined,
                    metrics: metrics || undefined,
                    actions: cleaningActions,
                    options: cleaningRuns[currentRunIndex]?.options,
                    weightVariable,
                    estimates: estimates.map(e => ({ variable: e.variable, estimate: e.estimate, marginOfError: e.marginOfError }))
                  });
                  setAiSummary(summary);
                  setAiSummaryLoading(false);
                })();
              }}
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
              summaryText={generateCleaningSummary()}
              summaryLoading={aiSummaryLoading}
              history={cleaningRuns.map((r, i) => ({ id: r.id, label: `Run ${i + 1} • ${r.label}` }))}
              currentIndex={currentRunIndex}
              onSelectVersion={selectCleaningVersion}
              onUndo={canUndo ? undoCleaning : undefined}
              onRedo={canRedo ? redoCleaning : undefined}
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
              canExecuteCommands={true}
              onExecuteCommand={async (command) => {
                // Map basic commands to cleaning runs for demo
                const baseOptions: CleaningOptionsType = {
                  handleMissing: 'median',
                  handleDuplicates: 'remove_first',
                  handleOutliers: 'cap',
                  standardizeText: true,
                  validateFormats: true
                };
                if (command.type === 'clean_impute') {
                  const method = (command.params?.method as any) || 'median';
                  await handleCleanData({ ...baseOptions, handleMissing: method });
                  return `Imputation run started with method: ${method}. Check the Results tab for details.`;
                }
                if (command.type === 'clean_duplicates') {
                  await handleCleanData({ ...baseOptions, handleDuplicates: 'remove_first' });
                  return 'Removed duplicate rows (kept last occurrence). See Results tab.';
                }
                if (command.type === 'clean_outliers') {
                  await handleCleanData({ ...baseOptions, handleOutliers: 'cap' });
                  return 'Outliers handled via winsorization (IQR caps). See Results tab.';
                }
                if (command.type === 'clean_all') {
                  await handleCleanData(baseOptions);
                  return 'Full cleaning pipeline executed with default settings. See Results tab.';
                }
              }}
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
              <button
                onClick={() => { setIsDemoOpen(true); setDemoStep(0); }}
                className="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              >
                <PlayCircle className="w-4 h-4" />
                <span className="text-sm">Demo</span>
              </button>
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
      <GuidedDemo
        isOpen={isDemoOpen}
        currentStep={demoStep}
        steps={demoSteps}
        onClose={() => setIsDemoOpen(false)}
        onNext={() => {
          const next = Math.min(demoStep + 1, demoSteps.length - 1);
          setDemoStep(next);
          const key = demoSteps[next].key as AppState;
          setState(key);
        }}
      />
    </div>
  );
}

export default App;