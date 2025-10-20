# Codechella TCW Academy - Container Terminal Simulation

A web-based simulation system for container terminal operations with Python backend and TypeScript frontend.

## Prerequisites

- Node.js (v18 or higher)
- Python 3.x (standard library only)
- npm

## Installation

### 1. Install Node.js Dependencies

```bash
npm install
```

### 2. Install Python Dependencies (Optional)

```bash
pip3 install -r requirements.txt
```

**Note:** Most Python packages in requirements.txt are not available in WebContainer. The simulation uses Python's standard library (csv module) instead.

## Running the Application

**IMPORTANT:** You need to run TWO separate processes:

### 1. Start the Backend Server (Terminal 1)

```bash
npm run server
```

This starts the Express backend on `http://localhost:3001`

**Expected output:**
```
✓ Backend API server running on http://localhost:3001
✓ Health check: http://localhost:3001/api/health
```

### 2. Start the Frontend (Terminal 2)

```bash
npm run dev
```

This starts the Vite dev server on `http://localhost:5173`

## Usage

1. **Check System Status** - Verify backend connection (green dot = connected)
2. **Upload CSV File** - Click "Upload CSV File" button and select your `input.csv`
3. **Start Simulation** - Once CSV is uploaded, click "Start Simulation"
4. **Monitor Logs** - View real-time simulation logs in the logs panel
5. **Stop Simulation** - Click "Stop Simulation" when needed

## Project Structure

```
├── server/           # Express backend server
│   └── index.js      # API endpoints and file upload handling
├── src/              # Frontend source
│   ├── api/          # API client
│   ├── main.ts       # Main application logic
│   └── style.css     # Styles
├── data/             # CSV upload directory (auto-created)
├── cli.py            # Python simulation script (simplified)
└── requirements.txt  # Python dependencies (mostly unavailable in WebContainer)
```

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/upload` - Upload CSV file
- `POST /api/simulation/start` - Start simulation
- `POST /api/simulation/stop` - Stop simulation
- `GET /api/simulation/status` - Get simulation status
- `GET /api/simulation/logs` - Get simulation logs

## WebContainer Limitations

This project runs in WebContainer, which has some limitations:

- **Python**: Only standard library available (no pip packages like pandas, numpy, etc.)
- **Simulation**: Uses built-in `csv` module instead of pandas
- **Dependencies**: Most packages in requirements.txt are not available

The simulation has been simplified to work within these constraints.

## Troubleshooting

**npm run server fails:**
- Run `npm install` first
- Check that port 3001 is not in use
- Verify Node.js is installed (v18+)

**Upload fails with "Unexpected token '<'":**
- Make sure the backend server is running (`npm run server`)
- Verify the "System Status" shows "Backend Connected ✓"

**Simulation won't start:**
- Ensure you've uploaded a CSV file first
- Check that `cli.py` exists in the project root
- Verify Python 3 is installed

**Python packages fail to install:**
- This is expected in WebContainer
- The simulation uses Python's standard library only
- No external packages are required
