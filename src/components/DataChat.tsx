import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Bot, User, Database, BarChart3, Image as ImageIcon, Mic, MicOff, Printer } from 'lucide-react';
import { structureInvoiceViaSonar } from '../utils/sonar';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'received' | 'error';
  data?: any;
}

interface DataChatProps {
  data: any[];
  columns: string[];
  profile?: any;
  canExecuteCommands?: boolean;
  onExecuteCommand?: (command: { type: string; params?: Record<string, any> }) => Promise<string | void> | (string | void);
}

export const DataChat: React.FC<DataChatProps> = ({ data, columns, profile: _profile, canExecuteCommands, onExecuteCommand }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);

  // Initialize messages when data is available
  useEffect(() => {
    if (data.length > 0 && messages.length === 0) {
      setMessages([
        {
          id: '1',
          type: 'assistant',
          content: `Hello! I'm your AI data assistant powered by Perplexity Sonar. I can see your dataset with ${data.length.toLocaleString()} rows and ${columns.length} columns. I have full access to your data and can provide detailed analysis, statistics, and insights. Ask me anything about your dataset!`,
          timestamp: new Date()
        }
      ]);
    }
  }, [data, columns, messages.length]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Helper function to convert dataset to CSV format
  const convertToCSV = (dataArray: any[], columns: string[]): string => {
    if (dataArray.length === 0) return '';
    
    // Create CSV header
    const csvHeader = columns.join(',');
    
    // Convert each row to CSV format
    const csvRows = dataArray.map(row => {
      return columns.map(col => {
        const value = row[col];
        // Handle values that need quotes (contains comma, newline, or quote)
        if (value === null || value === undefined) {
          return '';
        }
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      }).join(',');
    });
    
    return [csvHeader, ...csvRows].join('\n');
  };

  // ===== Invoice Structures and Helpers =====
  interface InvoiceItem {
    productId?: string;
    name?: string;
    quantity?: number;
    rate?: number;
    gst?: number;
    total?: number;
  }

  interface InvoiceData {
    companyName?: string;
    address?: string;
    gstNumber?: string;
    date?: string;
    invoiceNumber?: string;
    customerId?: string;
    items: InvoiceItem[];
    subtotal?: number;
    taxes?: number;
    grandTotal?: number;
    comments?: string;
    signatures?: string[];
    raw?: any;
  }

  const parseOcrToInvoice = (resp: any): InvoiceData => {
    const detections: Array<{ text: string; confidence: number }> = resp?.detections || [];
    const fullText: string = resp?.full_text || '';
    const text = [fullText, ...detections.map(d => d.text)].join('\n');

    const findMatch = (regex: RegExp): string | undefined => {
      const m = text.match(regex);
      return m ? m[0] : undefined;
    };

    const extractAfter = (labelRegex: RegExp, maxLen = 80): string | undefined => {
      const idx = text.search(labelRegex);
      if (idx === -1) return undefined;
      const slice = text.slice(idx).split(/\n|\r/)[0];
      const parts = slice.split(/[:：]/);
      if (parts.length > 1) {
        return parts[1].trim().slice(0, maxLen);
      }
      return undefined;
    };

    const companyLine = findMatch(/(?:(?:Tax\s+Invoice)|चालान|इनवॉइस)[\s\S]{0,120}/i) ||
      detections.sort((a,b)=>b.confidence-a.confidence).map(d=>d.text).find(t=>t.length>4);

    const companyName = companyLine?.split(/\n|,|\s{2,}/)[0]?.trim();
    const address = findMatch(/\d{1,5}[^\n]{5,60}(?:स्ट्रीट|Street|Road|मार्ग|बिल्डिंग|Building)[^\n]{0,80}/i);

    const gstNumber = findMatch(/(?:GST\s*No\.?|GSTIN|जीएसटी\s*नंबर)[^A-Za-z0-9]{0,6}([A-Z0-9\-]{10,20})/i) ||
      findMatch(/[0-9०-९]{2}\s*[A-Z]{4}[A-Z0-9]{5}[\-–—]?[0-9A-Z]{1}[\-–—]?[Zz][\-–—]?[0-9A-Z]{1}/);

    const date = findMatch(/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/) ||
      extractAfter(/दिन(?:ा|ा)क|Date/i);

    const invoiceNumber = extractAfter(/(?:Invoice\s*No\.?|चालान\s*नंबर|Bill\s*No\.?)/i, 40);
    const customerId = extractAfter(/(?:Customer\s*ID|गाहक\s*आईडी)/i, 40);

    // Basic totals
    const moneyRegex = /(?<!\d)(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?|\d+\.\d{1,2})(?!\d)/g;
    const lines = text.split(/\n|\r/).map(l=>l.trim()).filter(Boolean);
    let subtotal: number | undefined;
    let taxes: number | undefined;
    let grandTotal: number | undefined;
    lines.forEach(l => {
      if (/subtotal|उप-योग/i.test(l)) {
        const m = l.match(moneyRegex);
        if (m && m.length) subtotal = parseFloat(m[m.length-1].replace(/,/g,''));
      }
      if (/tax|gst|कर/i.test(l)) {
        const m = l.match(moneyRegex);
        if (m && m.length) taxes = parseFloat(m[m.length-1].replace(/,/g,''));
      }
      if (/grand\s*total|total\s*amount|कुल|कुल\s*राशि/i.test(l)) {
        const m = l.match(moneyRegex);
        if (m && m.length) grandTotal = parseFloat(m[m.length-1].replace(/,/g,''));
      }
    });

    // Items heuristic: look for lines containing qty x rate or with multiple numbers
    const items: InvoiceItem[] = [];
    lines.forEach(l => {
      const nums = (l.match(moneyRegex) || []).map(s => parseFloat(s.replace(/,/g,'')));
      if (nums.length >= 2 && /qty|quantity|मात्रा|pcs|rate|दर|x/i.test(l)) {
        const name = l.replace(moneyRegex, '').replace(/qty|quantity|मात्रा|pcs|rate|दर|x/ig,' ').replace(/\s{2,}/g,' ').trim();
        const [n1, n2, n3] = nums;
        const quantity = n1 && n2 && n3 ? Math.round((n3 / n2) || n1) : undefined;
        items.push({ name, quantity, rate: n2, total: n3 });
      }
    });

    const comments = extractAfter(/comments|टिप्पणी|remarks/i, 120);
    const signatures: string[] = [];
    if (/signature|हस्ताक्षर/i.test(text)) signatures.push('Signature Present');

    return {
      companyName,
      address,
      gstNumber,
      date,
      invoiceNumber,
      customerId,
      items,
      subtotal,
      taxes,
      grandTotal,
      comments,
      signatures,
      raw: resp
    };
  };

  const handleImageUpload = async (file: File) => {
    try {
      setIsLoading(true);
      const form = new FormData();
      form.append('image', file);
      const res = await fetch('https://sidhu07-hindi-ocr-api.hf.space/ocr', {
        method: 'POST',
        body: form
      });
      if (!res.ok) {
        throw new Error(`OCR failed: ${res.status}`);
      }
      const json = await res.json();
      // First, quick heuristic parse; then refine with Sonar NLP for strict schema + imputation
      let inv = parseOcrToInvoice(json);
      try {
        const structured = await structureInvoiceViaSonar({ full_text: json.full_text, detections: json.detections, heuristic: inv });
        inv = {
          companyName: structured.companyName,
          address: structured.address,
          gstNumber: structured.gstNumber,
          date: structured.date,
          invoiceNumber: structured.invoiceNumber,
          customerId: structured.customerId,
          items: structured.items,
          subtotal: structured.subtotal,
          taxes: structured.taxes,
          grandTotal: structured.grandTotal,
          comments: structured.comments,
          signatures: structured.signatures,
          raw: json
        } as any;
      } catch {}
      setInvoice(inv);
      setShowInvoice(true);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'assistant',
        content: `🧾 OCR processed. Parsed invoice for ${inv.companyName || 'unknown company'}. Click Print to download.`,
        timestamp: new Date()
      }]);
    } catch (e:any) {
      setMessages(prev => [...prev, {
        id: (Date.now()+1).toString(),
        type: 'assistant',
        content: `OCR Error: ${e?.message || 'Failed to process image.'}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'assistant',
        content: 'Your browser does not support Speech Recognition.',
        timestamp: new Date()
      }]);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event: any) => {
      let interim = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcript + ' ';
        } else {
          interim += transcript;
        }
      }
      if (interim) setInputValue(prev => prev + interim);
      if (finalText) setInputValue(prev => (prev + finalText).trim() + ' ');
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setIsListening(false);
  };

  // Helper function to generate column descriptions
  const generateColumnDescriptions = (columns: string[], data: any[]): string => {
    if (data.length === 0) return columns.map(() => 'N/A').join(', ');
    
    return columns.map(col => {
      const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined && v !== '');
      const uniqueValues = [...new Set(values)];
      const nullCount = data.length - values.length;
      
      // Try to infer description from data patterns
      if (values.length === 0) return 'N/A';
      
      const firstValue = values[0];
      if (typeof firstValue === 'number') {
        return `Numeric data (${values.length} values, ${nullCount} null)`;
      } else if (typeof firstValue === 'string') {
        if (uniqueValues.length <= 10) {
          return `Categorical data (${uniqueValues.length} unique values)`;
        } else {
          return `Text data (${values.length} values, ${nullCount} null)`;
        }
      } else if (firstValue instanceof Date) {
        return `Date/time data (${values.length} values, ${nullCount} null)`;
      } else {
        return `Data column (${values.length} values, ${nullCount} null)`;
      }
    }).join(', ');
  };

  const generateResponse = async (userMessage: string): Promise<string> => {
    const API_KEY = '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';
    const MODEL = import.meta.env.VITE_PPLX_MODEL || 'sonar';
    
    // Check if dataset is loaded
    if (data.length === 0) {
      throw new Error('No dataset loaded. Please upload a dataset first.');
    }
    
    // Generate dataset context
    const csvContent = convertToCSV(data, columns);
    const columnDescriptions = generateColumnDescriptions(columns, data);
    
    // Create the full message with dataset context
    const fullMessage = [
      '=== DATASET CONTEXT START ===',
      `Column Headers: ${columns.join(', ')}`,
      `Column Descriptions: ${columnDescriptions}`,
      'Full Dataset:',
      '```csv',
      csvContent,
      '```',
      '=== DATASET CONTEXT END ===',
      '',
      `User Question: ${userMessage}`
    ].join('\n');

    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: 'system',
              content: `You are a helpful data analysis assistant. When provided with a dataset in CSV format, analyze it thoroughly and provide detailed insights. You can perform statistical analysis, identify patterns, answer specific questions about the data, and provide recommendations for data quality improvements. Keep responses conversational and informative.`
            },
            {
              role: 'user',
              content: fullMessage
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(result.error.message || 'API returned an error');
      }

      if (!result.choices || !result.choices[0] || !result.choices[0].message) {
        throw new Error('Invalid response format from API');
      }

      return result.choices[0].message.content;
    } catch (error) {
      console.error('Perplexity API Error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('401') || error.message.includes('403')) {
          return '❌ **API Key Error**: Your Perplexity API key is invalid or missing. Please check your configuration in the .env file.';
        } else if (error.message.includes('429')) {
          return '⏳ **Rate Limit**: Too many requests. Please wait a moment and try again.';
        } else if (error.message.includes('500')) {
          return '🔧 **Server Error**: The Perplexity API is experiencing issues. Please try again later.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          return '🌐 **Network Error**: Please check your internet connection and try again.';
        } else if (error.message.includes('API request failed')) {
          return `❌ **API Error**: ${error.message}. Please check your API key and try again.`;
        }
      }
      
      return '❌ **Unexpected Error**: Something went wrong. Please try again or check your API configuration.';
    }
  };

  // Markdown parser based on provided reference with improvements for lists and code blocks
  const parseMarkdown = (rawText: string): string => {
    if (!rawText) return '';

    let text = rawText;

    // Remove reference numbers like [1]
    text = text.replace(/\[\d+\]/g, '');

    // Extract code blocks first and replace with placeholders to avoid inner parsing
    const codeBlockMap: Record<string, string> = {};
    let codeIndex = 0;
    text = text.replace(/```(\w+)?\n([\s\S]*?)```/g, (_match, lang, code) => {
      const language = (lang || 'text').toString();
      const escaped = code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const html = `<pre class="bg-gray-900 text-gray-100 rounded-md p-3 overflow-x-auto mb-4"><code class="language-${language}">${escaped}</code></pre>`;
      const placeholder = `__CODE_BLOCK_${codeIndex++}__`;
      codeBlockMap[placeholder] = html;
      return placeholder;
    });

    // Headings
    text = text.replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold mb-2">$1<\/h3>');
    text = text.replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mb-3">$1<\/h2>');
    text = text.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mb-4">$1<\/h1>');

    // Bold and italic
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1<\/strong>');
    text = text.replace(/\*(.*?)\*/g, '<em class="italic">$1<\/em>');

    // Lists: mark unordered vs ordered items
    text = text.replace(/^\s*[-*•]\s+(.*$)/gm, '<li class="mb-2 ul-item">$1<\/li>');
    text = text.replace(/^\s*\d+\.\s+(.*$)/gm, '<li class="mb-2 ol-item">$1<\/li>');

    // Wrap consecutive list items
    text = text.replace(/(?:<li class=\"mb-2 ul-item\">[\s\S]*?<\/li>\s*)+/g, (match) => {
      return `<ul class="list-disc pl-6 mb-4">${match}<\/ul>`;
    });
    text = text.replace(/(?:<li class=\"mb-2 ol-item\">[\s\S]*?<\/li>\s*)+/g, (match) => {
      return `<ol class="list-decimal pl-6 mb-4">${match}<\/ol>`;
    });
    // Remove helper markers
    text = text.replace(/\s?ul-item|\s?ol-item/g, '');

    // Paragraphs: wrap lines that are not already block elements
    const lines = text.split(/\n/);
    text = lines
      .map((line) => {
        const trimmed = line.trim();
        if (trimmed === '') return '';
        if (/^<(h[1-6]|ul|ol|li|pre|blockquote|table|p)/.test(trimmed)) {
          return line;
        }
        return `<p class="mb-4 leading-relaxed">${trimmed}<\/p>`;
      })
      .join('\n');

    // Clean up empty paragraphs
    text = text.replace(/<p class=\"mb-4 leading-relaxed\"><\/p>/g, '');

    // Restore code blocks
    Object.keys(codeBlockMap).forEach((key) => {
      text = text.replace(new RegExp(key, 'g'), codeBlockMap[key]);
    });

    return text;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    try {
      // Try to parse and execute command first if enabled
      const maybeCommand = parseCommand(userMessage.content);
      if (canExecuteCommands && maybeCommand && onExecuteCommand) {
        const execResult = await onExecuteCommand(maybeCommand);
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: typeof execResult === 'string' && execResult.length > 0
            ? execResult
            : `✅ Executed command: ${maybeCommand.type}${maybeCommand.params?.column ? ` on ${maybeCommand.params.column}` : ''}. You can ask for a summary or run estimation next.`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const response = await generateResponse(userMessage.content);
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'assistant',
          content: response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessage = (content: string) => {
    const html = parseMarkdown(content);
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  // Basic command parser for demo: supports imputation, duplicates handling, and outlier capping
  const parseCommand = (text: string): { type: string; params?: Record<string, any> } | null => {
    const lc = text.toLowerCase();
    // Imputation
    const imputeMatch = lc.match(/imput(e|ation)|fill missing|knn imputation|median imputation|mean imputation/);
    if (imputeMatch) {
      const method = lc.includes('knn') ? 'median' : lc.includes('median') ? 'median' : lc.includes('mean') ? 'mean' : 'median';
      // Try to detect a column
      const onCol = lc.match(/in\s+([a-z0-9_\- ]+)/);
      const column = onCol ? onCol[1].trim() : undefined;
      return { type: 'clean_impute', params: { method, column } };
    }
    // Duplicates
    if (lc.includes('remove duplicates') || lc.includes('deduplicate') || lc.includes('drop duplicates')) {
      return { type: 'clean_duplicates', params: { method: 'remove_first' } };
    }
    // Outliers
    if (lc.includes('winsorize') || lc.includes('cap outliers') || lc.includes('handle outliers')) {
      return { type: 'clean_outliers', params: { method: 'cap' } };
    }
    // Run full cleaning
    if (lc.includes('clean data') || lc.includes('run cleaning')) {
      return { type: 'clean_all' };
    }
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden h-[600px] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 px-6 py-5 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-white/15 backdrop-blur-sm shadow-sm">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg md:text-xl font-semibold text-white tracking-tight">Data Chat Assistant</h3>
              <p className="text-xs text-white/80">Ask questions, get insights, explore your data</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline-flex items-center gap-2 bg-white/15 text-white px-3 py-1.5 rounded-full text-xs shadow-sm">
              <Database className="w-3.5 h-3.5" />
              {columns.length} columns
            </span>
            <span className="inline-flex items-center gap-2 bg-white/15 text-white px-3 py-1.5 rounded-full text-xs shadow-sm">
              <BarChart3 className="w-3.5 h-3.5" />
              {data.length.toLocaleString()} rows
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-chat-surface">
        {data.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">
              <Database className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No Dataset Loaded</p>
              <p className="text-sm">Please upload a dataset first to start chatting with your data.</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} fade-in-up`}
              >
                <div
                  className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 shadow-md ${
                    message.type === 'user'
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-blue-200/50'
                      : 'bg-white/90 backdrop-blur border border-gray-200 text-gray-900'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.type === 'assistant' && (
                      <Bot className="w-5 h-5 text-indigo-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="text-sm leading-relaxed">
                        {formatMessage(message.content)}
                      </div>
                      <div className={`text-[11px] mt-2 flex items-center gap-2 ${
                        message.type === 'user' ? 'text-blue-100/90' : 'text-gray-500'
                      }`}>
                        <span>{message.timestamp.toLocaleTimeString()}</span>
                        {message.type === 'user' && (
                          <span className="opacity-80">· {message.status || 'sent'}</span>
                        )}
                      </div>
                    </div>
                    {message.type === 'user' && (
                      <User className="w-5 h-5 text-white mt-0.5 flex-shrink-0" />
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start fade-in-up">
                <div className="bg-white/95 backdrop-blur border border-gray-200 rounded-2xl px-4 py-3 shadow-md">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Bot className="w-5 h-5 text-indigo-600" />
                    <span className="text-xs">Assistant is typing</span>
                    <div className="typing">
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                      <span className="typing-dot"></span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Invoice Preview */}
      {showInvoice && invoice && (
        <div className="border-t border-gray-200 p-4 bg-white/90">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm text-gray-600">Invoice Preview</div>
            <button
              onClick={() => {
                const w = window.open('', '_blank');
                if (!w) return;
                w.document.write(`<!DOCTYPE html><html><head><title>Invoice</title><style>
                  body{font-family:ui-sans-serif,system-ui,Segoe UI,Roboto,Arial;padding:24px;color:#111}
                  h1{font-size:20px;margin:0}
                  h2{font-size:16px;margin:16px 0 8px}
                  table{width:100%;border-collapse:collapse;margin-top:12px}
                  th,td{border:1px solid #ddd;padding:8px;font-size:12px}
                  .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}
                </style></head><body>`);
                w.document.write(`<h1>${invoice.companyName || ''}</h1>`);
                w.document.write(`<div>${invoice.address || ''}</div>`);
                w.document.write(`<div class="grid">
                  <div><strong>GST:</strong> ${invoice.gstNumber || ''}</div>
                  <div><strong>Date:</strong> ${invoice.date || ''}</div>
                  <div><strong>Invoice #:</strong> ${invoice.invoiceNumber || ''}</div>
                  <div><strong>Customer ID:</strong> ${invoice.customerId || ''}</div>
                </div>`);
                w.document.write(`<h2>Items</h2>`);
                w.document.write(`<table><thead><tr>
                  <th>Product ID</th><th>Name</th><th>Qty</th><th>Rate</th><th>GST</th><th>Total</th>
                </tr></thead><tbody>`);
                (invoice.items || []).forEach(it => {
                  w.document.write(`<tr>
                    <td>${it.productId || ''}</td>
                    <td>${it.name || ''}</td>
                    <td>${it.quantity ?? ''}</td>
                    <td>${it.rate ?? ''}</td>
                    <td>${it.gst ?? ''}</td>
                    <td>${it.total ?? ''}</td>
                  </tr>`);
                });
                w.document.write(`</tbody></table>`);
                w.document.write(`<div class="grid">
                  <div><strong>Subtotal:</strong> ${invoice.subtotal ?? ''}</div>
                  <div><strong>Taxes:</strong> ${invoice.taxes ?? ''}</div>
                  <div><strong>Grand Total:</strong> ${invoice.grandTotal ?? ''}</div>
                </div>`);
                if (invoice.comments) w.document.write(`<h2>Comments</h2><div>${invoice.comments}</div>`);
                w.document.write(`<script>window.print();</script></body></html>`);
                w.document.close();
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50"
            >
              <Printer className="w-4 h-4" />
              <span className="text-sm">Print</span>
            </button>
          </div>
          <div className="text-sm">
            <div className="font-semibold">{invoice.companyName}</div>
            <div className="text-gray-600">{invoice.address}</div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div>GST: {invoice.gstNumber}</div>
              <div>Date: {invoice.date}</div>
              <div>Invoice #: {invoice.invoiceNumber}</div>
              <div>Customer ID: {invoice.customerId}</div>
            </div>
            <div className="overflow-x-auto mt-3">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-2 border">Product ID</th>
                    <th className="text-left p-2 border">Name</th>
                    <th className="text-right p-2 border">Qty</th>
                    <th className="text-right p-2 border">Rate</th>
                    <th className="text-right p-2 border">GST</th>
                    <th className="text-right p-2 border">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(invoice.items || []).map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2 border">{it.productId}</td>
                      <td className="p-2 border">{it.name}</td>
                      <td className="p-2 border text-right">{it.quantity}</td>
                      <td className="p-2 border text-right">{it.rate}</td>
                      <td className="p-2 border text-right">{it.gst}</td>
                      <td className="p-2 border text-right">{it.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div>Subtotal: {invoice.subtotal}</div>
              <div>Taxes: {invoice.taxes}</div>
              <div>Grand Total: {invoice.grandTotal}</div>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-gray-200 p-4 md:p-5 bg-white/90 backdrop-blur sticky bottom-0">
        <div className="flex gap-3 items-end">
          {/* Left: Image Upload */}
          <div>
            <input id="ocr-image-input" type="file" accept="image/*" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImageUpload(f);
              (e.target as HTMLInputElement).value = '';
            }} />
            <label htmlFor="ocr-image-input" className="inline-flex items-center gap-2 px-3 py-3 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 cursor-pointer shadow-sm">
              <ImageIcon className="w-5 h-5 text-gray-700" />
            </label>
          </div>

          <div className="flex-1 relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={data.length === 0 ? "Upload a dataset first..." : "Ask me anything about your dataset..."}
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 shadow-sm bg-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent hover:shadow-md transition"
              rows={1}
              disabled={isLoading || data.length === 0}
            />
          </div>
          {/* Right: Mic + Send */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => (isListening ? stopListening() : startListening())}
              className={`px-3 py-3 rounded-2xl border ${isListening ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-200 bg-white text-gray-700'} hover:bg-gray-50 shadow-sm`}
              title="Speech to text"
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading || data.length === 0}
              className="px-5 md:px-6 py-3 rounded-2xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition"
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </div>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
};
