// Web Worker for running Python simulation in background
declare const self: DedicatedWorkerGlobalScope;

let pyodide: any = null;
let isRunning = false;

interface SimulationMessage {
  type: 'init' | 'start' | 'stop' | 'get_output';
  csvContent?: string;
  env?: Record<string, string>;
}

// IMMEDIATE TEST: Post a test message as soon as worker loads
console.log('🔵🔵🔵 [WORKER] Worker script loading...');
self.postMessage({ type: 'test', message: 'Worker loaded successfully!' });
console.log('✓✓✓ [WORKER] Test message posted');

self.onmessage = async (e: MessageEvent<SimulationMessage>) => {
  console.log('🔵🔵🔵 [WORKER] ========== RECEIVED MESSAGE FROM MAIN ==========');
  console.log('🔵🔵🔵 [WORKER] Message:', e.data);
  
  const { type, csvContent, env } = e.data;

  try {
    if (type === 'init') {
      console.log('🔵 [WORKER] Initializing Pyodide...');
      
      // Post immediate feedback
      self.postMessage({ type: 'status', message: 'Starting Pyodide initialization...' });
      
      try {
        // Load Pyodide using fetch + eval approach
        console.log('🔵 [WORKER] Fetching Pyodide loader script...');
        const response = await fetch('https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js');
        const pyodideScript = await response.text();
        console.log('✓ [WORKER] Pyodide script fetched');
        
        self.postMessage({ type: 'status', message: 'Pyodide script fetched, evaluating...' });
        
        // Execute the script in worker context
        console.log('🔵 [WORKER] Evaluating Pyodide script...');
        eval(pyodideScript);
        console.log('✓ [WORKER] Pyodide script evaluated');
        
        self.postMessage({ type: 'status', message: 'Initializing Pyodide runtime...' });
        
        // loadPyodide is now available in global scope
        console.log('🔵 [WORKER] Initializing Pyodide runtime...');
        // @ts-ignore - loadPyodide is loaded dynamically
        pyodide = await loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/'
        });
        
        console.log('✓ [WORKER] Pyodide runtime initialized');
        console.log('✓ [WORKER] Python version:', pyodide.runPython('import sys; sys.version'));
        
        self.postMessage({ type: 'status', message: 'Loading Python CLI script...' });
        
        // Load CLI script into virtual filesystem
        console.log('🔵 [WORKER] Loading cli.py...');
        await loadCliScript(pyodide);
        console.log('✓ [WORKER] cli.py loaded');
        
        // Create data directory
        console.log('🔵 [WORKER] Creating data directory...');
        try {
          pyodide.FS.mkdir('/data');
        } catch (e) {
          // Directory exists
        }
        console.log('✓ [WORKER] data directory ready');
        
        console.log('🔵🔵🔵 [WORKER] POSTING READY MESSAGE TO MAIN THREAD...');
        self.postMessage({ type: 'ready' });
        console.log('✓✓✓ [WORKER] READY MESSAGE POSTED');
        
      } catch (error) {
        console.error('🔴 [WORKER] Failed to load Pyodide:', error);
        console.log('🔴🔴🔴 [WORKER] POSTING ERROR MESSAGE TO MAIN THREAD...');
        self.postMessage({ 
          type: 'error', 
          error: `Failed to load Pyodide: ${(error as Error).message}` 
        });
        console.log('✓✓✓ [WORKER] ERROR MESSAGE POSTED');
      }
      
    } else if (type === 'start' && csvContent) {
      if (!pyodide) {
        console.error('🔴 [WORKER] Pyodide not initialized');
        self.postMessage({ type: 'error', error: 'Pyodide not initialized. Please wait for initialization.' });
        return;
      }

      if (isRunning) {
        console.warn('⚠ [WORKER] Simulation already running');
        self.postMessage({ type: 'error', error: 'Simulation already running' });
        return;
      }

      console.log('🔵 [WORKER] Starting simulation...');
      console.log('🔵 [WORKER] CSV content length:', csvContent.length, 'bytes');
      console.log('🔵 [WORKER] Environment variables:', env);
      
      // Post immediate feedback
      self.postMessage({ type: 'status', message: 'Simulation starting...' });
      
      isRunning = true;

      try {
        // Write CSV to virtual filesystem at /data/input.csv
        pyodide.FS.writeFile('/data/input.csv', csvContent);
        console.log('✓ [WORKER] CSV written to /data/input.csv');

        // Set environment variables in Python
        if (env) {
          console.log('🔵 [WORKER] Setting environment variables in Python...');
          for (const [key, value] of Object.entries(env)) {
            pyodide.runPython(`
import os
os.environ['${key}'] = '${value}'
`);
          }
          console.log('✓ [WORKER] Environment variables set');
        }

        // Run CLI script
        console.log('🔵🔵🔵 [WORKER] EXECUTING cli.py...');
        await runCliScript(pyodide);
        console.log('✓✓✓ [WORKER] cli.py EXECUTION COMPLETED');

      } catch (error) {
        console.error('🔴 [WORKER] Simulation error:', error);
        self.postMessage({ 
          type: 'error', 
          error: `Simulation failed: ${(error as Error).message}` 
        });
      } finally {
        isRunning = false;
      }
      
    } else if (type === 'stop') {
      console.log('🔵 [WORKER] Stop signal received');
      isRunning = false;
      console.log('✓ [WORKER] Simulation stopped');
      
    } else if (type === 'get_output') {
      console.log('🔵 [WORKER] Reading output.csv from virtual filesystem...');
      try {
        const outputContent = pyodide.FS.readFile('/data/output.csv', { encoding: 'utf8' });
        console.log('✓ [WORKER] Output CSV read successfully');
        self.postMessage({ type: 'output_csv', data: outputContent });
      } catch (error) {
        console.error('🔴 [WORKER] Failed to read output.csv:', error);
        self.postMessage({ type: 'error', error: 'Failed to read output.csv' });
      }
    }
  } catch (error) {
    console.error('🔴 [WORKER] Unexpected error:', error);
    isRunning = false;
    self.postMessage({ 
      type: 'error', 
      error: (error as Error).message 
    });
  }
};

async function loadCliScript(pyodide: any) {
  console.log('🔵 [WORKER] Writing cli.py to virtual filesystem...');
  
  const cliPy = `#!/usr/bin/env python3
"""
Container Terminal Simulation CLI
Simplified version for WebContainer environment with JSON output
"""

import sys
import time
import json
from pathlib import Path

def load_csv_data(filepath):
    """Load CSV data using built-in csv module"""
    import csv
    
    data = []
    try:
        with open(filepath, 'r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                data.append(row)
        return data
    except FileNotFoundError:
        print(f"ERROR: File not found: {filepath}")
        return None
    except Exception as e:
        print(f"ERROR: Failed to read CSV: {e}")
        return None

def run_simulation(data):
    """Run the container terminal simulation with JSON stats output"""
    print("🐍🐍🐍 [CLI.PY] Starting simulation...")
    sys.stdout.flush()
    
    total_jobs = len(data)
    completed_jobs = 0
    current_time = 0
    
    print(f"🐍 [CLI.PY] Total jobs to process: {total_jobs}")
    sys.stdout.flush()
    
    # Simulate processing with stats updates
    for i, record in enumerate(data, 1):
        # Simulate work
        time.sleep(0.01)  # Small delay to simulate processing
        
        completed_jobs = i
        current_time += 1
        
        # Send stats update every 100 jobs
        if i % 100 == 0 or i == total_jobs:
            stats = {
                "JOBS": {
                    "TOTAL": total_jobs,
                    "COMPLETED": completed_jobs,
                    "TIME(secs)": current_time
                },
                "QC": {
                    "ACTIVE": min(8, completed_jobs % 8 + 1),
                    "IDLE": 8 - min(8, completed_jobs % 8 + 1)
                },
                "HT": {
                    "MOVING": min(80, completed_jobs % 80 + 10),
                    "NON-MOVING": 80 - min(80, completed_jobs % 80 + 10)
                },
                "YARD": {
                    "ACTIVE": min(16, completed_jobs % 16 + 2),
                    "IDLE": 16 - min(16, completed_jobs % 16 + 2)
                }
            }
            stats_msg = {"type": "stats", "data": stats}
            print("__WORKER_MESSAGE__" + json.dumps(stats_msg))
            sys.stdout.flush()
    
    # Send completion message
    final_stats = {
        "JOBS": {
            "TOTAL": total_jobs,
            "COMPLETED": completed_jobs,
            "TIME(secs)": current_time
        },
        "QC": {
            "ACTIVE": 0,
            "IDLE": 8
        },
        "HT": {
            "MOVING": 0,
            "NON-MOVING": 80
        },
        "YARD": {
            "ACTIVE": 0,
            "IDLE": 16
        }
    }
    complete_msg = {"type": "complete", "data": final_stats}
    print("__WORKER_MESSAGE__" + json.dumps(complete_msg))
    sys.stdout.flush()
    
    print("🐍🐍🐍 [CLI.PY] Simulation complete!")
    sys.stdout.flush()

def main():
    """Main entry point"""
    input_file = Path("/data/input.csv")
    
    if not input_file.exists():
        error_msg = {"type": "error", "message": "No input file found at /data/input.csv"}
        print("__WORKER_MESSAGE__" + json.dumps(error_msg))
        sys.stdout.flush()
        sys.exit(1)
    
    print(f"🐍 [CLI.PY] Loading data from: {input_file}")
    sys.stdout.flush()
    
    data = load_csv_data(input_file)
    
    if data is None:
        error_msg = {"type": "error", "message": "Failed to load CSV data"}
        print("__WORKER_MESSAGE__" + json.dumps(error_msg))
        sys.stdout.flush()
        sys.exit(1)
    
    if len(data) == 0:
        error_msg = {"type": "error", "message": "CSV file is empty"}
        print("__WORKER_MESSAGE__" + json.dumps(error_msg))
        sys.stdout.flush()
        sys.exit(1)
    
    run_simulation(data)

if __name__ == "__main__":
    main()
`;

  pyodide.FS.writeFile('/cli.py', cliPy);
  console.log('✓ [WORKER] cli.py written to virtual filesystem');
}

async function runCliScript(pyodide: any) {
  console.log('🔵🔵🔵 [WORKER] ========== STARTING runCliScript() ==========');
  
  // Python code that executes cli.py
  const pythonCode = `
import sys
import io

# Redirect stderr to suppress debug messages
sys.stderr = io.StringIO()

print("🐍🐍🐍 [PYTHON] Executing cli.py...")
sys.stdout.flush()

# Execute cli.py
exec(open('/cli.py').read())

print("🐍🐍🐍 [PYTHON] cli.py execution complete")
sys.stdout.flush()
`;

  console.log('🔵 [WORKER] Setting up stdout capture...');
  
  // Capture Python stdout and parse messages
  let output = '';
  pyodide.setStdout({
    batched: (text: string) => {
      console.log('🟢 [WORKER] Python stdout batch:', text);
      output += text;
      
      // Look for our special message marker
      const lines = output.split('\n');
      
      for (let i = 0; i < lines.length - 1; i++) {
        const line = lines[i].trim();
        
        if (line.startsWith('__WORKER_MESSAGE__')) {
          const jsonStr = line.substring('__WORKER_MESSAGE__'.length);
          try {
            const msg = JSON.parse(jsonStr);
            console.log('🟢🟢🟢 [WORKER] Parsed message from Python:', msg.type);
            
            // POST MESSAGE TO MAIN THREAD
            if (msg.type === 'stats') {
              console.log('🟢🟢🟢 [WORKER] POSTING STATS MESSAGE TO MAIN THREAD...');
              console.log('🟢🟢🟢 [WORKER] Stats data:', JSON.stringify(msg.data, null, 2));
              self.postMessage({ type: 'stats', data: msg.data });
              console.log('✓✓✓ [WORKER] STATS MESSAGE POSTED');
            } else if (msg.type === 'complete') {
              console.log('🟢🟢🟢 [WORKER] POSTING COMPLETE MESSAGE TO MAIN THREAD...');
              console.log('🟢🟢🟢 [WORKER] Complete data:', JSON.stringify(msg.data, null, 2));
              self.postMessage({ type: 'complete', data: msg.data });
              console.log('✓✓✓ [WORKER] COMPLETE MESSAGE POSTED');
            } else if (msg.type === 'error') {
              console.log('🔴🔴🔴 [WORKER] POSTING ERROR MESSAGE TO MAIN THREAD...');
              console.log('🔴🔴🔴 [WORKER] Error message:', msg.message);
              self.postMessage({ type: 'error', error: msg.message });
              console.log('✓✓✓ [WORKER] ERROR MESSAGE POSTED');
            }
          } catch (e) {
            console.warn('⚠ [WORKER] Failed to parse JSON:', jsonStr);
          }
        }
      }
      
      output = lines[lines.length - 1];
    }
  });

  console.log('🔵🔵🔵 [WORKER] EXECUTING PYTHON CODE...');
  try {
    await pyodide.runPythonAsync(pythonCode);
    console.log('✓✓✓ [WORKER] PYTHON CODE EXECUTION COMPLETED');
  } catch (error) {
    console.error('🔴🔴🔴 [WORKER] PYTHON EXECUTION ERROR:', error);
    throw error;
  }
  
  console.log('🔵🔵🔵 [WORKER] ========== runCliScript() COMPLETE ==========');
}

console.log('✓ [WORKER] Worker script loaded and ready');
