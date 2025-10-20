import './style.css';
import { CSVUploader } from './components/CSVUploader';
import { SimulationCanvas } from './components/SimulationCanvas';
import { SimulationStats } from './components/SimulationStats';
import { SimulationControls } from './components/SimulationControls';

// FIRST: Render the HTML structure
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div style="max-width: 1400px; margin: 0 auto; padding: 40px 20px;">
    <h1 style="text-align: center; color: #ffffff; margin-bottom: 40px; text-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
      TCW Academy - Port Terminal Simulation
    </h1>
    
    <div id="status-bar" style="background: rgba(255,255,255,0.1); padding: 12px 20px; border-radius: 8px; margin-bottom: 24px; font-family: monospace; color: #ffffff;">
      <div id="worker-status">🔵 Initializing Pyodide worker...</div>
    </div>
    
    <div id="debug-panel" style="background: rgba(0,0,0,0.8); padding: 16px; border-radius: 8px; margin-bottom: 24px; font-family: monospace; color: #00ff00; font-size: 12px; max-height: 200px; overflow-y: auto;">
      <div id="debug-output">Waiting for data...</div>
    </div>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
      <div id="csv-uploader"></div>
      <div id="simulation-controls"></div>
    </div>
    
    <div style="margin-bottom: 24px;">
      <div id="simulation-canvas"></div>
    </div>
    
    <div id="simulation-stats"></div>
  </div>
`;

let worker: Worker | null = null;
let simulationRunning = false;
let pyodideReady = false;

// THEN: Initialize UI components AFTER DOM is rendered
console.log('🔵 [MAIN] DOM rendered, now initializing UI components...');

// Wait for next tick to ensure DOM is fully ready
setTimeout(() => {
  console.log('🔵 [MAIN] Initializing components with fresh DOM references...');
  
  const canvas = new SimulationCanvas('simulation-canvas');
  const stats = new SimulationStats('simulation-stats');
  
  console.log('✓ [MAIN] UI components initialized:', { canvas, stats });

  function updateDebugPanel(message: string) {
    const debugEl = document.getElementById('debug-output');
    if (debugEl) {
      const timestamp = new Date().toLocaleTimeString();
      debugEl.innerHTML = `[${timestamp}] ${message}<br>` + debugEl.innerHTML;
    }
  }

  function updateStatus(message: string, type: 'info' | 'success' | 'error' = 'info') {
    const statusEl = document.getElementById('worker-status');
    if (statusEl) {
      const icon = type === 'success' ? '✓' : type === 'error' ? '🔴' : '🔵';
      statusEl.textContent = `${icon} ${message}`;
      statusEl.style.color = type === 'error' ? '#ff6b6b' : '#ffffff';
    }
  }

  function updateUI(data: any) {
    console.log('🟢🟢🟢 [MAIN] ========== updateUI CALLED ==========');
    console.log('🟢🟢🟢 [MAIN] Raw data received:', JSON.stringify(data, null, 2));
    
    updateDebugPanel(`RAW DATA: ${JSON.stringify(data)}`);
    
    if (!data) {
      console.warn('⚠ [MAIN] updateUI received null/undefined data');
      updateDebugPanel('⚠ WARNING: Received null/undefined data');
      return;
    }
    
    // DIAGNOSTIC: Log each extraction step
    console.log('🔍 [MAIN] Extracting JOBS.TOTAL:', data.JOBS?.TOTAL);
    console.log('🔍 [MAIN] Extracting JOBS.COMPLETED:', data.JOBS?.COMPLETED);
    console.log('🔍 [MAIN] Extracting JOBS.TIME(secs):', data.JOBS?.['TIME(secs)']);
    console.log('🔍 [MAIN] Extracting QC.ACTIVE:', data.QC?.ACTIVE);
    console.log('🔍 [MAIN] Extracting HT.MOVING:', data.HT?.MOVING);
    console.log('🔍 [MAIN] Extracting YARD.ACTIVE:', data.YARD?.ACTIVE);
    
    // FIX: Correctly map Python stats to UI format
    const totalJobs = data.JOBS?.TOTAL || 20000;
    const completedJobs = data.JOBS?.COMPLETED || 0;
    const currentTime = data.JOBS?.['TIME(secs)'] || 0;
    
    console.log('🔍 [MAIN] After extraction - totalJobs:', totalJobs, 'completedJobs:', completedJobs, 'currentTime:', currentTime);
    
    const statsData = {
      completedJobs: completedJobs,
      remainingJobs: totalJobs - completedJobs,
      currentTime: currentTime,
      activeQC: data.QC?.ACTIVE || 0,
      idleQC: data.QC?.IDLE || 8,
      movingHT: data.HT?.MOVING || 0,
      nonMovingHT: data.HT?.['NON-MOVING'] || 80,
      activeYard: data.YARD?.ACTIVE || 0,
      idleYard: data.YARD?.IDLE || 16
    };
    
    console.log('🟢🟢🟢 [MAIN] Transformed statsData:', JSON.stringify(statsData, null, 2));
    updateDebugPanel(`TRANSFORMED: completed=${statsData.completedJobs}, time=${statsData.currentTime}, activeQC=${statsData.activeQC}, movingHT=${statsData.movingHT}`);
    
    console.log('🟢🟢🟢 [MAIN] Calling stats.updateStats()...');
    
    try {
      stats.updateStats(statsData);
      console.log('✓✓✓ [MAIN] stats.updateStats() completed');
    } catch (error) {
      console.error('🔴 [MAIN] Error in stats.updateStats():', error);
      updateDebugPanel(`🔴 ERROR in stats.updateStats(): ${error}`);
    }
    
    console.log('🟢🟢🟢 [MAIN] Calling canvas.updateVisualization()...');
    
    try {
      canvas.updateVisualization(statsData);
      console.log('✓✓✓ [MAIN] canvas.updateVisualization() completed');
    } catch (error) {
      console.error('🔴 [MAIN] Error in canvas.updateVisualization():', error);
      updateDebugPanel(`🔴 ERROR in canvas.updateVisualization(): ${error}`);
    }
    
    updateStatus(`Running: ${completedJobs}/${totalJobs} jobs (${currentTime}s)`, 'info');
    console.log('🟢🟢🟢 [MAIN] ========== updateUI COMPLETE ==========');
  }

  // Initialize Pyodide worker
  console.log('🔵 [MAIN] Creating Pyodide worker...');
  updateStatus('Creating Pyodide worker...');

  try {
    worker = new Worker(new URL('./pyodide-worker.ts', import.meta.url), { type: 'module' });
    console.log('✓ [MAIN] Worker created successfully');
    
    // SET UP MESSAGE HANDLER IMMEDIATELY
    console.log('🔵 [MAIN] Setting up worker.onmessage handler...');
    worker.onmessage = (e: MessageEvent) => {
      console.log('🟢🟢🟢 [MAIN] ========== WORKER MESSAGE RECEIVED IN MAIN THREAD ==========');
      console.log('🟢🟢🟢 [MAIN] MessageEvent object:', e);
      console.log('🟢🟢🟢 [MAIN] e.data:', e.data);
      console.log('🟢🟢🟢 [MAIN] e.data type:', typeof e.data);
      console.log('🟢🟢🟢 [MAIN] e.data stringified:', JSON.stringify(e.data, null, 2));
      
      const { type, data, error, message } = e.data;
      
      console.log('🟢 [MAIN] Message type:', type);
      
      if (type === 'test') {
        console.log('✓ [MAIN] Test message received:', message);
        updateDebugPanel(`✓ TEST: ${message}`);
      } else if (type === 'status') {
        console.log('✓ [MAIN] Status update:', message);
        updateStatus(message, 'info');
        updateDebugPanel(`📊 STATUS: ${message}`);
      } else if (type === 'ready') {
        console.log('✓ [MAIN] Pyodide worker ready');
        pyodideReady = true;
        updateStatus('Pyodide ready! Upload CSV to start.', 'success');
        updateDebugPanel('✓ Pyodide worker ready');
      } else if (type === 'stats') {
        console.log('🟢🟢🟢 [MAIN] STATS MESSAGE RECEIVED!');
        console.log('🟢🟢🟢 [MAIN] Stats data:', JSON.stringify(data, null, 2));
        updateDebugPanel(`📊 STATS MESSAGE: ${JSON.stringify(data)}`);
        updateUI(data);
      } else if (type === 'complete') {
        console.log('✓ [MAIN] Simulation complete');
        simulationRunning = false;
        updateUI(data);
        updateStatus('Simulation completed!', 'success');
        updateDebugPanel('✓ Simulation completed');
        
        // Try to read output.csv from Pyodide virtual filesystem
        if (worker) {
          worker.postMessage({ type: 'get_output' });
        }
      } else if (type === 'output_csv') {
        console.log('✓ [MAIN] Received output CSV');
        // Download the output CSV
        const blob = new Blob([data], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'output.csv';
        a.click();
        URL.revokeObjectURL(url);
        alert('Simulation completed! Output CSV downloaded.');
      } else if (type === 'error') {
        console.error('🔴 [MAIN] Worker error:', error);
        simulationRunning = false;
        updateStatus(`Error: ${error}`, 'error');
        updateDebugPanel(`🔴 ERROR: ${error}`);
        alert('Error: ' + error);
      } else {
        console.warn('⚠ [MAIN] Unknown message type:', type);
      }
      
      console.log('🟢 [MAIN] ========== WORKER MESSAGE HANDLER COMPLETE ==========');
    };
    console.log('✓ [MAIN] worker.onmessage handler set up');

    worker.onerror = (error) => {
      console.error('🔴 [MAIN] Worker error event:', error);
      updateStatus('Worker error - check console', 'error');
      updateDebugPanel(`🔴 Worker error: ${error}`);
    };

    updateStatus('Worker created, loading Pyodide...');
    
    // NOW send init message after handler is set up
    console.log('🔵 [MAIN] Sending init message to worker...');
    worker.postMessage({ type: 'init' });
    console.log('✓ [MAIN] Init message sent');
    
  } catch (error) {
    console.error('🔴 [MAIN] Failed to create worker:', error);
    updateStatus('Failed to create worker - check console', 'error');
  }

  new CSVUploader('csv-uploader', async (data) => {
    console.log('✓ [MAIN] CSV loaded into memory');
    console.log(`  Headers: ${data.headers.join(', ')}`);
    console.log(`  Rows: ${data.rows.length}`);
    updateStatus(`CSV loaded: ${data.rows.length} rows`, 'success');
    updateDebugPanel(`✓ CSV loaded: ${data.rows.length} rows`);
  });

  new SimulationControls('simulation-controls', {
    onStart: async () => {
      console.log('🔵 [MAIN] Start button clicked');
      
      if (!pyodideReady) {
        alert('Pyodide is still loading. Please wait...');
        console.warn('⚠ [MAIN] Pyodide not ready yet');
        return;
      }
      
      if (simulationRunning) {
        alert('Simulation already running!');
        console.warn('⚠ [MAIN] Simulation already running');
        return;
      }
      
      const csvContent = localStorage.getItem('csv_content');
      if (!csvContent) {
        alert('Please upload a CSV file first!');
        console.warn('⚠ [MAIN] No CSV content in localStorage');
        return;
      }
      
      console.log('🔵 [MAIN] Starting simulation...');
      updateStatus('Starting simulation...', 'info');
      updateDebugPanel('🔵 Starting simulation...');
      
      simulationRunning = true;
      
      console.log('🔵 [MAIN] Posting start message to worker...');
      worker?.postMessage({ 
        type: 'start', 
        csvContent,
        env: {
          JOB_PLANNER_FEATURES: 'ga_diversity,ht_future_penalty'
        }
      });
      console.log('✓ [MAIN] Start message posted');
    },
    onPause: async () => {
      console.log('🔵 [MAIN] Pause button clicked');
      simulationRunning = false;
      worker?.postMessage({ type: 'stop' });
      updateStatus('Simulation paused', 'info');
      updateDebugPanel('⏸ Simulation paused');
    },
    onReset: async () => {
      console.log('🔵 [MAIN] Reset button clicked');
      simulationRunning = false;
      worker?.postMessage({ type: 'stop' });
      
      stats.updateStats({
        completedJobs: 0,
        remainingJobs: 20000,
        currentTime: 0,
        activeQC: 0,
        idleQC: 8,
        movingHT: 0,
        nonMovingHT: 80,
        activeYard: 0,
        idleYard: 16
      });
      
      canvas.updateVisualization({
        activeQC: 0,
        movingHT: 0,
        activeYard: 0
      });
      
      updateStatus('Simulation reset', 'success');
      updateDebugPanel('🔄 Simulation reset');
    }
  });

  console.log('✓ [MAIN] Application initialized');
}, 0);
