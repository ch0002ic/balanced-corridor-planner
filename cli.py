#!/usr/bin/env python3
"""
Container Terminal Simulation CLI
Simplified version for WebContainer environment
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
    """Run the container terminal simulation"""
    print("=" * 60)
    print("CONTAINER TERMINAL SIMULATION")
    print("=" * 60)
    print(f"\nLoaded {len(data)} records")
    print("\nStarting simulation...\n")
    
    # Simulate processing
    for i, record in enumerate(data, 1):
        print(f"[{i}/{len(data)}] Processing: {record}")
        time.sleep(0.5)  # Simulate work
        
        if i % 10 == 0:
            print(f"\n--- Progress: {i}/{len(data)} records processed ---\n")
    
    print("\n" + "=" * 60)
    print("SIMULATION COMPLETE")
    print("=" * 60)
    print(f"\nTotal records processed: {len(data)}")
    print("Status: SUCCESS")

def main():
    """Main entry point"""
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
    
    run_simulation(data)

if __name__ == "__main__":
    main()
