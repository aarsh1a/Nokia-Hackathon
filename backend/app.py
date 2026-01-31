"""
Academic Evaluation-1 Backend
5G Fronthaul Topology Inference
"""

from flask import Flask, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np

# Import analysis pipeline modules
from services.data_loader import load_data
from services.congestion import detect_congestion
from services.correlation import compute_congestion_correlation
from services.topology import infer_topology
from services.raw_data_parser import load_all_pkt_stats, load_all_throughput

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

# Path to traffic data (directory with raw .dat files)
DATA_PATH = "data/raw"

# Cache for processed data (avoid re-processing on every request)
_cache = {}


def get_cached_analysis():
    """Get or compute cached analysis results."""
    if 'analysis' not in _cache:
        df = load_data(DATA_PATH)
        df_with_congestion = detect_congestion(df)
        correlation_matrix = compute_congestion_correlation(df_with_congestion)
        topology = infer_topology(correlation_matrix)
        
        _cache['analysis'] = {
            'df': df_with_congestion,
            'correlation_matrix': correlation_matrix,
            'topology': topology
        }
    return _cache['analysis']


@app.route("/")
def root():
    """Root endpoint with project description."""
    return jsonify({
        "message": "Academic Evaluation-1 backend for 5G fronthaul topology inference",
        "endpoints": ["/health", "/analyze", "/api/cell-stats", "/api/link-stats", "/api/correlation", "/api/timeseries/<cell_id>"]
    })


@app.route("/health")
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok"})


@app.route("/analyze")
def analyze():
    """
    Run the full topology inference analysis pipeline.
    """
    try:
        analysis = get_cached_analysis()
        topology = analysis['topology']
        correlation_matrix = analysis['correlation_matrix']
        df = analysis['df']
        
        num_cells = len(topology)
        num_links = len(set(topology.values()))
        congestion_events = int(df['is_congested'].sum())
        total_rows = len(df)
        
        return jsonify({
            "topology": topology,
            "correlation_matrix": correlation_matrix,
            "summary": {
                "total_cells": num_cells,
                "inferred_links": num_links,
                "congestion_events": congestion_events,
                "total_data_points": total_rows,
                "data_source": DATA_PATH,
                "algorithm": "connected components with correlation threshold 0.7"
            }
        })
    
    except Exception as e:
        return jsonify({"error": "Analysis failed", "detail": str(e)}), 500


@app.route("/api/cell-stats")
def cell_stats():
    """
    Get statistics for each cell from real data.
    Returns avg/peak throughput, packet loss rate, congestion events per cell.
    """
    try:
        analysis = get_cached_analysis()
        df = analysis['df']
        topology = analysis['topology']
        
        cell_stats = []
        for cell_id in sorted(df['cell_id'].unique(), key=lambda x: int(x.split('_')[1])):
            cell_data = df[df['cell_id'] == cell_id]
            
            link_name = topology.get(cell_id, "Unknown")
            link_id = int(link_name.split('_')[1]) if link_name != "Unknown" else 0
            
            # Calculate real statistics
            avg_throughput = float(cell_data['throughput'].mean())
            peak_throughput = float(cell_data['throughput'].max())
            total_packets = int(cell_data['throughput'].sum())
            total_loss = int(cell_data['packet_loss'].sum())
            packet_loss_rate = (total_loss / total_packets * 100) if total_packets > 0 else 0
            congestion_count = int(cell_data['is_congested'].sum())
            total_samples = len(cell_data)
            
            # Determine if isolated (only cell on its link)
            cells_on_link = [c for c, l in topology.items() if l == link_name]
            isolated = len(cells_on_link) == 1
            
            cell_stats.append({
                "cellId": cell_id,
                "linkId": link_id,
                "linkName": link_name,
                "avgThroughput": round(avg_throughput, 2),
                "peakThroughput": round(peak_throughput, 2),
                "packetLossRate": round(packet_loss_rate, 4),
                "congestionEvents": congestion_count,
                "totalSamples": total_samples,
                "isolated": isolated
            })
        
        return jsonify({"cells": cell_stats})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/link-stats")
def link_stats():
    """
    Get aggregated statistics per inferred link.
    """
    try:
        analysis = get_cached_analysis()
        df = analysis['df']
        topology = analysis['topology']
        
        # Group cells by link
        links = {}
        for cell_id, link_name in topology.items():
            if link_name not in links:
                links[link_name] = []
            links[link_name].append(cell_id)
        
        link_stats = []
        for link_name in sorted(links.keys(), key=lambda x: int(x.split('_')[1])):
            cells = links[link_name]
            link_id = int(link_name.split('_')[1])
            
            # Aggregate data for all cells on this link
            link_data = df[df['cell_id'].isin(cells)]
            
            avg_throughput = float(link_data['throughput'].mean())
            peak_throughput = float(link_data.groupby('timestamp')['throughput'].sum().max())
            total_loss = int(link_data['packet_loss'].sum())
            total_packets = int(link_data['throughput'].sum())
            packet_loss_rate = (total_loss / total_packets * 100) if total_packets > 0 else 0
            congestion_events = int(link_data['is_congested'].sum())
            
            isolated = len(cells) == 1
            
            link_stats.append({
                "linkId": link_id,
                "linkName": link_name,
                "cells": sorted(cells, key=lambda x: int(x.split('_')[1])),
                "cellCount": len(cells),
                "avgThroughput": round(avg_throughput, 2),
                "peakThroughput": round(peak_throughput, 2),
                "packetLossRate": round(packet_loss_rate, 4),
                "congestionEvents": congestion_events,
                "isolated": isolated
            })
        
        return jsonify({"links": link_stats})
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/correlation")
def correlation():
    """
    Get the full correlation matrix.
    """
    try:
        analysis = get_cached_analysis()
        return jsonify({
            "correlation_matrix": analysis['correlation_matrix'],
            "topology": analysis['topology']
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/timeseries/<cell_id>")
def timeseries(cell_id):
    """
    Get sampled time series data for a specific cell.
    Returns throughput and packet loss over time (sampled for performance).
    """
    try:
        analysis = get_cached_analysis()
        df = analysis['df']
        
        cell_data = df[df['cell_id'] == cell_id].copy()
        if cell_data.empty:
            return jsonify({"error": f"Cell {cell_id} not found"}), 404
        
        # Sort by timestamp
        cell_data = cell_data.sort_values('timestamp')
        
        # Sample every Nth point to keep response size manageable
        # Aim for ~500 data points
        total_points = len(cell_data)
        sample_rate = max(1, total_points // 500)
        sampled = cell_data.iloc[::sample_rate]
        
        # Normalize timestamps to start from 0
        min_time = sampled['timestamp'].min()
        
        timeseries = []
        for _, row in sampled.iterrows():
            timeseries.append({
                "time": round(float(row['timestamp'] - min_time), 3),
                "throughput": int(row['throughput']),
                "packetLoss": int(row['packet_loss']),
                "congested": bool(row['is_congested'])
            })
        
        return jsonify({
            "cellId": cell_id,
            "totalPoints": total_points,
            "sampledPoints": len(timeseries),
            "sampleRate": sample_rate,
            "data": timeseries
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/congestion-timeline")
def congestion_timeline():
    """
    Get congestion events timeline across all cells.
    Shows when each cell experienced congestion.
    """
    try:
        analysis = get_cached_analysis()
        df = analysis['df']
        topology = analysis['topology']
        
        # Get only congested rows
        congested = df[df['is_congested'] == True].copy()
        
        # Group by time buckets (aggregate to reduce data size)
        congested['time_bucket'] = (congested['timestamp'] // 0.1).astype(int) * 0.1
        
        # Count congestion events per cell per time bucket
        grouped = congested.groupby(['time_bucket', 'cell_id']).size().reset_index(name='count')
        
        # Pivot to get cells as columns
        timeline = {}
        for _, row in grouped.iterrows():
            t = round(float(row['time_bucket']), 1)
            if t not in timeline:
                timeline[t] = {}
            timeline[t][row['cell_id']] = int(row['count'])
        
        # Convert to list format
        result = []
        for t in sorted(timeline.keys()):
            entry = {"time": t, "cells": timeline[t]}
            result.append(entry)
        
        return jsonify({
            "timeline": result,
            "topology": topology
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
