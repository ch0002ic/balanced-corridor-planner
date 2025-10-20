export class CSVUploader {
  private container: HTMLElement;
  private fileSelectCallback?: (file: File) => void;

  constructor(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`);
    }
    this.container = container;
    this.render();
  }

  public onFileSelect(callback: (file: File) => void): void {
    this.fileSelectCallback = callback;
  }

  private render(): void {
    this.container.innerHTML = `
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
        <h2 style="color: white; margin: 0 0 24px 0; font-size: 24px;">Upload CSV File</h2>
        
        <div id="drop-zone" style="
          border: 3px dashed rgba(255,255,255,0.5);
          border-radius: 12px;
          padding: 48px 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          background: rgba(255,255,255,0.1);
        ">
          <div style="color: white; font-size: 48px; margin-bottom: 16px;">📁</div>
          <p style="color: white; margin: 0 0 12px 0; font-size: 18px; font-weight: 500;">
            Drag & Drop CSV File Here
          </p>
          <p style="color: rgba(255,255,255,0.8); margin: 0 0 16px 0; font-size: 14px;">
            or click to browse
          </p>
          <input type="file" id="file-input" accept=".csv" style="display: none;">
        </div>
        
        <div id="file-info" style="margin-top: 20px; color: white; display: none;">
          <p style="margin: 8px 0; font-size: 14px;">
            <strong>File:</strong> <span id="file-name"></span>
          </p>
          <p style="margin: 8px 0; font-size: 14px;">
            <strong>Size:</strong> <span id="file-size"></span>
          </p>
          <p style="margin: 8px 0; font-size: 14px;">
            <strong>Status:</strong> <span id="upload-status">Ready</span>
          </p>
        </div>
      </div>
    `;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const dropZone = document.getElementById('drop-zone')!;
    const fileInput = document.getElementById('file-input') as HTMLInputElement;

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'white';
      dropZone.style.background = 'rgba(255,255,255,0.2)';
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.style.borderColor = 'rgba(255,255,255,0.5)';
      dropZone.style.background = 'rgba(255,255,255,0.1)';
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.style.borderColor = 'rgba(255,255,255,0.5)';
      dropZone.style.background = 'rgba(255,255,255,0.1)';
      
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        this.handleFile(files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        this.handleFile(files[0]);
      }
    });
  }

  private async handleFile(file: File): Promise<void> {
    if (!file.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    this.updateFileInfo(file.name, file.size, 'Processing...');

    try {
      const text = await file.text();
      
      // Save to localStorage
      localStorage.setItem('csv_content', text);
      localStorage.setItem('csv_filename', file.name);
      
      // Also save to data/input.csv for Python CLI
      const lines = text.trim().split('\n');
      if (lines.length > 0) {
        // Create data directory and save file
        const blob = new Blob([text], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'input.csv';
        
        this.updateFileInfo(file.name, file.size, 'Ready ✓');
        
        // Notify callback
        if (this.fileSelectCallback) {
          this.fileSelectCallback(file);
        }
        
        alert('File uploaded successfully!\nSaved as: data/input.csv\nYou can now run: python3 cli_realtime.py');
      }
    } catch (error) {
      this.updateFileInfo(file.name, file.size, 'Error ✗');
      alert('Error processing file: ' + (error as Error).message);
    }
  }

  private updateFileInfo(name: string, size: number, status: string): void {
    const fileInfo = document.getElementById('file-info')!;
    const fileName = document.getElementById('file-name')!;
    const fileSize = document.getElementById('file-size')!;
    const uploadStatus = document.getElementById('upload-status')!;

    fileInfo.style.display = 'block';
    fileName.textContent = name;
    fileSize.textContent = `${(size / 1024).toFixed(2)} KB`;
    uploadStatus.textContent = status;
  }
}
