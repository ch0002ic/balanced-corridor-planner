interface HealthResponse {
  status: string;
  timestamp: string;
  port?: number;
}

interface SimulationResponse {
  message: string;
  status: string;
}

interface StatusResponse {
  isRunning: boolean;
  currentTime: number;
  htPositions: Record<string, unknown>;
  terminalStats: Record<string, unknown>;
}

interface LogsResponse {
  logs: string[];
}

interface UploadResponse {
  message: string;
  filename: string;
  size: number;
}

class APIClient {
  private baseURL: string;

  constructor() {
    // Use relative URL so it works with the same origin
    this.baseURL = '';
  }

  async healthCheck(): Promise<HealthResponse> {
    try {
      const response = await fetch(`${this.baseURL}/api/health`);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      return response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  async startSimulation(): Promise<SimulationResponse> {
    const response = await fetch(`${this.baseURL}/api/simulation/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to start simulation');
    }
    return response.json();
  }

  async stopSimulation(): Promise<SimulationResponse> {
    const response = await fetch(`${this.baseURL}/api/simulation/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to stop simulation');
    }
    return response.json();
  }

  async getStatus(): Promise<StatusResponse> {
    const response = await fetch(`${this.baseURL}/api/simulation/status`);
    if (!response.ok) {
      throw new Error('Failed to get status');
    }
    return response.json();
  }

  async getLogs(): Promise<LogsResponse> {
    const response = await fetch(`${this.baseURL}/api/simulation/logs`);
    if (!response.ok) {
      throw new Error('Failed to get logs');
    }
    return response.json();
  }

  async uploadCSV(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    console.log('Uploading to:', `${this.baseURL}/api/upload`);
    
    const response = await fetch(`${this.baseURL}/api/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(error.error || 'Failed to upload file');
    }
    return response.json();
  }
}

export const apiClient = new APIClient();
