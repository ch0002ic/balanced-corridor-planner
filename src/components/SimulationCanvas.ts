export class SimulationCanvas {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private progress: number = 0;

  constructor(canvasId: string) {
    const element = document.getElementById(canvasId);
    if (!element || !(element instanceof HTMLCanvasElement)) {
      throw new Error(`Canvas ${canvasId} not found`);
    }
    this.canvas = element;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    this.ctx = ctx;
    
    this.setupCanvas();
    this.render();
  }

  private setupCanvas(): void {
    this.canvas.width = 800;
    this.canvas.height = 600;
  }

  private render(): void {
    const { width, height } = this.canvas;
    
    // Clear canvas
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, width, height);
    
    // Draw terminal layout placeholder
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 2;
    
    // Draw grid
    for (let x = 0; x < width; x += 50) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }
    
    for (let y = 0; y < height; y += 50) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }
    
    // Draw progress bar
    const barHeight = 30;
    const barY = height - 50;
    const barWidth = width - 40;
    const barX = 20;
    
    // Background
    this.ctx.fillStyle = '#333';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Progress
    this.ctx.fillStyle = '#4CAF50';
    this.ctx.fillRect(barX, barY, (barWidth * this.progress) / 100, barHeight);
    
    // Border
    this.ctx.strokeStyle = '#666';
    this.ctx.strokeRect(barX, barY, barWidth, barHeight);
    
    // Text
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '16px monospace';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      `Progress: ${this.progress.toFixed(1)}%`,
      width / 2,
      barY + barHeight / 2 + 6
    );
  }

  public updateProgress(progress: number): void {
    this.progress = Math.max(0, Math.min(100, progress));
    this.render();
  }
}
