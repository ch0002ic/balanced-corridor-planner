/**
 * WebSocket client for receiving real-time simulation updates
 */

export interface SimulationUpdate {
  type: 'simulation_start' | 'simulation_progress' | 'simulation_complete' | 'pong';
  data?: any;
  timestamp?: number;
}

export type UpdateCallback = (update: SimulationUpdate) => void;

export class SimulationWebSocket {
  private ws: WebSocket | null = null;
  private callbacks: Set<UpdateCallback> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private url: string;

  constructor(url: string = 'ws://localhost:8765') {
    this.url = url;
  }

  connect(): void {
    console.log('🔌 [WS] Attempting to connect to:', this.url);
    
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('✓ [WS] Connected to simulation server');
        this.reconnectAttempts = 0;
        
        // Send ping to test connection
        this.ws?.send(JSON.stringify({ type: 'ping' }));
      };

      this.ws.onmessage = (event) => {
        try {
          const update: SimulationUpdate = JSON.parse(event.data);
          console.log('📨 [WS] Received update:', update.type, update.data);
          
          // Notify all registered callbacks
          this.callbacks.forEach(callback => {
            try {
              callback(update);
            } catch (error) {
              console.error('❌ [WS] Error in callback:', error);
            }
          });
        } catch (error) {
          console.error('❌ [WS] Failed to parse message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ [WS] WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('🔌 [WS] Connection closed');
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('❌ [WS] Failed to create WebSocket:', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ [WS] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 [WS] Reconnecting... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
  }

  subscribe(callback: UpdateCallback): () => void {
    this.callbacks.add(callback);
    console.log('✓ [WS] Callback subscribed. Total:', this.callbacks.size);
    
    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
      console.log('✓ [WS] Callback unsubscribed. Total:', this.callbacks.size);
    };
  }

  disconnect(): void {
    if (this.ws) {
      console.log('🔌 [WS] Disconnecting...');
      this.ws.close();
      this.ws = null;
    }
    this.callbacks.clear();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
