# Data Quality Analyzer and Cleaner

A professional survey data analysis platform with advanced statistical estimation and AI-powered data chat capabilities.

## Features

- **Data Upload & Processing**: Support for CSV, Excel, and JSON files
- **Data Quality Analysis**: Automated profiling, issue detection, and quality metrics
- **Schema Mapping**: Intelligent column mapping for survey data
- **Data Cleaning**: Advanced cleaning options with customizable rules
- **Statistical Estimation**: Weighted analysis and statistical calculations
- **AI Chat Assistant**: Powered by Perplexity Sonar API with full dataset context for intelligent data exploration
- **Validation Dashboard**: Comprehensive data validation tools

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
   VITE_PPLX_API_KEY=your_actual_api_key_here
   VITE_PPLX_MODEL=sonar  # or 'sonar-pro' for deeper reasoning
   ```

### Running the Application
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Usage

1. **Upload Data**: Start by uploading your dataset (CSV, Excel, or JSON)
2. **Analyze**: Review data quality metrics and detected issues
3. **Map Schema**: Optionally map columns to a survey schema
4. **Clean Data**: Apply cleaning rules to improve data quality
5. **Chat with Data**: Use the AI assistant with full dataset context to explore your data
6. **Calculate Estimates**: Perform statistical analysis with weighting options

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Build Tool**: Vite
- **Icons**: Lucide React
- **AI Chat**: Perplexity Sonar API
- **Data Processing**: Custom utilities for CSV/Excel parsing and analysis

## License

MIT License
