// Load Pyodide from CDN using dynamic import for ES modules
const pyodideIndexURL = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/';

let pyodide: any = null;
let pyodideReady = false;

async function loadPyodideAndPackages() {
  try {
    // Load Pyodide script dynamically
    const script = document.createElement('script');
    script.src = `${pyodideIndexURL}pyodide.js`;
    
    // For worker context, we need to use a different approach
    // @ts-ignore
    const loadPyodide = (await import(`${pyodideIndexURL}pyodide.mjs`)).loadPyodide;
    
    pyodide = await loadPyodide({
      indexURL: pyodideIndexURL,
    });
    
    await pyodide.loadPackage(['numpy', 'micropip']);
    pyodideReady = true;
    
    self.postMessage({ type: 'ready' });
    
    return pyodide;
  } catch (error: any) {
    self.postMessage({ type: 'error', error: error.message });
    throw error;
  }
}

const pyodideReadyPromise = loadPyodideAndPackages();

self.onmessage = async (event) => {
  const { type, csvContent, env } = event.data;
  
  if (type === 'init') {
    await pyodideReadyPromise;
    return;
  }
  
  if (type === 'start') {
    await pyodideReadyPromise;
    
    try {
      // Write CSV to virtual filesystem
      pyodide.FS.writeFile('/input.csv', csvContent);
      
      // Set environment variables
      if (env) {
        for (const [key, value] of Object.entries(env)) {
          pyodide.runPython(`import os; os.environ['${key}'] = '${value}'`);
        }
      }
      
      // Load and run simulation
      const simulationCode = await fetch('/simulation.py').then(r => r.text());
      const engineCode = await fetch('/engine.py').then(r => r.text());
      const jobPlannerCode = await fetch('/job_planner.py').then(r => r.text());
      
      pyodide.runPython(engineCode);
      pyodide.runPython(jobPlannerCode);
      pyodide.runPython(simulationCode);
      
      // Run simulation with progress updates
      const result = await pyodide.runPythonAsync(`
import simulation
import json

def run_with_updates():
    sim = simulation.Simulation('/input.csv')
    
    while not sim.is_complete():
        sim.step()
        
        if sim.current_time % 100 == 0:  # Update every 100 time units
            stats = sim.get_stats()
            return json.dumps(stats)
    
    final_stats = sim.get_stats()
    sim.write_output('/output.csv')
    return json.dumps(final_stats)

run_with_updates()
      `);
      
      const stats = JSON.parse(result);
      self.postMessage({ type: 'stats', data: stats });
      
      // Read output file
      const outputContent = pyodide.FS.readFile('/output.csv', { encoding: 'utf8' });
      self.postMessage({ type: 'complete', data: stats });
      self.postMessage({ type: 'output_csv', data: outputContent });
      
    } catch (error: any) {
      self.postMessage({ type: 'error', error: error.message });
    }
  }
  
  if (type === 'stop') {
    // Stop simulation
    self.postMessage({ type: 'status', message: 'Simulation stopped' });
  }
  
  if (type === 'get_output') {
    try {
      const outputContent = pyodide.FS.readFile('/output.csv', { encoding: 'utf8' });
      self.postMessage({ type: 'output_csv', data: outputContent });
    } catch (error: any) {
      self.postMessage({ type: 'error', error: 'No output file found' });
    }
  }
};
