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

// getEnv reserved for future use

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

// ===== Invoice Structuring via Sonar =====
export interface InvoiceStructuredItem {
    productId?: string;
    name?: string;
    quantity?: number;
    rate?: number;
    gst?: number;
    total?: number;
}

export interface InvoiceStructured {
    companyName: string;
    address: string;
    gstNumber: string;
    date: string; // ISO 8601 or dd/mm/yyyy if unknown
    invoiceNumber: string;
    customerId?: string;
    items: InvoiceStructuredItem[];
    subtotal: number;
    taxes: number;
    grandTotal: number;
    comments?: string;
    signatures?: string[];
}

export async function structureInvoiceViaSonar(ocrJson: unknown): Promise<InvoiceStructured> {
    const apiKey = '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';
    const model = 'sonar';

    const systemPrompt = [
        'You are an expert invoice information extraction and normalization system.',
        'INPUT: OCR JSON with fields full_text and detections (Hindi/English). OCR may be noisy: words may be jumbled, duplicated, split, or out of order; numerals may be in Hindi; punctuation may be missing; lines may be wrapped incorrectly.',
        'GOAL: Produce a robust, semantically-correct invoice record using schema below. Use semantic analysis and domain knowledge to infer fields even if tokens are out of order. Prefer consistency and correctness over literal surface form.',
        'PREPROCESSING:',
        '- Normalize whitespace and punctuation. Remove repeated filler tokens (e.g., "लोगो", decorative words).',
        '- Normalize Unicode digits: map Hindi/Devanagari numerals to Western digits.',
        '- Merge fragmented tokens (e.g., split GST numbers) and correct common OCR glyph confusions (0/O, 1/I/l, 5/S, 2/Z) using context.',
        '- Join logically related fragments into coherent lines (e.g., company header, address lines).',
        'SEMANTIC MAPPING:',
        '- Recognize Hindi synonyms for labels: GST/GSTIN/जीएसटी नंबर, चालान/Invoice, दिनांक/Date, ग्राहक/Customer, मात्रा/Qty, दर/Rate, कुल/Total.',
        '- Recognize patterns: GSTIN (15 chars), dates (dd/mm/yyyy or mm/dd/yyyy), currency amounts, item rows with name, quantity, rate, GST, total.',
        'REASONING:',
        '- If multiple candidates exist, choose the one with highest semantic plausibility and numeric consistency (e.g., subtotal ≈ sum(items.total)).',
        '- Use item totals and taxes to reconcile grand total. If mismatch is small (<1%), snap to consistent values.',
        'OUTPUT SCHEMA (JSON only):',
        '{',
        '  "companyName": string,',
        '  "address": string,',
        '  "gstNumber": string,',
        '  "date": string,               // preferred ISO or dd/mm/yyyy',
        '  "invoiceNumber": string,',
        '  "customerId": string,',
        '  "items": [ { "productId": string, "name": string, "quantity": number, "rate": number, "gst": number, "total": number } ],',
        '  "subtotal": number,',
        '  "taxes": number,',
        '  "grandTotal": number,',
        '  "comments": string,',
        '  "signatures": [string]',
        '}',
        'IMPUTATION & CONSISTENCY RULES:',
        '- Missing string → "N/A" IF invoice number is missing place any standard random invoice number; missing number → 0; missing date → today dd/mm/yyyy.',
        '- If totals missing: subtotal = sum(items.total), taxes = 0 if absent, grandTotal = subtotal + taxes.',
        '- If totals exist but inconsistent with items by <1%, adjust subtotal and/or grandTotal to be consistent.',
        'CONSTRAINTS:',
        '- Respond with valid JSON only. No markdown. No explanations.',
        '- Always output Western digits for numbers.'
    ].join('\n');

    const userContent = typeof ocrJson === 'string' ? ocrJson : JSON.stringify(ocrJson);

    const body = {
        model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent }
        ],
        max_tokens: 1200,
        temperature: 0.1
    };

    try {
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error('Sonar error');
        const result = await response.json();
        const content = result?.choices?.[0]?.message?.content as string;
        const parsed = JSON.parse(content);

        // Defensive imputation in case the model omits fields
        const items = Array.isArray(parsed.items) ? parsed.items : [];
        const subtotal = (typeof parsed.subtotal === 'number' ? parsed.subtotal : items.reduce((s: number, it: any) => s + (Number(it.total) || 0), 0));
        const taxes = typeof parsed.taxes === 'number' ? parsed.taxes : 0;
        let grandTotal = typeof parsed.grandTotal === 'number' ? parsed.grandTotal : (subtotal + taxes);
        // Reconcile totals if slightly inconsistent (<1%)
        const sumItems = items.reduce((s: number, it: any) => s + (Number(it.total) || 0), 0);
        const expectedGrand = sumItems + taxes;
        if (expectedGrand > 0) {
            const diff = Math.abs(expectedGrand - grandTotal);
            const rel = diff / expectedGrand;
            if (rel < 0.01) {
                grandTotal = expectedGrand;
            }
        }
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = String(today.getFullYear());

        return {
            companyName: parsed.companyName || 'N/A',
            address: parsed.address || 'N/A',
            gstNumber: parsed.gstNumber || 'N/A',
            date: parsed.date || `${dd}/${mm}/${yyyy}`,
            invoiceNumber: parsed.invoiceNumber || 'N/A',
            customerId: parsed.customerId || 'N/A',
            items: items.map((it: any) => ({
                productId: it.productId || 'N/A',
                name: it.name || 'N/A',
                quantity: Number(it.quantity) || 0,
                rate: Number(it.rate) || 0,
                gst: Number(it.gst) || 0,
                total: Number(it.total) || 0
            })),
            subtotal,
            taxes,
            grandTotal,
            comments: parsed.comments || '',
            signatures: Array.isArray(parsed.signatures) ? parsed.signatures : []
        } as InvoiceStructured;
    } catch {
        // Fallback minimal structure
        const today = new Date();
        const dd = String(today.getDate()).padStart(2, '0');
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const yyyy = String(today.getFullYear());
        return {
            companyName: 'N/A',
            address: 'N/A',
            gstNumber: 'N/A',
            date: `${dd}/${mm}/${yyyy}`,
            invoiceNumber: 'N/A',
            customerId: 'N/A',
            items: [],
            subtotal: 0,
            taxes: 0,
            grandTotal: 0,
            comments: '',
            signatures: []
        };
    }
}


