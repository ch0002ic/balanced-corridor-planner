# Codechella TCW Academy - Container Terminal Simulation

A web-based simulation system for container terminal operations with Python backend and TypeScript frontend.

## Prerequisites

- Node.js (v18 or higher)
- Python 3.x
- npm

## Installation

```bash
npm install
```

## Running the Application

**IMPORTANT:** You need to run TWO separate processes:

### 1. Start the Backend Server (Terminal 1)

```bash
npm run server
```

This starts the Express backend on `http://localhost:3001`

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
└── cli.py            # Python simulation script
```

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/upload` - Upload CSV file
- `POST /api/simulation/start` - Start simulation
- `POST /api/simulation/stop` - Stop simulation
- `GET /api/simulation/status` - Get simulation status
- `GET /api/simulation/logs` - Get simulation logs

## Troubleshooting

**Upload fails with "Unexpected token '<'":**
- Make sure the backend server is running (`npm run server`)
- Check that port 3001 is not in use
- Verify the "System Status" shows "Backend Connected ✓"

**Simulation won't start:**
- Ensure you've uploaded a CSV file first
- Check that `cli.py` exists in the project root
- Verify Python 3 is installed and accessible
