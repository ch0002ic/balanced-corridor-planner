import './style.css';
import { SimulationCanvas } from './components/SimulationCanvas';
import { SimulationStats } from './components/SimulationStats';
import { SimulationControls } from './components/SimulationControls';
import { CSVUploader } from './components/CSVUploader';
import { SimulationWebSocket } from './services/SimulationWebSocket';

// Initialize components
const canvas = new SimulationCanvas('simulation-canvas');
const stats = new SimulationStats('simulation-stats');
const controls = new SimulationControls('simulation-controls');
const uploader = new CSVUploader('csv-uploader');

// Initialize WebSocket connection
const ws = new SimulationWebSocket('ws://localhost:8765');

// Subscribe to simulation updates
ws.subscribe((update) => {
  console.log('🎯 [MAIN] Processing update:', update.type);
  
  switch (update.type) {
    case 'simulation_start':
      console.log('🚀 [MAIN] Simulation started:', update.data);
      controls.setRunning(true);
      break;
      
    case 'simulation_progress':
      console.log('📊 [MAIN] Updating stats with:', update.data);
      
      // Update statistics
      stats.updateStats({
        completedJobs: update.data.completedJobs,
        remainingJobs: update.data.remainingJobs,
        currentTime: update.data.currentTime,
        activeQC: update.data.activeQC,
        idleQC: update.data.idleQC,
        movingHT: update.data.movingHT,
        nonMovingHT: update.data.nonMovingHT,
        activeYard: update.data.activeYard,
        idleYard: update.data.idleYard
      });
      
      // Update canvas if needed
      canvas.updateProgress(update.data.progress || 0);
      break;
      
    case 'simulation_complete':
      console.log('✅ [MAIN] Simulation completed:', update.data);
      controls.setRunning(false);
      break;
      
    case 'pong':
      console.log('🏓 [MAIN] Connection alive');
      break;
  }
});

// Connect to WebSocket server
console.log('🔌 [MAIN] Connecting to WebSocket server...');
ws.connect();

// Handle control events
controls.onStart(() => {
  console.log('▶️ [MAIN] Start button clicked');
  alert('Please run: python3 cli_realtime.py\nThe simulation will start and updates will appear here automatically.');
});

controls.onPause(() => {
  console.log('⏸️ [MAIN] Pause button clicked');
});

controls.onReset(() => {
  console.log('🔄 [MAIN] Reset button clicked');
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
  canvas.updateProgress(0);
});

// Handle file upload
uploader.onFileSelect((file) => {
  console.log('📁 [MAIN] File selected:', file.name);
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  ws.disconnect();
});

console.log('✅ [MAIN] Application initialized');
console.log('📡 [MAIN] Waiting for simulation updates from Python CLI...');
console.log('💡 [MAIN] Run: python3 cli_realtime.py');
