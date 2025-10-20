interface HealthResponse {
  status: string;
  timestamp: string;
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
    this.baseURL = '/api';
  }

  async healthCheck(): Promise<HealthResponse> {
    const response = await fetch(`${this.baseURL}/health`);
    if (!response.ok) {
      throw new Error('Health check failed');
    }
    return response.json();
  }

  async startSimulation(): Promise<SimulationResponse> {
    const response = await fetch(`${this.baseURL}/simulation/start`, {
      method: 'POST',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to start simulation');
    }
    return response.json();
  }

  async stopSimulation(): Promise<SimulationResponse> {
    const response = await fetch(`${this.baseURL}/simulation/stop`, {
      method: 'POST',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to stop simulation');
    }
    return response.json();
  }

  async getStatus(): Promise<StatusResponse> {
    const response = await fetch(`${this.baseURL}/simulation/status`);
    if (!response.ok) {
      throw new Error('Failed to get status');
    }
    return response.json();
  }

  async getLogs(): Promise<LogsResponse> {
    const response = await fetch(`${this.baseURL}/simulation/logs`);
    if (!response.ok) {
      throw new Error('Failed to get logs');
    }
    return response.json();
  }

  async uploadCSV(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${this.baseURL}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = 'Failed to upload file';
      try {
        const error = await response.json();
        errorMessage = error.error || errorMessage;
      } catch {
        errorMessage = 'Backend server not responding. Please start the server with: npm run server';
      }
      throw new Error(errorMessage);
    }
    return response.json();
  }
}

export const apiClient = new APIClient();
