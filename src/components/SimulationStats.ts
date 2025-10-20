export interface SimulationStatsData {
  completedJobs: number;
  remainingJobs: number;
  currentTime: number;
  activeQC: number;
  idleQC: number;
  movingHT: number;
  nonMovingHT: number;
  activeYard: number;
  idleYard: number;
}

export class SimulationStats {
  private container: HTMLElement;
  private updateCounter: number = 0;
  
  private stats: SimulationStatsData = {
    completedJobs: 0,
    remainingJobs: 20000,
    currentTime: 0,
    activeQC: 0,
    idleQC: 8,
    movingHT: 0,
    nonMovingHT: 80,
    activeYard: 0,
    idleYard: 16
  };

  constructor(containerId: string) {
    const element = document.getElementById(containerId);
    if (!element) throw new Error(`Container ${containerId} not found`);
    this.container = element;
    console.log('🟡 [STATS] Constructor called, container:', this.container);
    this.render();
  }

  private formatTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  private calculateEfficiency(): number {
    const totalResources = 8 + 80 + 16;
    const activeResources = this.stats.activeQC + this.stats.movingHT + this.stats.activeYard;
    return Math.round((activeResources / totalResources) * 100);
  }

  private render(): void {
    console.log('🟡 [STATS] ========== RENDER CALLED ==========');
    console.log('🟡 [STATS] Update counter:', this.updateCounter);
    console.log('🟡 [STATS] Current stats:', JSON.stringify(this.stats, null, 2));
    
    // Generate a random background color for the entire card
    const randomBg = `hsl(${Math.random() * 360}, 70%, 95%)`;
    
    this.container.innerHTML = `
      <div style="
        background: ${randomBg};
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        border: 3px solid #ff0000;
        transition: none;
      ">
        <h2 style="margin: 0 0 20px 0; color: #333; font-size: 24px;">
          Simulation Statistics
          <span style="
            display: inline-block;
            margin-left: 10px;
            padding: 4px 12px;
            background: #ff0000;
            color: white;
            border-radius: 4px;
            font-size: 18px;
            font-weight: bold;
          ">UPDATE #${this.updateCounter}</span>
        </h2>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
          <!-- Jobs Progress -->
          <div style="padding: 16px; background: #e3f2fd; border-radius: 8px;">
            <div style="font-size: 12px; color: #1976d2; font-weight: 600; margin-bottom: 8px;">
              JOBS PROGRESS
            </div>
            <div style="font-size: 24px; font-weight: bold; color: #1565c0;">
              ${this.stats.completedJobs.toLocaleString()}
            </div>
            <div style="font-size: 12px; color: #666; margin-top: 4px;">
              Completed / ${this.stats.remainingJobs.toLocaleString()} Remaining
            </div>
          </div>

          <!-- Simulation Time -->
          <div style="padding: 16px; background: #f3e5f5; border-radius: 8px;">
            <div style="font-size: 12px; color: #7b1fa2; font-weight: 600; margin-bottom: 8px;">
              SIMULATION TIME
            </div>
            <div style="font-size: 24px; font-weight: bold; color: #6a1b9a;">
              ${this.formatTime(this.stats.currentTime)}
            </div>
            <div style="font-size: 12px; color: #666; margin-top: 4px;">
              Elapsed Time
            </div>
          </div>

          <!-- Quay Cranes -->
          <div style="padding: 16px; background: #e8f5e9; border-radius: 8px;">
            <div style="font-size: 12px; color: #2e7d32; font-weight: 600; margin-bottom: 8px;">
              QUAY CRANES
            </div>
            <div style="font-size: 24px; font-weight: bold; color: #1b5e20;">
              ${this.stats.activeQC} / 8
            </div>
            <div style="font-size: 12px; color: #666; margin-top: 4px;">
              Active / Total
            </div>
          </div>

          <!-- Horizontal Transport -->
          <div style="padding: 16px; background: #fff3e0; border-radius: 8px;">
            <div style="font-size: 12px; color: #e65100; font-weight: 600; margin-bottom: 8px;">
              HORIZONTAL TRANSPORT
            </div>
            <div style="font-size: 24px; font-weight: bold; color: #bf360c;">
              ${this.stats.movingHT} / 80
            </div>
            <div style="font-size: 12px; color: #666; margin-top: 4px;">
              Moving / Total
            </div>
          </div>

          <!-- Yard Cranes -->
          <div style="padding: 16px; background: #fce4ec; border-radius: 8px;">
            <div style="font-size: 12px; color: #c2185b; font-weight: 600; margin-bottom: 8px;">
              YARD CRANES
            </div>
            <div style="font-size: 24px; font-weight: bold; color: #880e4f;">
              ${this.stats.activeYard} / 16
            </div>
            <div style="font-size: 12px; color: #666; margin-top: 4px;">
              Active / Total
            </div>
          </div>

          <!-- Efficiency -->
          <div style="padding: 16px; background: #e0f2f1; border-radius: 8px;">
            <div style="font-size: 12px; color: #00695c; font-weight: 600; margin-bottom: 8px;">
              EFFICIENCY
            </div>
            <div style="font-size: 24px; font-weight: bold; color: #004d40;">
              ${this.calculateEfficiency()}%
            </div>
            <div style="font-size: 12px; color: #666; margin-top: 4px;">
              Overall Utilization
            </div>
          </div>
        </div>
      </div>
    `;
    
    console.log('✓ [STATS] HTML rendered with update counter:', this.updateCounter);
  }

  public updateStats(newStats: Partial<SimulationStatsData>): void {
    console.log('🟡🟡🟡 [STATS] ========== updateStats CALLED ==========');
    console.log('🟡🟡🟡 [STATS] New stats received:', JSON.stringify(newStats, null, 2));
    
    // Increment counter
    this.updateCounter++;
    
    // Update internal state
    this.stats = { ...this.stats, ...newStats };
    
    console.log('🟡🟡🟡 [STATS] Stats after merge:', JSON.stringify(this.stats, null, 2));
    console.log('🟡🟡🟡 [STATS] Update counter now:', this.updateCounter);
    
    // COMPLETELY RE-RENDER THE ENTIRE COMPONENT
    this.render();
    
    console.log('✓✓✓ [STATS] updateStats COMPLETE - component re-rendered');
  }
}
