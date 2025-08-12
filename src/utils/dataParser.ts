import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export class DataParser {
  static async parseCSV(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
        complete: (results) => {
          if (results.errors.length > 0) {
            reject(new Error('CSV parsing errors: ' + results.errors.map(e => e.message).join(', ')));
          } else {
            resolve(results.data);
          }
        },
        error: (error) => reject(error)
      });
    });
  }

  static async parseExcel(file: File): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          if (jsonData.length === 0) {
            resolve([]);
            return;
          }
          
          const headers = jsonData[0] as string[];
          const rows = jsonData.slice(1);
          
          const result = rows.map(row => {
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] || null;
            });
            return obj;
          });
          
          resolve(result);
        } catch (error) {
          reject(new Error('Excel parsing failed: ' + error.message));
        }
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsArrayBuffer(file);
    });
  }

  static async parseFile(file: File): Promise<any[]> {
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'csv':
        return this.parseCSV(file);
      case 'xlsx':
      case 'xls':
        return this.parseExcel(file);
      default:
        throw new Error(`Unsupported file format: ${extension}`);
    }
  }
}