# Codechella TCW Academy - Container Terminal Simulation

A container terminal simulation and management system with Python backend and TypeScript frontend.

## Quick Start

### 1. Start the Backend API Server
```bash
npm run server
```
The server will run on `http://localhost:3001`

### 2. Start the Frontend (in a new terminal)
```bash
npm run dev
```
The frontend will run on `http://localhost:5173`

## Features

- **Real-time Simulation**: Container terminal operations simulation
- **Live Monitoring**: Track simulation status and logs in real-time
- **API Integration**: RESTful API for simulation control
- **Dual Interface**: Web UI and CLI support

## Architecture

- **Frontend**: Vite + TypeScript
- **Backend API**: Node.js + Express
- **Simulation Engine**: Python
- **Communication**: REST API with CORS support

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/simulation/start` - Start simulation
- `POST /api/simulation/stop` - Stop simulation
- `GET /api/simulation/status` - Get current status
- `GET /api/simulation/logs` - Get simulation logs

## Development

The project requires both Node.js and Python environments:
- Node.js for the API server and frontend
- Python 3 for the simulation engine

## Troubleshooting

If you see "Backend Disconnected":
1. Make sure the backend server is running: `npm run server`
2. Check that port 3001 is available
3. Verify Python 3 is installed: `python3 --version`
