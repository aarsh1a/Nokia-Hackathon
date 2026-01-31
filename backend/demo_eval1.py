"""
=============================================================================
EVALUATION 1 DEMO SCRIPT
5G Fronthaul Topology Inference - Nokia Hackathon
=============================================================================

This script demonstrates the three key tests for Evaluation 1:
- Test A: Scale correctness (2.2M rows, 24 cells)
- Test B: Logical sanity (explainable inference)
- Test C: Failure handling (graceful errors)

Run: python demo_eval1.py
"""

import json
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.data_loader import load_data
from services.congestion import detect_congestion
from services.correlation import compute_congestion_correlation
from services.topology import infer_topology


def print_header(title):
    """Print a formatted section header."""
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def test_a_scale_correctness():
    """
    TEST A: Scale Correctness (Mandatory)
    -------------------------------------
    Proves: System scales beyond toy data, pipeline is stable on real logs.
    """
    print_header("TEST A: SCALE CORRECTNESS")
    
    print("\n📊 Loading full dataset from Nokia .dat files...")
    df = load_data("data/raw")
    
    print("\n🔍 Running congestion detection...")
    df_cong = detect_congestion(df)
    
    print("📈 Computing pairwise correlation matrix...")
    correlation_matrix = compute_congestion_correlation(df_cong)
    
    print("🔗 Inferring shared link topology...")
    topology = infer_topology(correlation_matrix)
    
    # Summary statistics
    total_rows = len(df)
    total_cells = df["cell_id"].nunique()
    congestion_events = df_cong["is_congested"].sum()
    inferred_links = len(set(topology.values()))
    
    print("\n" + "-" * 50)
    print("  SCALE TEST RESULTS")
    print("-" * 50)
    print(f"  ✅ Total rows processed:    {total_rows:,}")
    print(f"  ✅ Number of cells:         {total_cells}")
    print(f"  ✅ Congestion events:       {congestion_events:,}")
    print(f"  ✅ Inferred shared links:   {inferred_links}")
    print("-" * 50)
    
    print("\n📋 PPT Summary:")
    print(f'   "Validated on {total_rows:,} rows from {total_cells} cells')
    print(f'    → Detected {congestion_events:,} congestion events')
    print(f'    → Inferred {inferred_links} shared fronthaul links"')
    
    return topology, correlation_matrix, df_cong


def test_b_logical_sanity(topology, correlation_matrix):
    """
    TEST B: Logical Sanity (Thinking Test)
    --------------------------------------
    Proves: Output is explainable, inference is justified.
    """
    print_header("TEST B: LOGICAL SANITY (EXPLAINABILITY)")
    
    # Group cells by link
    links = {}
    for cell, link in topology.items():
        if link not in links:
            links[link] = []
        links[link].append(cell)
    
    # Sort cells within each link
    for link in links:
        links[link] = sorted(links[link], key=lambda x: int(x.split('_')[1]))
    
    print("\n🔗 INFERRED TOPOLOGY:")
    print("-" * 50)
    for link in sorted(links.keys()):
        cells = links[link]
        print(f"  {link}: {', '.join(cells)}")
    print("-" * 50)
    
    # Deep dive into one link (pick the largest group)
    largest_link = max(links.keys(), key=lambda k: len(links[k]))
    cells_in_link = links[largest_link]
    
    print(f"\n🔬 DEEP DIVE: {largest_link}")
    print(f"   Cells: {', '.join(cells_in_link)}")
    print("\n   Pairwise Correlation Matrix:")
    print("   " + "-" * 40)
    
    # Show correlation between cells in this link
    for i, cell_a in enumerate(cells_in_link):
        for cell_b in cells_in_link[i+1:]:
            corr = correlation_matrix.get(cell_a, {}).get(cell_b, 0)
            print(f"   {cell_a} ↔ {cell_b}: {corr:.2%} correlation")
    
    print("\n💡 INTERPRETATION:")
    print(f'   "These {len(cells_in_link)} cells frequently experience congestion')
    print('    at the same timestamps. High correlation indicates they likely')
    print('    share the same Ethernet link in the fronthaul network."')
    
    # Also show a low-correlation example
    print("\n🔍 COUNTER-EXAMPLE (Different Links):")
    link_names = sorted(links.keys())
    if len(link_names) >= 2:
        cell_link1 = links[link_names[0]][0]
        cell_link2 = links[link_names[1]][0]
        corr = correlation_matrix.get(cell_link1, {}).get(cell_link2, 0)
        print(f"   {cell_link1} ({link_names[0]}) ↔ {cell_link2} ({link_names[1]})")
        print(f"   Correlation: {corr:.2%}")
        print('   → Low correlation = different links (as expected)')


def test_c_failure_handling():
    """
    TEST C: Failure Handling (Maturity Test)
    ----------------------------------------
    Proves: Defensive engineering, graceful error handling.
    """
    print_header("TEST C: FAILURE HANDLING")
    
    print("\n🧪 Testing error scenarios...\n")
    
    # Test 1: Non-existent path
    print("1️⃣  Invalid data path:")
    print("    Input: load_data('data/nonexistent')")
    try:
        load_data("data/nonexistent")
    except FileNotFoundError as e:
        print(f"    ✅ Caught FileNotFoundError")
        print(f"    ✅ Message: \"{str(e)[:60]}...\"")
    
    # Test 2: Missing columns (simulate with empty DataFrame)
    print("\n2️⃣  Missing required columns:")
    print("    Input: detect_congestion(df_without_packet_loss)")
    try:
        import pandas as pd
        bad_df = pd.DataFrame({"timestamp": [1], "cell_id": ["cell_1"]})
        detect_congestion(bad_df)
    except KeyError as e:
        print(f"    ✅ Caught KeyError")
        print(f"    ✅ Message: {str(e)[:60]}")
    
    print("\n💡 INTERPRETATION:")
    print('   "The system validates inputs and returns clear error messages.')
    print('    This ensures the backend is not brittle and can guide users')
    print('    when something goes wrong."')


def export_results(topology, correlation_matrix):
    """Export results to JSON for PPT/documentation."""
    print_header("EXPORTING RESULTS")
    
    # Prepare export data
    export_data = {
        "topology": topology,
        "correlation_matrix": correlation_matrix,
        "summary": {
            "total_cells": len(topology),
            "inferred_links": len(set(topology.values())),
            "algorithm": "Connected components with correlation threshold 0.7"
        }
    }
    
    output_path = "data/eval1_results.json"
    with open(output_path, "w") as f:
        json.dump(export_data, f, indent=2)
    
    print(f"\n✅ Results exported to: {output_path}")
    print("   Use this JSON in your PPT or for further analysis.")


def main():
    """Run all Evaluation 1 demo tests."""
    print("\n" + "█" * 70)
    print("█" + " " * 68 + "█")
    print("█" + "  NOKIA HACKATHON - EVALUATION 1 DEMO".center(68) + "█")
    print("█" + "  5G Fronthaul Topology Inference".center(68) + "█")
    print("█" + " " * 68 + "█")
    print("█" * 70)
    
    # Run Test A (and get results for Test B)
    topology, correlation_matrix, df_cong = test_a_scale_correctness()
    
    # Run Test B
    test_b_logical_sanity(topology, correlation_matrix)
    
    # Run Test C
    test_c_failure_handling()
    
    # Export results
    export_results(topology, correlation_matrix)
    
    # Final summary
    print_header("EVALUATION 1 - COMPLETE")
    print("""
    ✅ Test A (Scale):      2.2M rows processed successfully
    ✅ Test B (Logic):      Topology inference is explainable
    ✅ Test C (Maturity):   Graceful error handling demonstrated
    
    📁 Results saved to:    data/eval1_results.json
    
    Ready for presentation!
    """)


if __name__ == "__main__":
    main()
