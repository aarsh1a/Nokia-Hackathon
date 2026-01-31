"""
Academic Evaluation-1 Backend
5G Fronthaul Topology Inference
"""

from flask import Flask, jsonify

# Import analysis pipeline modules
from services.data_loader import load_data
from services.congestion import detect_congestion
from services.correlation import compute_congestion_correlation
from services.topology import infer_topology

app = Flask(__name__)

# Path to traffic data (directory with raw .dat files)
DATA_PATH = "data/raw"


@app.route("/")
def root():
    """Root endpoint with project description."""
    return jsonify({
        "message": "Academic Evaluation-1 backend for 5G fronthaul topology inference"
    })


@app.route("/health")
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok"})


@app.route("/analyze")
def analyze():
    """
    Run the full topology inference analysis pipeline.
    
    Pipeline Steps:
        1. Load traffic data from CSV
        2. Detect congestion events per cell
        3. Compute pairwise congestion correlation
        4. Infer shared link topology from correlations
    
    Returns:
        JSON response containing:
        - topology: cell-to-link mapping
        - correlation_matrix: pairwise correlation values
        - summary: analysis statistics
    """
    try:
        # Step 1: Load and validate traffic data
        df = load_data(DATA_PATH)
        
        # Step 2: Detect congestion events
        df_with_congestion = detect_congestion(df)
        
        # Step 3: Compute pairwise correlation between cells
        correlation_matrix = compute_congestion_correlation(df_with_congestion)
        
        # Step 4: Infer topology (group cells into shared links)
        topology = infer_topology(correlation_matrix)
        
        # Compute summary statistics
        num_cells = len(topology)
        num_links = len(set(topology.values()))
        
        return jsonify({
            "topology": topology,
            "correlation_matrix": correlation_matrix,
            "summary": {
                "total_cells": num_cells,
                "inferred_links": num_links,
                "data_source": DATA_PATH
            }
        })
    
    except FileNotFoundError as e:
        # Data file not found
        return jsonify({
            "error": "Data file not found",
            "detail": str(e)
        }), 404
    
    except KeyError as e:
        # Missing required columns
        return jsonify({
            "error": "Invalid data format",
            "detail": str(e)
        }), 400
    
    except Exception as e:
        # Unexpected error
        return jsonify({
            "error": "Analysis failed",
            "detail": str(e)
        }), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
