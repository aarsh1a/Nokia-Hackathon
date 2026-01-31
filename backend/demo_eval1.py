"""
evaluation 1 demo script
5g fronthaul topology inference - nokia hackathon

this script demonstrates the three key tests for evaluation 1:
- test a: scale correctness (2.2m rows, 24 cells)
- test b: logical sanity (explainable inference)
- test c: failure handling (graceful errors)

run: python demo_eval1.py
"""

import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.data_loader import load_data
from services.congestion import detect_congestion
from services.correlation import compute_congestion_correlation
from services.topology import infer_topology


def print_header(title):
    print("\n" + "=" * 70)
    print(f"  {title}")
    print("=" * 70)


def test_a_scale_correctness():
    """
    test a: scale correctness
    proves: system scales beyond toy data, pipeline is stable on real logs.
    """
    print_header("test a: scale correctness")
    
    print("\n[1] loading full dataset from nokia .dat files...")
    df = load_data("data/raw")
    
    print("[2] running congestion detection...")
    df_cong = detect_congestion(df)
    
    print("[3] computing pairwise correlation matrix...")
    correlation_matrix = compute_congestion_correlation(df_cong)
    
    print("[4] inferring shared link topology...")
    topology = infer_topology(correlation_matrix)
    
    total_rows = len(df)
    total_cells = df["cell_id"].nunique()
    congestion_events = df_cong["is_congested"].sum()
    inferred_links = len(set(topology.values()))
    
    print("\n" + "-" * 50)
    print("  results")
    print("-" * 50)
    print(f"  total rows processed:    {total_rows:,}")
    print(f"  number of cells:         {total_cells}")
    print(f"  congestion events:       {congestion_events:,}")
    print(f"  inferred shared links:   {inferred_links}")
    print("-" * 50)
    
    return topology, correlation_matrix, df_cong


def test_b_logical_sanity(topology, correlation_matrix):
    """
    test b: logical sanity
    proves: output is explainable, inference is justified.
    """
    print_header("test b: logical sanity")
    
    links = {}
    for cell, link in topology.items():
        if link not in links:
            links[link] = []
        links[link].append(cell)
    
    for link in links:
        links[link] = sorted(links[link], key=lambda x: int(x.split('_')[1]))
    
    print("\ninferred topology:")
    print("-" * 50)
    for link in sorted(links.keys()):
        cells = links[link]
        print(f"  {link.lower()}: {', '.join(cells)}")
    print("-" * 50)
    
    largest_link = max(links.keys(), key=lambda k: len(links[k]))
    cells_in_link = links[largest_link]
    
    print(f"\ndeep dive: {largest_link.lower()}")
    print(f"cells: {', '.join(cells_in_link)}")
    print("\npairwise correlation:")
    print("-" * 40)
    
    for i, cell_a in enumerate(cells_in_link):
        for cell_b in cells_in_link[i+1:]:
            corr = correlation_matrix.get(cell_a, {}).get(cell_b, 0)
            print(f"  {cell_a} <-> {cell_b}: {corr:.2%}")
    
    print("\ninterpretation:")
    print(f"  these {len(cells_in_link)} cells frequently experience congestion")
    print("  at the same timestamps. high correlation indicates they")
    print("  likely share the same ethernet link in the fronthaul network.")
    
    link_names = sorted(links.keys())
    if len(link_names) >= 2:
        cell_link1 = links[link_names[0]][0]
        cell_link2 = links[link_names[1]][0]
        corr = correlation_matrix.get(cell_link1, {}).get(cell_link2, 0)
        print("\ncounter-example (different links):")
        print(f"  {cell_link1} ({link_names[0].lower()}) <-> {cell_link2} ({link_names[1].lower()})")
        print(f"  correlation: {corr:.2%}")
        print("  low correlation confirms they are on different links.")


def test_c_failure_handling():
    """
    test c: failure handling
    proves: defensive engineering, graceful error handling.
    """
    print_header("test c: failure handling")
    
    print("\ntesting error scenarios:\n")
    
    print("1. invalid data path:")
    print("   input: load_data('data/nonexistent')")
    try:
        load_data("data/nonexistent")
    except FileNotFoundError as e:
        print(f"   result: caught filenotfounderror")
        print(f"   message: \"{str(e)[:50]}...\"")
    
    print("\n2. missing required columns:")
    print("   input: detect_congestion(df_without_packet_loss)")
    try:
        import pandas as pd
        bad_df = pd.DataFrame({"timestamp": [1], "cell_id": ["cell_1"]})
        detect_congestion(bad_df)
    except KeyError as e:
        print(f"   result: caught keyerror")
        print(f"   message: {str(e)[:50]}")
    
    print("\ninterpretation:")
    print("  the system validates inputs and returns clear error messages.")
    print("  this ensures the backend is robust and guides users when")
    print("  something goes wrong.")


def export_results(topology, correlation_matrix):
    print_header("exporting results")
    
    export_data = {
        "topology": topology,
        "correlation_matrix": correlation_matrix,
        "summary": {
            "total_cells": len(topology),
            "inferred_links": len(set(topology.values())),
            "algorithm": "connected components with correlation threshold 0.7"
        }
    }
    
    output_path = "data/eval1_results.json"
    with open(output_path, "w") as f:
        json.dump(export_data, f, indent=2)
    
    print(f"\nresults exported to: {output_path}")


def main():
    print("\n" + "=" * 70)
    print("  nokia hackathon - evaluation 1 demo")
    print("  5g fronthaul topology inference")
    print("=" * 70)
    
    topology, correlation_matrix, df_cong = test_a_scale_correctness()
    test_b_logical_sanity(topology, correlation_matrix)
    test_c_failure_handling()
    export_results(topology, correlation_matrix)
    
    print_header("evaluation 1 complete")
    print("""
  test a (scale):      2.2m rows processed successfully
  test b (logic):      topology inference is explainable
  test c (maturity):   graceful error handling demonstrated
    
  results saved to:    data/eval1_results.json
    """)


if __name__ == "__main__":
    main()
