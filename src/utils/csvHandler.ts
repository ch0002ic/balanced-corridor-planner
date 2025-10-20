export interface CSVData {
  headers: string[];
  rows: string[][];
}

export class CSVHandler {
  private static readonly STORAGE_KEY = 'port_terminal_csv';
  private static readonly TIMESTAMP_KEY = 'port_terminal_csv_timestamp';

  static async parseCSV(file: File): Promise<CSVData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const lines = text.split('\n').filter(line => line.trim());
          
          if (lines.length === 0) {
            reject(new Error('CSV file is empty'));
            return;
          }

          const headers = lines[0].split(',').map(h => h.trim());
          const rows = lines.slice(1).map(line => 
            line.split(',').map(cell => cell.trim())
          );

          resolve({ headers, rows });
        } catch (error) {
          reject(new Error('Failed to parse CSV file'));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  static validateCSV(data: CSVData): { valid: boolean; error?: string } {
    if (!data.headers || data.headers.length === 0) {
      return { valid: false, error: 'CSV must have headers' };
    }

    if (!data.rows || data.rows.length === 0) {
      return { valid: false, error: 'CSV must have at least one data row' };
    }

    // Check if all rows have the same number of columns as headers
    const headerCount = data.headers.length;
    for (let i = 0; i < data.rows.length; i++) {
      if (data.rows[i].length !== headerCount) {
        return { 
          valid: false, 
          error: `Row ${i + 1} has ${data.rows[i].length} columns, expected ${headerCount}` 
        };
      }
    }

    return { valid: true };
  }

  static saveToLocalStorage(data: CSVData): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      localStorage.setItem(this.TIMESTAMP_KEY, new Date().toISOString());
    } catch (error) {
      throw new Error('Failed to save CSV to local storage');
    }
  }

  static loadFromLocalStorage(): CSVData | null {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      return null;
    }
  }

  static getUploadTimestamp(): string | null {
    return localStorage.getItem(this.TIMESTAMP_KEY);
  }

  static clearData(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.TIMESTAMP_KEY);
  }

  static getCSVContent(data: CSVData): string {
    const headerRow = data.headers.join(',');
    const dataRows = data.rows.map(row => row.join(',')).join('\n');
    return `${headerRow}\n${dataRows}`;
  }
}
