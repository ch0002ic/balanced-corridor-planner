#!/usr/bin/env python3
"""
Main simulation runner that integrates the full Python simulation engine
Outputs JSON stats for the frontend to consume
"""

import sys
import json
import time
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from src.simulation import Simulation
from src.constant import CONSTANT

def main():
    """Run the full simulation with real-time stats output"""
    print("=" * 60, flush=True)
    print("CONTAINER TERMINAL SIMULATION - FULL ENGINE", flush=True)
    print("=" * 60, flush=True)
    
    try:
        # Initialize simulation with full engine
        sim = Simulation()
        print("\n✓ Simulation engine initialized", flush=True)
        print(f"✓ Loaded job data from input.csv", flush=True)
        print(f"✓ Planning interval: {CONSTANT.PLANNING_INTERVAL} time units", flush=True)
        print(f"✓ System time step: {CONSTANT.JOB_PARAMETER.SYSTEM_TIME_PASSED} seconds", flush=True)
        print("\nStarting simulation...\n", flush=True)
        
        # Run simulation loop
        iteration = 0
        last_stats_time = 0
        
        while not sim.has_completed_all_jobs():
            # Check for deadlock
            if sim.has_deadlock():
                print("\n⚠ DEADLOCK DETECTED - Simulation stopped", flush=True)
                break
            
            # Update simulation (one time step)
            sim.update()
            iteration += 1
            
            # Output stats every second (for frontend)
            current_time = sim.get_current_time()
            if current_time - last_stats_time >= 1:
                stats = sim.export_terminal_statistics()
                # Output as JSON for frontend to parse
                json_output = json.dumps(stats)
                print(json_output, flush=True)
                last_stats_time = current_time
            
            # Progress indicator every 100 iterations
            if iteration % 100 == 0:
                stats = sim.export_terminal_statistics()
                completed = stats['JOBS']['COMPLETED']
                total = stats['JOBS']['TOTAL']
                print(f"[Progress] {completed}/{total} jobs completed", file=sys.stderr, flush=True)
        
        # Export final report
        print("\n" + "=" * 60, flush=True)
        print("SIMULATION COMPLETE", flush=True)
        print("=" * 60, flush=True)
        
        sim.export_job_report()
        
        final_stats = sim.export_terminal_statistics()
        print(f"\n✓ Total jobs completed: {final_stats['JOBS']['COMPLETED']}", flush=True)
        print(f"✓ Total simulation time: {final_stats['JOBS']['TIME(secs)']} seconds", flush=True)
        print(f"✓ Output saved to: output.csv", flush=True)
        
        # Output final stats as JSON
        print(json.dumps(final_stats), flush=True)
        
    except FileNotFoundError:
        print("\n✗ ERROR: input.csv not found", file=sys.stderr, flush=True)
        print("Please upload a CSV file first.", file=sys.stderr, flush=True)
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ ERROR: {str(e)}", file=sys.stderr, flush=True)
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
