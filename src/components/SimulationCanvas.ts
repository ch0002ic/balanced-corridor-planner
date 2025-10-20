export class SimulationCanvas {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private lastData: any = null;
  private updateCounter: number = 0;

  constructor(containerId: string) {
    const element = document.getElementById(containerId);
    if (!element) throw new Error(`Container ${containerId} not found`);
    this.container = element;
    console.log('🟡 [CANVAS] Constructor called');
    this.render();
    
    // Wait for next frame to ensure DOM is ready
    requestAnimationFrame(() => {
      this.initCanvas();
    });
  }

  private render(): void {
    console.log('🟡 [CANVAS] Rendering canvas container...');
    console.log('🟡 [CANVAS] Update counter:', this.updateCounter);
    
    // Generate a random background color
    const randomBg = `hsl(${Math.random() * 360}, 70%, 95%)`;
    
    this.container.innerHTML = `
      <div style="
        background: ${randomBg};
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        border: 3px solid #0000ff;
        transition: none;
      ">
        <h2 style="margin: 0 0 16px 0; color: #333; font-size: 24px;">
          Terminal Visualization
          <span style="
            display: inline-block;
            margin-left: 10px;
            padding: 4px 12px;
            background: #0000ff;
            color: white;
            border-radius: 4px;
            font-size: 18px;
            font-weight: bold;
          ">UPDATE #${this.updateCounter}</span>
        </h2>
        <canvas 
          id="terminal-canvas" 
          width="1200" 
          height="600"
          style="
            width: 100%;
            height: auto;
            border: 2px solid #e0e0e0;
            border-radius: 4px;
            background: #f5f5f5;
          "
        ></canvas>
      </div>
    `;
    console.log('✓ [CANVAS] Canvas container rendered with update counter:', this.updateCounter);
  }

  private initCanvas(): void {
    console.log('🟡 [CANVAS] Initializing canvas...');
    this.canvas = document.getElementById('terminal-canvas') as HTMLCanvasElement;
    
    if (!this.canvas) {
      console.error('🔴 [CANVAS] Canvas element not found!');
      return;
    }
    
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) {
      console.error('🔴 [CANVAS] Could not get canvas context!');
      return;
    }
    
    console.log('✓ [CANVAS] Canvas initialized:', {
      width: this.canvas.width,
      height: this.canvas.height,
      hasContext: !!this.ctx
    });
    
    this.drawInitialState();
    
    // If we have last data, redraw it
    if (this.lastData) {
      this.drawVisualization(this.lastData);
    }
  }

  private drawInitialState(): void {
    if (!this.canvas || !this.ctx) {
      console.error('🔴 [CANVAS] Cannot draw - canvas or context missing');
      return;
    }

    console.log('🟡 [CANVAS] Drawing initial state...');
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = '#f5f5f5';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Grid
    this.ctx.strokeStyle = '#e0e0e0';
    this.ctx.lineWidth = 1;
    
    for (let x = 0; x < this.canvas.width; x += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, this.canvas.height);
      this.ctx.stroke();
    }
    
    for (let y = 0; y < this.canvas.height; y += 40) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.canvas.width, y);
      this.ctx.stroke();
    }

    this.drawTerminalAreas();
    console.log('✓ [CANVAS] Initial state drawn');
  }

  private drawTerminalAreas(): void {
    if (!this.ctx) return;

    // Quay Cranes area
    this.ctx.fillStyle = 'rgba(33, 150, 243, 0.1)';
    this.ctx.fillRect(50, 50, 1100, 100);
    this.ctx.strokeStyle = '#2196F3';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(50, 50, 1100, 100);
    
    this.ctx.fillStyle = '#2196F3';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.fillText('Quay Cranes (8 QCs)', 60, 75);

    // Yard area
    this.ctx.fillStyle = 'rgba(76, 175, 80, 0.1)';
    this.ctx.fillRect(50, 200, 1100, 250);
    this.ctx.strokeStyle = '#4CAF50';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(50, 200, 1100, 250);
    
    this.ctx.fillStyle = '#4CAF50';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.fillText('Yard Area (16 Yard Cranes)', 60, 225);

    // HT area
    this.ctx.fillStyle = 'rgba(255, 152, 0, 0.1)';
    this.ctx.fillRect(50, 500, 1100, 50);
    this.ctx.strokeStyle = '#FF9800';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(50, 500, 1100, 50);
    
    this.ctx.fillStyle = '#FF9800';
    this.ctx.font = 'bold 16px Arial';
    this.ctx.fillText('Horizontal Transport (80 HTs)', 60, 525);
  }

  private drawVisualization(data: any): void {
    if (!this.canvas || !this.ctx) {
      console.error('🔴 [CANVAS] Cannot draw - canvas or context missing');
      return;
    }

    console.log('🟡 [CANVAS] Drawing visualization with data:', data);
    
    // Draw active QCs
    if (data.activeQC > 0) {
      console.log(`🟡 [CANVAS] Drawing ${data.activeQC} active QCs`);
      const qcSpacing = 1100 / 8;
      this.ctx.fillStyle = '#2196F3';
      for (let i = 0; i < data.activeQC; i++) {
        this.ctx.fillRect(50 + i * qcSpacing + 20, 60, 40, 80);
      }
    }
    
    // Draw moving HTs
    if (data.movingHT > 0) {
      console.log(`🟡 [CANVAS] Drawing ${data.movingHT} moving HTs`);
      const htSpacing = 1100 / 80;
      this.ctx.fillStyle = '#FF9800';
      for (let i = 0; i < Math.min(data.movingHT, 20); i++) {
        this.ctx.fillRect(50 + i * htSpacing * 4, 510, 30, 30);
      }
    }
    
    // Draw active Yard cranes
    if (data.activeYard > 0) {
      console.log(`🟡 [CANVAS] Drawing ${data.activeYard} active Yard cranes`);
      const yardSpacing = 1100 / 16;
      this.ctx.fillStyle = '#4CAF50';
      for (let i = 0; i < data.activeYard; i++) {
        this.ctx.fillRect(50 + i * yardSpacing + 20, 250, 40, 150);
      }
    }
  }

  public updateVisualization(data: any): void {
    console.log('🟡🟡🟡 [CANVAS] ========== updateVisualization CALLED ==========');
    console.log('🟡🟡🟡 [CANVAS] Data:', JSON.stringify(data, null, 2));
    
    // Increment counter
    this.updateCounter++;
    console.log('🟡🟡🟡 [CANVAS] Update counter now:', this.updateCounter);
    
    // Store data for later
    this.lastData = data;
    
    // COMPLETELY RE-RENDER THE ENTIRE COMPONENT
    this.render();
    
    // Re-initialize canvas after render
    requestAnimationFrame(() => {
      this.initCanvas();
    });
    
    console.log('✓✓✓ [CANVAS] updateVisualization COMPLETE - component re-rendered');
  }
}
