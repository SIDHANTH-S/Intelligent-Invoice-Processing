import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : null;

export interface SupabaseTable {
  name: string;
  label: string;
  description: string;
}

export const availableTables: SupabaseTable[] = [
  {
    name: 'customers',
    label: 'Customers',
    description: 'Customer data with revenue, profit, and segment information'
  },
  {
    name: 'bills',
    label: 'Bills',
    description: 'Billing data with amounts, dates, and status'
  },
  {
    name: 'bill_items',
    label: 'Bill Items',
    description: 'Individual items within bills with quantities and rates'
  }
];

export async function fetchTableData(tableName: string): Promise<any[]> {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(10000); // Reasonable limit for data quality analysis

  if (error) {
    throw new Error(`Failed to fetch data from ${tableName}: ${error.message}`);
  }

  return data || [];
}

export function convertToCSV(data: any[]): string {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) {
        return '';
      }
      const stringValue = String(value);
      // Escape quotes and wrap in quotes if contains comma, newline, or quote
      if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    }).join(',');
  });

  return [csvHeaders, ...csvRows].join('\n');
}

export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}