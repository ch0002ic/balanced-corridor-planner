# Real-time Simulation Updates

## Overview
The simulation now supports real-time updates via WebSocket, allowing the web UI to automatically refresh as the Python CLI simulation runs.

## Architecture

### Python Side (Backend)
- **`src/websocket_server.py`**: WebSocket server that broadcasts simulation updates
- **`cli_realtime.py`**: Enhanced CLI that sends real-time updates during simulation

### TypeScript Side (Frontend)
- **`src/services/SimulationWebSocket.ts`**: WebSocket client that receives updates
- **`src/main.ts`**: Connects WebSocket to UI components
- **`src/components/SimulationStats.ts`**: Auto-updates with new data
- **`src/components/SimulationCanvas.ts`**: Shows progress visualization

## How It Works

1. **Start the Web UI**:
   ```bash
   npm run dev
   ```

2. **Run the Simulation**:
   ```bash
   python3 cli_realtime.py
   ```

3. **Watch Updates**:
   - The terminal visualization updates automatically
   - Statistics refresh in real-time
   - Progress bar shows completion percentage
   - All updates happen without manual intervention

## WebSocket Messages

### Message Types
- `simulation_start`: Simulation begins
- `simulation_progress`: Regular updates with stats
- `simulation_complete`: Simulation finished
- `pong`: Connection keepalive

### Progress Update Format
```json
{
  "type": "simulation_progress",
  "data": {
    "completedJobs": 150,
    "remainingJobs": 19850,
    "currentTime": 1500,
    "activeQC": 6,
    "idleQC": 2,
    "movingHT": 45,
    "nonMovingHT": 35,
    "activeYard": 12,
    "idleYard": 4,
    "progress": 0.75
  },
  "timestamp": 1234567890.123
}
```

## Features

✅ **Automatic Updates**: No manual refresh needed
✅ **Real-time Stats**: See job progress, resource utilization
✅ **Visual Feedback**: Progress bar and terminal visualization
✅ **Connection Management**: Auto-reconnect on disconnect
✅ **Multiple Clients**: Support multiple browser tabs

## Troubleshooting

### WebSocket Connection Failed
- Ensure Python simulation is running: `python3 cli_realtime.py`
- Check port 8765 is not blocked
- Verify no firewall issues

### No Updates Appearing
- Check browser console for WebSocket messages
- Ensure `cli_realtime.py` is running (not `cli.py`)
- Verify CSV data file exists at `data/input.csv`

### Stats Not Updating
- Open browser DevTools and check console logs
- Look for `[WS]` and `[STATS]` log messages
- Verify WebSocket connection is established (green checkmark in console)

## Next Steps

To integrate with the full simulation engine:
1. Modify `src/simulation.py` to use the WebSocket server
2. Call `broadcast_update()` in the simulation loop
3. Send terminal visualization data alongside statistics
4. Add HT position updates for real-time tracking
