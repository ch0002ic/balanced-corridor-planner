import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let simulationProcess = null;
let simulationData = {
  isRunning: false,
  currentTime: Date.now(),
  htPositions: {},
  terminalStats: {},
  logs: []
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start simulation endpoint
app.post('/api/simulation/start', (req, res) => {
  if (simulationProcess) {
    return res.status(400).json({ error: 'Simulation already running' });
  }

  const pythonPath = 'python3';
  const scriptPath = path.join(__dirname, '..', 'cli.py');

  try {
    simulationProcess = spawn(pythonPath, [scriptPath], {
      cwd: path.join(__dirname, '..')
    });

    simulationProcess.stdout.on('data', (data) => {
      const output = data.toString();
      simulationData.logs.push(output.trim());
      if (simulationData.logs.length > 1000) {
        simulationData.logs = simulationData.logs.slice(-1000);
      }
      console.log(`Simulation: ${output}`);
    });

    simulationProcess.stderr.on('data', (data) => {
      const error = data.toString();
      simulationData.logs.push(`ERROR: ${error.trim()}`);
      console.error(`Simulation error: ${error}`);
    });

    simulationProcess.on('close', (code) => {
      console.log(`Simulation process exited with code ${code}`);
      simulationData.isRunning = false;
      simulationProcess = null;
    });

    simulationData.isRunning = true;
    simulationData.currentTime = Date.now();
    
    res.json({ message: 'Simulation started successfully', status: 'running' });
  } catch (error) {
    console.error('Failed to start simulation:', error);
    res.status(500).json({ error: 'Failed to start simulation process' });
  }
});

// Stop simulation endpoint
app.post('/api/simulation/stop', (req, res) => {
  if (!simulationProcess) {
    return res.status(400).json({ error: 'No simulation running' });
  }

  try {
    simulationProcess.kill('SIGTERM');
    simulationProcess = null;
    simulationData.isRunning = false;

    res.json({ message: 'Simulation stopped successfully', status: 'stopped' });
  } catch (error) {
    console.error('Failed to stop simulation:', error);
    res.status(500).json({ error: 'Failed to stop simulation process' });
  }
});

// Get simulation status
app.get('/api/simulation/status', (req, res) => {
  res.json({
    isRunning: simulationData.isRunning,
    currentTime: simulationData.currentTime,
    htPositions: simulationData.htPositions,
    terminalStats: simulationData.terminalStats
  });
});

// Get simulation logs
app.get('/api/simulation/logs', (req, res) => {
  res.json({
    logs: simulationData.logs.slice(-100)
  });
});

app.listen(PORT, () => {
  console.log(`✓ Backend API server running on http://localhost:${PORT}`);
  console.log(`✓ Health check: http://localhost:${PORT}/api/health`);
});
