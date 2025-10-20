#!/usr/bin/env python3
"""
Container Terminal Simulation CLI with Real-time WebSocket Updates
"""

import sys
import time
import asyncio
from pathlib import Path
from src.websocket_server import get_server, broadcast_update


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


async def run_simulation_with_updates(data):
    """Run the container terminal simulation with real-time updates"""
    print("=" * 60)
    print("CONTAINER TERMINAL SIMULATION (Real-time Mode)")
    print("=" * 60)
    print(f"\nLoaded {len(data)} records")
    print("WebSocket server running on ws://localhost:8765")
    print("\nStarting simulation...\n")
    
    total_records = len(data)
    
    # Send initial state
    await broadcast_update("simulation_start", {
        "totalRecords": total_records,
        "status": "running"
    })
    
    # Simulate processing with updates
    for i, record in enumerate(data, 1):
        print(f"[{i}/{total_records}] Processing: {record}")
        
        # Broadcast progress update
        await broadcast_update("simulation_progress", {
            "completedJobs": i,
            "remainingJobs": total_records - i,
            "currentTime": i * 10,  # Simulated time
            "activeQC": min(8, (i % 8) + 1),
            "idleQC": 8 - min(8, (i % 8) + 1),
            "movingHT": min(80, (i % 80) + 1),
            "nonMovingHT": 80 - min(80, (i % 80) + 1),
            "activeYard": min(16, (i % 16) + 1),
            "idleYard": 16 - min(16, (i % 16) + 1),
            "progress": (i / total_records) * 100
        })
        
        # Simulate work
        await asyncio.sleep(0.5)
        
        if i % 10 == 0:
            print(f"\n--- Progress: {i}/{total_records} records processed ---\n")
    
    # Send completion
    await broadcast_update("simulation_complete", {
        "totalRecords": total_records,
        "status": "completed"
    })
    
    print("\n" + "=" * 60)
    print("SIMULATION COMPLETE")
    print("=" * 60)
    print(f"\nTotal records processed: {total_records}")
    print("Status: SUCCESS")


async def main():
    """Main entry point with WebSocket server"""
    input_file = Path("data/input.csv")
    
    if not input_file.exists():
        print("ERROR: No input file found at data/input.csv")
        print("Please upload a CSV file first.")
        sys.exit(1)
    
    print(f"Loading data from: {input_file}")
    data = load_csv_data(input_file)
    
    if data is None:
        sys.exit(1)
    
    if len(data) == 0:
        print("WARNING: CSV file is empty")
        sys.exit(1)
    
    # Start WebSocket server
    server = get_server()
    await server.start()
    
    try:
        # Run simulation
        await run_simulation_with_updates(data)
        
        # Keep server running for a bit to ensure final messages are sent
        await asyncio.sleep(2)
    finally:
        await server.stop()


if __name__ == "__main__":
    asyncio.run(main())
