# Data Quality Analyzer and Cleaner

A comprehensive survey data analysis platform with advanced statistical estimation, AI-powered data exploration, schema mapping, weighting, validation, and professional reporting capabilities.

## Features

### 🔄 **Data Processing Pipeline**
- **Multi-Format Upload**: CSV, XLSX, XLS support with drag-and-drop interface (up to 50MB)
- **File Validation**: Size limits, format checking, comprehensive error handling
- **Progress Tracking**: Real-time upload and processing progress indicators
- **Error Recovery**: Graceful error handling with detailed user feedback

### 🔍 **Advanced Data Profiling & Analysis**
- **Column Profiling**: Data types, completeness, uniqueness, statistical summaries
- **Missing Value Analysis**: Pattern detection with severity assessment
- **Duplicate Detection**: Exact and near-duplicate identification
- **Outlier Detection**: IQR and Z-score statistical methods
- **Data Type Inference**: Automatic type detection with confidence scoring
- **Correlation Analysis**: Variable correlation detection and reporting
- **Quality Metrics**: Overall score, completeness, validity, consistency, uniqueness

### 🧹 **Intelligent Data Cleaning Engine**
- **Missing Value Imputation**: Mean, median, mode, forward/backward fill strategies
- **Duplicate Removal**: Configurable logic (keep first/last, remove all)
- **Outlier Treatment**: Capping, removal, winsorization options
- **Text Standardization**: Whitespace, case, format normalization
- **Data Type Conversion**: Automatic type conversion with validation
- **Configurable Rules**: User-defined cleaning parameters
- **Batch Processing**: Non-blocking cleaning operations

### 🗺️ **Schema Mapping System**
- **Visual Mapping Interface**: Drag-and-drop column mapping with react-beautiful-dnd
- **Intelligent Suggestions**: Auto-mapping with confidence scores using similarity algorithms
- **JSON Schema Support**: Import/export schema configurations
- **Sample Schema Generation**: Pre-built schema examples and templates
- **Mapping Validation**: Conflict detection and resolution
- **Field Transformation**: Type conversion and data transformation during mapping

### ⚖️ **Survey Weighting Module**
- **Design Weights**: Unequal selection probability adjustment
- **Post-Stratification**: Population alignment weighting
- **Raking Weights**: Multi-variable margin adjustment with iterative algorithms
- **Weight Statistics**: Distribution analysis, validation, and quality checks
- **Weight Validation**: Variability warnings and recommendations
- **Normalization Options**: Weight scaling, trimming, and advanced configuration

### 📊 **Professional Statistical Estimation Engine**
- **Weighted Calculations**: Means, totals, proportions with proper survey methodology
- **Confidence Intervals**: 90%, 95%, 99% confidence levels with proper statistical theory
- **Margin of Error**: Accurate MoE computation for survey estimates
- **Design Effect**: Complex design impact assessment and reporting
- **Variance Estimation**: Taylor linearization, Bootstrap, Jackknife methods
- **Finite Population Correction**: Population size adjustment for accuracy
- **Effective Sample Size**: Proper sample size calculations accounting for design effects

### ✅ **Advanced Validation & Quality Control**
- **Rule-Based Validation**: Flexible validation rule system with custom rule builder
- **Skip Pattern Validation**: Survey logic validation (e.g., "If Q1=No, Q2 should be blank")
- **Range Checks**: Numeric and date range validation with flexible conditions
- **Format Validation**: Email, phone, custom regex pattern validation
- **Custom Rule Builder**: Visual interface for non-technical users
- **Violation Reporting**: Comprehensive validation results with severity classification
- **Auto-Generated Rules**: Common validation rules based on data types

### 🤖 **AI Integration (Perplexity Sonar API)**
- **Natural Language Queries**: Ask questions about dataset characteristics
- **Full Dataset Context**: Complete data sent to AI for comprehensive analysis
- **Interactive Chat Interface**: Conversational data exploration with message history
- **Statistical Explanations**: AI explains calculations and methodologies
- **Data Recommendations**: Intelligent cleaning and analysis suggestions
- **Error Handling**: Robust API management with fallbacks
- **Model Selection**: Configurable Sonar vs Sonar-Pro model options

### 📈 **Comprehensive Visualization & Reporting**
- **Quality Dashboard**: Real-time quality metrics with interactive gauges
- **Before/After Comparison**: Side-by-side data comparison tables
- **Interactive Data Tables**: Sortable, filterable data display with pagination
- **Statistical Charts**: Distribution and summary charts using Recharts
- **Progress Indicators**: Real-time operation progress with loading states
- **Export Functionality**: CSV, PDF, HTML export options
- **Cleaning Action Logs**: Detailed operation history with timestamps
- **Audit Trails**: Complete workflow documentation

### 🎨 **Professional User Interface & Experience**
- **Responsive Design**: Mobile-friendly responsive layout with Tailwind CSS
- **Modern UI Components**: Professional, intuitive interface with micro-interactions
- **Drag-and-Drop Interface**: Interactive element manipulation
- **Real-time Feedback**: Immediate user feedback and status updates
- **Loading States**: Clear operation status indicators
- **Error Messages**: Helpful error communication and recovery suggestions
- **Accessibility Features**: ARIA attributes and screen reader compatibility
- **Keyboard Navigation**: Full keyboard accessibility support

## Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### API Configuration (for Chat Feature)

To use the AI chat assistant, you need to configure the Perplexity API:

1. Get your API key from [Perplexity AI](https://www.perplexity.ai/)
2. Create a `.env` file in the root directory:
   ```bash
   VITE_PPLX_API_KEY=pplx-your_actual_api_key_here
   VITE_PPLX_MODEL=sonar  # or 'sonar-pro' for deeper reasoning
   ```

### Running the Application
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Usage

### **Complete Workflow**

1. **Upload Data**: 
   - Drag-and-drop or browse for CSV, XLSX, XLS files (up to 50MB)
   - Automatic file validation and progress tracking
   - Real-time error handling and recovery

2. **Data Analysis**: 
   - Automatic data profiling with quality metrics
   - Issue detection (missing values, duplicates, outliers, inconsistencies)
   - Interactive quality dashboard with detailed statistics

3. **Schema Mapping** (Optional):
   - Upload JSON schema or use sample templates
   - Drag-and-drop column mapping with intelligent suggestions
   - Confidence scoring and mapping validation

4. **Survey Weighting** (Optional):
   - Select weight variable and type (design, post-stratification, raking)
   - Weight statistics analysis and validation
   - Advanced normalization and trimming options

5. **Data Validation**:
   - Rule-based validation with custom rule builder
   - Skip pattern validation for survey logic
   - Range checks and format validation

6. **Data Cleaning**:
   - Configure cleaning options (missing values, duplicates, outliers)
   - Apply cleaning rules with detailed action logging
   - Before/after comparison and impact analysis

7. **AI Data Exploration**:
   - Natural language queries about your dataset
   - Full dataset context for comprehensive analysis
   - Interactive chat interface with conversation history

8. **Statistical Estimation**:
   - Calculate weighted/unweighted means, totals, proportions
   - Generate confidence intervals and margin of error
   - Professional survey methodology with design effects

9. **Reporting & Export**:
   - Comprehensive cleaning reports with audit trails
   - Export cleaned data (CSV) and statistical results
   - Professional documentation and workflow logs

## Technology Stack

### **Core Framework & Build Tools**
- **React 18.3.1**: Modern React with concurrent features and hooks
- **TypeScript 5.5.3**: Complete type safety across entire codebase
- **Vite 5.4.2**: Fast build tool with optimized development and production builds
- **Tailwind CSS 3.4.1**: Utility-first CSS framework with custom design system

### **Data Processing Libraries**
- **Papa Parse 5.5.3**: CSV parsing with streaming and error handling
- **XLSX 0.18.5**: Excel file processing (.xlsx, .xls) with multiple sheet support
- **Lodash 4.17.21**: Utility functions for data manipulation and analysis
- **D3 7.9.0**: Statistical calculations and data analysis algorithms

### **UI Components & Interactions**
- **Lucide React 0.344.0**: Modern icon library with 50+ icons
- **React Beautiful DnD 13.1.1**: Drag-and-drop functionality for schema mapping
- **Recharts 3.1.2**: Data visualization and charting library
- **HTML2Canvas 1.4.1 & jsPDF 3.0.1**: Report generation and export capabilities

### **Custom Processing Engines**
- **DataParser**: Multi-format file parsing (CSV, Excel) with error handling
- **DataProfiler**: Statistical analysis, profiling, and quality assessment
- **DataCleaner**: Automated cleaning algorithms with configurable rules
- **SchemaMapper**: Intelligent column mapping with similarity algorithms
- **SurveyEstimator**: Professional statistical estimation with variance methods
- **SurveyValidator**: Rule-based validation engine with skip pattern support

### **Development & Quality Tools**
- **ESLint 9.9.1**: Code quality and consistency enforcement
- **TypeScript ESLint 8.3.0**: TypeScript-specific linting rules
- **PostCSS 8.4.35 & Autoprefixer 10.4.18**: CSS processing and vendor prefixing

## Architecture

### **Frontend-First Design**
- **Client-Side Processing**: All data processing happens in the browser for privacy
- **No Server Dependencies**: Eliminates data privacy concerns and infrastructure costs
- **Real-Time Processing**: Immediate feedback without server round-trips
- **Modular Architecture**: Component-based design with clear separation of concerns

### **Performance Characteristics**
- **Dataset Scalability**: Optimized for datasets up to 100,000+ rows
- **Memory Management**: Efficient processing with chunked operations
- **Response Time**: Sub-2 second processing for most operations
- **Browser Compatibility**: Modern browsers with ES2020+ support

### **Security & Privacy**
- **Complete Data Privacy**: No data leaves the user's browser
- **Local Processing**: All analysis performed client-side
- **API Security**: Only metadata sent to AI services, not raw data
- **Input Validation**: Comprehensive validation at every processing step

## License

MIT License
