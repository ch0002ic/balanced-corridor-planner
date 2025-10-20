import { spawn } from 'child_process';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Node.js script to run the Python simulation
 * This bridges the TypeScript frontend with the Python backend
 */

const DATA_DIR = join(process.cwd(), 'data');
const INPUT_FILE = join(DATA_DIR, 'input.csv');
const CLI_SCRIPT = join(process.cwd(), 'cli.py');

function ensureDataDirectory() {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    console.log(`Data directory created/verified: ${DATA_DIR}`);
  } catch (error) {
    console.error('Error creating data directory:', error);
  }
}

function saveCSVFromLocalStorage() {
  try {
    // This will be called with CSV content from stdin
    // For now, we'll create a placeholder
    ensureDataDirectory();
    
    // Check if we have CSV content from stdin
    let csvContent = '';
    
    return new Promise((resolve, reject) => {
      process.stdin.on('data', (chunk) => {
        csvContent += chunk.toString();
      });
      
      process.stdin.on('end', () => {
        if (csvContent) {
          writeFileSync(INPUT_FILE, csvContent, 'utf-8');
          console.log(`CSV saved to: ${INPUT_FILE}`);
          resolve(true);
        } else {
          reject(new Error('No CSV content provided'));
        }
      });
      
      // Timeout if no data received
      setTimeout(() => {
        if (!csvContent) {
          reject(new Error('Timeout waiting for CSV content'));
        }
      }, 5000);
    });
  } catch (error) {
    console.error('Error saving CSV:', error);
    throw error;
  }
}

function runSimulation() {
  return new Promise((resolve, reject) => {
    // Check if input file exists
    if (!existsSync(INPUT_FILE)) {
      reject(new Error('Input CSV file not found. Please upload a CSV file first.'));
      return;
    }

    // Check if CLI script exists
    if (!existsSync(CLI_SCRIPT)) {
      reject(new Error('Simulation CLI script not found.'));
      return;
    }

    console.log('Starting Python simulation...');
    console.log(`Input file: ${INPUT_FILE}`);

    // Spawn Python process
    const pythonProcess = spawn('python3', [CLI_SCRIPT]);

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log(output);
    });

    pythonProcess.stderr.on('data', (data) => {
      const error = data.toString();
      stderr += error;
      console.error(error);
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        console.log('Simulation completed successfully');
        resolve({ success: true, output: stdout });
      } else {
        console.error(`Simulation failed with code ${code}`);
        reject(new Error(`Simulation failed: ${stderr}`));
      }
    });

    pythonProcess.on('error', (error) => {
      console.error('Failed to start simulation:', error);
      reject(error);
    });
  });
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Check if we're receiving CSV content via stdin
  if (process.argv.includes('--save-csv')) {
    saveCSVFromLocalStorage()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  } else {
    runSimulation()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error(error);
        process.exit(1);
      });
  }
}

export { runSimulation, saveCSVFromLocalStorage };
