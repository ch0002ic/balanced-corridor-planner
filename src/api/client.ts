const API_BASE_URL = 'http://localhost:3001/api';

export interface SimulationStatus {
  isRunning: boolean;
  currentTime: number;
  htPositions: Record<string, any>;
  terminalStats: Record<string, any>;
}

export interface SimulationLogs {
  logs: string[];
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      return response.json();
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error('Cannot connect to backend server. Make sure the server is running on port 3001.');
      }
      throw error;
    }
  }

  async startSimulation(): Promise<{ message: string; status: string }> {
    return this.request('/simulation/start', { method: 'POST' });
  }

  async stopSimulation(): Promise<{ message: string; status: string }> {
    return this.request('/simulation/stop', { method: 'POST' });
  }

  async getStatus(): Promise<SimulationStatus> {
    return this.request('/simulation/status');
  }

  async getLogs(): Promise<SimulationLogs> {
    return this.request('/simulation/logs');
  }

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request('/health');
  }
}

export const apiClient = new ApiClient();
