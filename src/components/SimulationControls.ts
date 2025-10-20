export class SimulationControls {
  private container: HTMLElement;
  private isRunning = false;
  private startCallback?: () => void;
  private pauseCallback?: () => void;
  private resetCallback?: () => void;

  constructor(containerId: string) {
    const element = document.getElementById(containerId);
    if (!element) throw new Error(`Container ${containerId} not found`);
    this.container = element;
    this.render();
  }

  public onStart(callback: () => void): void {
    this.startCallback = callback;
  }

  public onPause(callback: () => void): void {
    this.pauseCallback = callback;
  }

  public onReset(callback: () => void): void {
    this.resetCallback = callback;
  }

  public setRunning(running: boolean): void {
    this.isRunning = running;
    this.render();
  }

  private render(): void {
    this.container.innerHTML = `
      <div style="
        background: white;
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        display: flex;
        gap: 12px;
        align-items: center;
      ">
        <button id="start-btn" style="
          padding: 12px 24px;
          background: ${this.isRunning ? '#FF9800' : '#4CAF50'};
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s;
        ">
          ${this.isRunning ? '⏸ Pause' : '▶ Start'} Simulation
        </button>
        
        <button id="reset-btn" style="
          padding: 12px 24px;
          background: #f44336;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.3s;
        ">
          🔄 Reset
        </button>
        
        <div style="
          margin-left: auto;
          padding: 8px 16px;
          background: ${this.isRunning ? '#e8f5e9' : '#f5f5f5'};
          border-radius: 4px;
          font-size: 14px;
          font-weight: 600;
          color: ${this.isRunning ? '#2e7d32' : '#666'};
        ">
          ${this.isRunning ? '● Running' : '○ Stopped'}
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    const startBtn = document.getElementById('start-btn');
    const resetBtn = document.getElementById('reset-btn');

    startBtn?.addEventListener('click', () => {
      this.isRunning = !this.isRunning;
      if (this.isRunning && this.startCallback) {
        this.startCallback();
      } else if (!this.isRunning && this.pauseCallback) {
        this.pauseCallback();
      }
      this.render();
    });

    resetBtn?.addEventListener('click', () => {
      this.isRunning = false;
      if (this.resetCallback) {
        this.resetCallback();
      }
      this.render();
    });
  }
}
