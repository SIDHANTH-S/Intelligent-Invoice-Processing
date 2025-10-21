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

// ===== SLIDING WINDOW MEMORY FOR INVOICE CONTEXT =====
interface InvoiceMemoryEntry {
    timestamp: number;
    companyName: string;
    gstNumber: string;
    commonPatterns: {
        dateFormat?: string;
        itemStructure?: string;
        totalCalculation?: string;
    };
}

class InvoiceMemoryWindow {
    private memory: InvoiceMemoryEntry[] = [];
    private readonly maxSize = 5; // Keep last 5 invoices
    private readonly expiryMs = 30 * 60 * 1000; // 30 minutes

    add(invoice: InvoiceStructured) {
        const entry: InvoiceMemoryEntry = {
            timestamp: Date.now(),
            companyName: invoice.companyName,
            gstNumber: invoice.gstNumber,
            commonPatterns: {
                dateFormat: this.detectDateFormat(invoice.date),
                itemStructure: invoice.items.length > 0 ? 'structured' : 'simple',
                totalCalculation: this.detectTotalPattern(invoice)
            }
        };

        // Remove expired entries
        this.memory = this.memory.filter(m => Date.now() - m.timestamp < this.expiryMs);

        // Add new entry
        this.memory.push(entry);

        // Keep only last N entries
        if (this.memory.length > this.maxSize) {
            this.memory.shift();
        }
    }

    getContext(): string {
        if (this.memory.length === 0) return '';

        const recentCompanies = [...new Set(this.memory.map(m => m.companyName))].slice(0, 3);
        const recentGSTs = [...new Set(this.memory.map(m => m.gstNumber))].filter(g => g !== 'N/A').slice(0, 3);
        const commonDateFormat = this.getMostCommonPattern('dateFormat');

        const contextParts = [];
        if (recentCompanies.length > 0) {
            contextParts.push(`Recent companies: ${recentCompanies.join(', ')}`);
        }
        if (recentGSTs.length > 0) {
            contextParts.push(`Known GST patterns: ${recentGSTs.join(', ')}`);
        }
        if (commonDateFormat) {
            contextParts.push(`Common date format: ${commonDateFormat}`);
        }

        return contextParts.join(' | ');
    }

    private detectDateFormat(date: string): string {
        if (/^\d{4}-\d{2}-\d{2}/.test(date)) return 'ISO8601';
        if (/^\d{2}\/\d{2}\/\d{4}/.test(date)) return 'DD/MM/YYYY';
        if (/^\d{2}-\d{2}-\d{4}/.test(date)) return 'DD-MM-YYYY';
        return 'unknown';
    }

    private detectTotalPattern(invoice: InvoiceStructured): string {
        const itemSum = invoice.items.reduce((sum, item) => sum + (item.total || 0), 0);
        const diff = Math.abs(itemSum - invoice.subtotal);
        return diff < 1 ? 'sum_equals_subtotal' : 'complex_calculation';
    }

    private getMostCommonPattern(key: keyof InvoiceMemoryEntry['commonPatterns']): string | undefined {
        const patterns = this.memory
            .map(m => m.commonPatterns[key])
            .filter(Boolean) as string[];
        
        if (patterns.length === 0) return undefined;

        const counts = patterns.reduce((acc, p) => {
            acc[p] = (acc[p] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    }
}

// Global memory instance
const invoiceMemory = new InvoiceMemoryWindow();

export async function structureInvoiceViaSonar(ocrJson: unknown): Promise<InvoiceStructured> {
    const apiKey = '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';
    const model = 'sonar';

    // Get contextual memory from previous invoices
    const memoryContext = invoiceMemory.getContext();

    const systemPrompt = [
        '🧾 You are an intelligent invoice extraction AI with contextual memory and pattern recognition capabilities.',
        '',
        '📋 CORE OBJECTIVE:',
        'Extract and structure invoice data from noisy OCR output (Hindi/English mixed). Your goal is to produce semantically accurate, consistent, and complete invoice records that feel natural and human-verified.',
        '',
        '🧠 CONTEXTUAL AWARENESS:',
        memoryContext ? `Previous Context: ${memoryContext}` : 'First-time extraction - building context',
        'Use patterns from recent invoices to improve accuracy. If you see similar company names or GST numbers, maintain consistency.',
        '',
        '🔧 PREPROCESSING INTELLIGENCE:',
        '1. Normalize Unicode: Convert Hindi/Devanagari numerals (०-९) to Western digits (0-9)',
        '2. Merge fragments: Join split tokens like "GST IN: 27AA A" → "GSTIN: 27AAA..."',
        '3. Fix OCR errors: Correct common confusions (0/O, 1/I/l, 5/S, 2/Z, 8/B) using semantic context',
        '4. Remove noise: Filter decorative words, logos, repeated fillers ("लोगो", "===", etc.)',
        '5. Reconstruct lines: Join wrapped address lines, item rows, and header information intelligently',
        '',
        '🌐 MULTILINGUAL SEMANTIC MAPPING (Hindi ↔ English):',
        '• Company: कंपनी/संस्था/व्यापार → companyName',
        '• GST: जीएसटी/GSTIN/GST नंबर → gstNumber (15 chars alphanumeric)',
        '• Invoice: चालान/बिल/इनवॉयस → invoiceNumber',
        '• Date: तारीख/दिनांक/Date → date (prefer dd/mm/yyyy or ISO)',
        '• Customer: ग्राहक/खरीदार/Customer → customerId',
        '• Items: सामान/वस्तु/मात्रा/Qty, दर/Rate, कुल/Total, GST',
        '• Amounts: उप-योग/Subtotal, कर/Tax, कुल/Grand Total',
        '',
        '🔍 PATTERN RECOGNITION & REASONING:',
        '• If multiple GST candidates exist, choose the 15-char alphanumeric one closest to known patterns',
        '• Use numeric consistency: verify subtotal ≈ Σ(item.total), grandTotal ≈ subtotal + taxes',
        '• If totals mismatch by <1%, auto-reconcile to maintain mathematical consistency',
        '• Detect item rows by looking for [name, quantity, rate, total] patterns even if columns are misaligned',
        '• Infer missing product IDs from item names or sequence (e.g., "PROD-001", "PROD-002")',
        '',
        '📊 OUTPUT SCHEMA (Strict JSON):',
        '{',
        '  "companyName": string,        // Business name from header',
        '  "address": string,            // Full address, comma-separated',
        '  "gstNumber": string,          // 15-char GSTIN or "N/A"',
        '  "date": string,               // dd/mm/yyyy or ISO format',
        '  "invoiceNumber": string,      // Unique invoice ID (generate if missing)',
        '  "customerId": string,         // Customer ID or name',
        '  "items": [',
        '    {',
        '      "productId": string,      // Product code or auto-generated',
        '      "name": string,           // Item name',
        '      "quantity": number,       // Quantity ordered',
        '      "rate": number,           // Unit price',
        '      "gst": number,            // GST percentage or amount',
        '      "total": number           // Line total',
        '    }',
        '  ],',
        '  "subtotal": number,           // Sum of item totals',
        '  "taxes": number,              // Total tax amount',
        '  "grandTotal": number,         // Final payable amount',
        '  "comments": string,           // Additional notes/terms',
        '  "signatures": [string]        // Signature text if present',
        '}',
        '',
        '✨ SMART IMPUTATION RULES:',
        '• Missing companyName → Extract from header/logo text',
        '• Missing invoiceNumber → Generate format: "INV-" + timestamp (e.g., "INV-20251021001")',
        '• Missing date → Use current date in dd/mm/yyyy format',
        '• Missing customerId → Use "CUST-UNKNOWN" or extract from bill-to section',
        '• Missing productId → Generate "PROD-{index}" (e.g., "PROD-1", "PROD-2")',
        '• Missing numbers → Default to 0',
        '• If subtotal missing: Σ(items.total)',
        '• If taxes missing: grandTotal - subtotal (or 0 if grandTotal missing)',
        '• If grandTotal missing: subtotal + taxes',
        '',
        '🎯 QUALITY ASSURANCE:',
        '• Ensure all item totals = quantity × rate (adjust if OCR caused calculation errors)',
        '• Verify grandTotal = subtotal + taxes (reconcile if diff < 1%)',
        '• Maintain consistency with previous invoices from same company (if in context)',
        '• Prefer semantic correctness over literal OCR output',
        '',
        '⚠️ CONSTRAINTS:',
        '• Output ONLY valid JSON - no markdown, no code blocks, no explanations',
        '• Always use Western digits (0-9) for all numbers',
        '• Keep item names concise but descriptive',
        '• If OCR is severely corrupted, output best-effort structure with "N/A" for unknowns'
    ].join('\n');

    const userContent = typeof ocrJson === 'string' ? ocrJson : JSON.stringify(ocrJson);

    const body = {
        model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Extract invoice data from this OCR output:\n\n${userContent}` }
        ],
        max_tokens: 1500,
        temperature: 0.15
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
        let content = result?.choices?.[0]?.message?.content as string;
        
        // Strip markdown code blocks if present
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
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
        
        // Generate invoice number if missing
        const invoiceNumber = parsed.invoiceNumber && parsed.invoiceNumber !== 'N/A' 
            ? parsed.invoiceNumber 
            : `INV-${Date.now()}`;

        const structuredInvoice: InvoiceStructured = {
            companyName: parsed.companyName || 'N/A',
            address: parsed.address || 'N/A',
            gstNumber: parsed.gstNumber || 'N/A',
            date: parsed.date || `${dd}/${mm}/${yyyy}`,
            invoiceNumber,
            customerId: parsed.customerId || 'CUST-UNKNOWN',
            items: items.map((it: any, idx: number) => ({
                productId: it.productId || `PROD-${idx + 1}`,
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
        };

        // Add to sliding window memory for future context
        invoiceMemory.add(structuredInvoice);

        return structuredInvoice;
    } catch (error) {
        console.error('Invoice extraction error:', error);
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
            invoiceNumber: `INV-${Date.now()}`,
            customerId: 'CUST-UNKNOWN',
            items: [],
            subtotal: 0,
            taxes: 0,
            grandTotal: 0,
            comments: 'OCR extraction failed - manual review required',
            signatures: []
        };
    }
}


