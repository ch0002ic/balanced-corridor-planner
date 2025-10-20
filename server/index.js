import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// CRITICAL: Enable CORS FIRST before any other middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    cb(null, dataDir);
  },
  filename: (req, file, cb) => {
    cb(null, 'input.csv');
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

let simulationProcess = null;
let simulationData = {
  isRunning: false,
  currentTime: Date.now(),
  htPositions: {},
  terminalStats: {},
  logs: []
};

// CRITICAL: Health check endpoint - MUST be first
app.get('/api/health', (req, res) => {
  console.log('Health check requested');
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Upload CSV endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    console.log('Upload request received');
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('File uploaded:', req.file.filename);
    res.json({
      message: 'File uploaded successfully',
      filename: req.file.filename,
      size: req.file.size
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// Start simulation endpoint
app.post('/api/simulation/start', (req, res) => {
  console.log('Start simulation requested');
  
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
  console.log('Stop simulation requested');
  
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
  console.log('Status requested');
  res.json({
    isRunning: simulationData.isRunning,
    currentTime: simulationData.currentTime,
    htPositions: simulationData.htPositions,
    terminalStats: simulationData.terminalStats
  });
});

// Get simulation logs
app.get('/api/simulation/logs', (req, res) => {
  console.log('Logs requested');
  res.json({
    logs: simulationData.logs.slice(-100)
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(60));
  console.log('✓ Backend API server running');
  console.log(`✓ Listening on: http://localhost:${PORT}`);
  console.log(`✓ Health check: http://localhost:${PORT}/api/health`);
  console.log('='.repeat(60));
});
