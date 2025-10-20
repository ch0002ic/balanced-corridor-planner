import './style.css'
import { apiClient } from './api/client'

const app = document.querySelector<HTMLDivElement>('#app')!

app.innerHTML = `
  <div class="container">
    <h1>Codechella TCW Academy</h1>
    <p class="subtitle">Container Terminal Simulation System</p>
    
    <div class="status-panel">
      <h2>System Status</h2>
      <div id="status" class="status-indicator">
        <span class="status-dot"></span>
        <span id="status-text">Checking connection...</span>
      </div>
    </div>

    <div class="upload-panel">
      <h2>Upload Input Data</h2>
      <div class="upload-section">
        <input type="file" id="csv-input" accept=".csv" style="display: none;" />
        <button id="upload-btn" class="btn btn-upload">
          📁 Upload CSV File
        </button>
        <div id="upload-status" class="upload-info"></div>
      </div>
    </div>

    <div class="control-panel">
      <h2>Simulation Controls</h2>
      <div class="button-group">
        <button id="start-btn" class="btn btn-primary">Start Simulation</button>
        <button id="stop-btn" class="btn btn-danger" disabled>Stop Simulation</button>
      </div>
      <div id="sim-status" class="sim-info"></div>
    </div>

    <div class="logs-panel">
      <h2>Simulation Logs</h2>
      <div id="logs" class="logs-container"></div>
    </div>
  </div>
`

const statusText = document.getElementById('status-text')!
const statusDot = document.querySelector('.status-dot')!
const uploadBtn = document.getElementById('upload-btn') as HTMLButtonElement
const csvInput = document.getElementById('csv-input') as HTMLInputElement
const uploadStatus = document.getElementById('upload-status')!
const startBtn = document.getElementById('start-btn') as HTMLButtonElement
const stopBtn = document.getElementById('stop-btn') as HTMLButtonElement
const simStatus = document.getElementById('sim-status')!
const logsContainer = document.getElementById('logs')!

let statusInterval: number | null = null
let logsInterval: number | null = null
let csvUploaded = false

async function checkHealth() {
  try {
    const health = await apiClient.healthCheck()
    statusText.textContent = 'Backend Connected ✓'
    statusDot.classList.add('connected')
    return true
  } catch (error) {
    statusText.textContent = 'Backend Disconnected - Start server with: npm run server'
    statusDot.classList.remove('connected')
    return false
  }
}

async function updateSimulationStatus() {
  try {
    const status = await apiClient.getStatus()
    simStatus.innerHTML = `
      <div class="info-row">
        <span>Status:</span>
        <span class="value ${status.isRunning ? 'running' : 'stopped'}">
          ${status.isRunning ? '🟢 Running' : '⚫ Stopped'}
        </span>
      </div>
      <div class="info-row">
        <span>Last Update:</span>
        <span class="value">${new Date(status.currentTime).toLocaleString()}</span>
      </div>
    `
    
    startBtn.disabled = status.isRunning
    stopBtn.disabled = !status.isRunning
  } catch (error) {
    console.error('Failed to update status:', error)
  }
}

async function updateLogs() {
  try {
    const { logs } = await apiClient.getLogs()
    if (logs.length > 0) {
      logsContainer.innerHTML = logs
        .map(log => `<div class="log-entry">${log}</div>`)
        .join('')
      logsContainer.scrollTop = logsContainer.scrollHeight
    }
  } catch (error) {
    console.error('Failed to update logs:', error)
  }
}

// Upload button click handler
uploadBtn.addEventListener('click', () => {
  csvInput.click()
})

// File selection handler
csvInput.addEventListener('change', async (event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) {
    return
  }

  // Validate file type
  if (!file.name.endsWith('.csv')) {
    uploadStatus.innerHTML = `
      <div class="upload-error">
        ❌ Please select a CSV file
      </div>
    `
    return
  }

  try {
    uploadBtn.disabled = true
    uploadBtn.textContent = '⏳ Uploading...'
    
    uploadStatus.innerHTML = `
      <div class="upload-progress">
        📤 Uploading ${file.name}...
      </div>
    `

    // Upload file to backend
    const result = await apiClient.uploadCSV(file)
    
    csvUploaded = true
    uploadStatus.innerHTML = `
      <div class="upload-success">
        ✅ ${result.message}
        <div class="file-info">File: ${result.filename} (${(result.size / 1024).toFixed(2)} KB)</div>
      </div>
    `
    
    uploadBtn.textContent = '✓ CSV Uploaded'
    
    // Reset file input
    csvInput.value = ''
    
    // Re-enable upload button after 2 seconds
    setTimeout(() => {
      uploadBtn.disabled = false
      uploadBtn.textContent = '📁 Upload CSV File'
    }, 2000)
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    uploadStatus.innerHTML = `
      <div class="upload-error">
        ❌ ${errorMessage}
      </div>
    `
    uploadBtn.disabled = false
    uploadBtn.textContent = '📁 Upload CSV File'
  }
})

startBtn.addEventListener('click', async () => {
  try {
    startBtn.disabled = true
    startBtn.textContent = 'Starting...'
    
    const result = await apiClient.startSimulation()
    console.log(result.message)
    
    await updateSimulationStatus()
    
    if (!logsInterval) {
      logsInterval = window.setInterval(updateLogs, 1000)
    }
    
    startBtn.textContent = 'Start Simulation'
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    alert(`Failed to start simulation:\n\n${errorMessage}`)
    startBtn.disabled = false
    startBtn.textContent = 'Start Simulation'
  }
})

stopBtn.addEventListener('click', async () => {
  try {
    stopBtn.disabled = true
    stopBtn.textContent = 'Stopping...'
    
    const result = await apiClient.stopSimulation()
    console.log(result.message)
    
    await updateSimulationStatus()
    
    if (logsInterval) {
      clearInterval(logsInterval)
      logsInterval = null
    }
    
    stopBtn.textContent = 'Stop Simulation'
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    alert(`Failed to stop simulation:\n\n${errorMessage}`)
    stopBtn.disabled = false
    stopBtn.textContent = 'Stop Simulation'
  }
})

// Initial checks
checkHealth().then(connected => {
  if (connected) {
    updateSimulationStatus()
    statusInterval = window.setInterval(() => {
      checkHealth()
      updateSimulationStatus()
    }, 3000)
  } else {
    // Retry connection every 5 seconds
    statusInterval = window.setInterval(async () => {
      const isConnected = await checkHealth()
      if (isConnected) {
        updateSimulationStatus()
        if (statusInterval) {
          clearInterval(statusInterval)
          statusInterval = window.setInterval(() => {
            checkHealth()
            updateSimulationStatus()
          }, 3000)
        }
      }
    }, 5000)
  }
})
