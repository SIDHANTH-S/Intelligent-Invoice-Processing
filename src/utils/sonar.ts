export interface CleaningSummaryContext {
	profile?: {
		rowCount: number;
		columnCount: number;
		missingValues: number;
		duplicateRows: number;
	};
	metrics?: {
		overallScore: number;
		completeness: number;
		validity: number;
		consistency: number;
		uniqueness: number;
	};
	actions?: Array<{
		type: string;
		column: string;
		description: string;
	}>;
	options?: {
		handleMissing: string;
		handleDuplicates: string;
		handleOutliers: string;
		standardizeText: boolean;
		validateFormats: boolean;
	};
	weightVariable?: { column: string; type: string } | null;
	estimates?: Array<{
		variable: string;
		estimate: number;
		marginOfError: number;
	}>;
}

function getEnv(key: string, fallback?: string): string | undefined {
	// Vite exposes env on import.meta.env
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const env = (import.meta as any).env || {};
	return env[key] ?? fallback;
}

export async function generateCleaningSummaryViaSonar(context: CleaningSummaryContext): Promise<string> {
	const apiKey = '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';
	const model = 'sonar';

	// Fallback if no API key: return a concise deterministic summary
	if (!apiKey) {
		return fallbackSummary(context);
	}

	const { profile, metrics, actions = [], options, weightVariable, estimates = [] } = context;

	const actionSummary = summarizeActions(actions);
	const estimateSummary = estimates
		.slice(0, 3)
		.map(e => `${e.variable}: ${e.estimate.toFixed(2)} ± ${e.marginOfError.toFixed(2)}`)
		.join('; ');

	const userContent = [
		'=== DATA QUALITY METRICS START ===',
		profile ? `Rows: ${profile.rowCount}, Columns: ${profile.columnCount}, Missing Cells: ${profile.missingValues}, Duplicate Rows: ${profile.duplicateRows}` : 'Rows: N/A',
		metrics ? `Quality Score: ${metrics.overallScore}, Completeness: ${metrics.completeness}%, Validity: ${metrics.validity}%, Consistency: ${metrics.consistency}%, Uniqueness: ${metrics.uniqueness}%` : 'Metrics: N/A',
		options ? `Cleaning Options → Missing: ${options.handleMissing}, Duplicates: ${options.handleDuplicates}, Outliers: ${options.handleOutliers}, StdText: ${options.standardizeText}` : 'Cleaning Options: N/A',
		actionSummary ? `Actions: ${actionSummary}` : 'Actions: N/A',
		weightVariable ? `Weighting: ${weightVariable.type} using ${weightVariable.column}` : 'Weighting: none',
		estimateSummary ? `Estimates: ${estimateSummary}` : 'Estimates: none',
		'=== DATA QUALITY METRICS END ===',
		'',
		'Write a concise, human-readable, single-paragraph summary for a policymaker audience.',
		'- Include specific percentages and counts when available.',
		'- Briefly name the cleaning steps (imputation method, duplicate handling, outlier treatment).',
		'- If estimates are provided, include one sentence with the key estimate and MoE.',
		'- Avoid markdown headings; keep it under 80 words.'
	].join('\n');

	const body = {
		model,
		messages: [
			{ role: 'system', content: 'You are a senior data quality analyst who writes crisp executive summaries.' },
			{ role: 'user', content: userContent }
		],
		max_tokens: 220,
		temperature: 0.2
	};

	try {
        console.log('Sending request to Perplexity API...');
	console.log('Request body:', JSON.stringify(body, null, 2));
		const response = await fetch('https://api.perplexity.ai/chat/completions', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(body)
		});
		if (!response.ok) {
			return fallbackSummary(context);
		}
		const result = await response.json();
		const content = result?.choices?.[0]?.message?.content;
		return typeof content === 'string' && content.trim().length > 0 ? content.trim() : fallbackSummary(context);
	} catch {
		return fallbackSummary(context);
	}
}

function fallbackSummary(context: CleaningSummaryContext): string {
	const { profile, actions = [], options, estimates = [] } = context;
	const totalCells = profile ? profile.rowCount * profile.columnCount : 0;
	const missingPct = profile && totalCells > 0 ? Math.round((profile.missingValues / totalCells) * 100) : 0;
	const dupPct = profile && profile.rowCount > 0 ? Math.round((profile.duplicateRows / profile.rowCount) * 100) : 0;
	const outlierCount = actions
		.filter(a => a.description.toLowerCase().includes('outlier'))
		.map(a => (a.description.match(/(\d+)/)?.[1])).filter(Boolean)
		.map(n => parseInt(n as string)).reduce((s, v) => s + v, 0);
	const outlierPct = profile && profile.rowCount > 0 ? Math.round((outlierCount / profile.rowCount) * 100) : 0;
	const est = estimates[0];
	const imputePhrase = options?.handleMissing === 'remove' ? 'removed' : `imputed by ${String(options?.handleMissing || 'median').replace('_', ' ')}`;
	const outlierPhrase = options?.handleOutliers === 'cap' ? 'winsorized' : options?.handleOutliers === 'remove' ? 'removed' : 'kept';
	const estText = est ? ` Weighted ${est.variable} was ${est.estimate.toFixed(2)} ± ${est.marginOfError.toFixed(2)}.` : '';
	return `Your dataset had ${missingPct}% missing values (${imputePhrase}), ${dupPct}% duplicates (removed), and ${outlierPct}% extreme outliers (${outlierPhrase}).${estText}`;
}

function summarizeActions(actions: CleaningSummaryContext['actions']): string {
	if (!actions || actions.length === 0) return '';
	const counts: Record<string, number> = {};
	actions.forEach(a => { counts[a.type] = (counts[a.type] || 0) + 1; });
	return Object.entries(counts).map(([t, n]) => `${t}: ${n}`).join(', ');
}


