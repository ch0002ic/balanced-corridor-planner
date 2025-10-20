import express from 'express';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const app = express();

app.use(express.json());
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = join(projectRoot, 'uploads');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      cb(null, `upload-${Date.now()}.csv`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }
});

let simProcess = null;
let simRunning = false;

app.get('/api/test', (req, res) => {
  res.json({ message: 'Server working' });
});

app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file' });
    }
    
    const target = join(projectRoot, 'input.csv');
    fs.renameSync(req.file.path, target);
    
    res.json({ success: true, message: 'Uploaded' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/simulation/start', (req, res) => {
  try {
    if (simRunning) {
      return res.status(400).json({ error: 'Already running' });
    }
    
    const input = join(projectRoot, 'input.csv');
    if (!fs.existsSync(input)) {
      return res.status(400).json({ error: 'No CSV' });
    }
    
    simProcess = spawn('python3', ['simulation_runner.py'], { cwd: projectRoot });
    simRunning = true;
    
    simProcess.on('close', () => {
      simRunning = false;
      simProcess = null;
    });
    
    res.json({ success: true });
  } catch (err) {
    simRunning = false;
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/simulation/stop', (req, res) => {
  if (simProcess) {
    simProcess.kill();
  }
  simRunning = false;
  simProcess = null;
  res.json({ success: true });
});

app.get('/api/simulation/status', (req, res) => {
  res.json({ isRunning: simRunning });
});

async function start() {
  try {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    
    app.use(vite.middlewares);
    
    app.listen(5173, '0.0.0.0', () => {
      console.log('✓ Server on http://localhost:5173');
    });
  } catch (err) {
    console.error('Failed:', err);
    process.exit(1);
  }
}

start();
