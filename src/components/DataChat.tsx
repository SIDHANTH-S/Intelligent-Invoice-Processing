import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, Bot, User, Database, Sparkles, BarChart3, Eye } from 'lucide-react';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: any;
}

interface DataChatProps {
  data: any[];
  columns: string[];
  profile?: any;
}

export const DataChat: React.FC<DataChatProps> = ({ data, columns, profile }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

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

  // Helper function to generate column descriptions
  const generateColumnDescriptions = (columns: string[], data: any[]): string => {
    if (data.length === 0) return columns.map(col => 'N/A').join(', ');
    
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
      const response = await generateResponse(userMessage.content);
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
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
    return content.split('\n').map((line, index) => {
      if (line.startsWith('• **')) {
        return <li key={index} className="ml-4" dangerouslySetInnerHTML={{ __html: line.replace('• **', '<strong>').replace('**:', '</strong>:') }} />;
      }
      if (line.startsWith('**') && line.includes('**:')) {
        return <div key={index} className="font-semibold text-gray-800 mt-2" dangerouslySetInnerHTML={{ __html: line.replace('**:', '</strong>:').replace('**', '<strong>') }} />;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <div key={index} className="font-semibold text-gray-800 mt-2" dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />;
      }
      return <div key={index} className="mb-1">{line}</div>;
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden h-[600px] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <MessageCircle className="w-6 h-6 text-white" />
            <h3 className="text-xl font-bold text-white">Data Chat Assistant</h3>
            <span className="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm text-white">
              {data.length.toLocaleString()} rows
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-white" />
            <span className="text-sm text-white">{columns.length} columns</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
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
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-3 ${
                    message.type === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-900 shadow-sm border border-gray-200'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.type === 'assistant' && (
                      <Bot className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <div className="text-sm">
                        {formatMessage(message.content)}
                      </div>
                      <div className={`text-xs mt-2 ${
                        message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                    {message.type === 'user' && (
                      <User className="w-5 h-5 text-blue-100 mt-0.5 flex-shrink-0" />
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-900 shadow-sm border border-gray-200 rounded-lg px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <Bot className="w-5 h-5 text-purple-600" />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 p-4 bg-white">
        <div className="flex space-x-3">
          <div className="flex-1 relative">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={data.length === 0 ? "Upload a dataset first..." : "Ask me anything about your dataset..."}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={1}
              disabled={isLoading || data.length === 0}
            />
          </div>
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading || data.length === 0}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Send</span>
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
};
