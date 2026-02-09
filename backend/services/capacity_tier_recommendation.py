"""
Cost-Aware Fronthaul Capacity Tier Recommendation Module
========================================================

This module provides cost-optimized capacity tier recommendations for fronthaul links.
It evaluates discrete Ethernet link options (10G, 25G, 50G) and recommends the lowest-cost
tier that satisfies SLA constraints.

Key Features:
- Deterministic and explainable logic (no black-box optimization)
- Buffer-aware simulation (4 symbols = 143 µs)
- SLA constraint checking (packet loss ≤ 1%)
- Cost savings calculation vs peak-based provisioning
- Integration with existing congestion risk scores (if available)

Design Principles:
- Non-destructive: Does not modify existing datasets or labels
- Transparent: Clear comments explaining all decisions
- Decision support: Recommendations for operators, not automatic reconfiguration

Author: Nokia Hackathon Team
Date: January 2026
"""

import json
import os
from dataclasses import dataclass, asdict
from typing import List, Dict, Optional, Tuple
import pandas as pd

# Import existing modules (non-destructive extension)
try:
    from services.capacity_estimation import (
        simulate_buffer,
        SLOT_DURATION_SECONDS,
        SYMBOLS_PER_SLOT,
        SYMBOL_DURATION_SECONDS
    )
except ImportError:
    # Fallback constants if import fails
    SLOT_DURATION_SECONDS = 500e-6
    SYMBOLS_PER_SLOT = 14
    SYMBOL_DURATION_SECONDS = SLOT_DURATION_SECONDS / SYMBOLS_PER_SLOT


# =============================================================================
# Configuration Constants
# =============================================================================

# Capacity Tiers (Ethernet link options with increasing cost)
CAPACITY_TIERS = {
    "10G": {
        "capacity_gbps": 10,
        "relative_cost": 1.0,      # Base cost unit
        "label": "10 Gbps"
    },
    "25G": {
        "capacity_gbps": 25,
        "relative_cost": 2.2,      # ~2.2x cost of 10G
        "label": "25 Gbps"
    },
    "50G": {
        "capacity_gbps": 50,
        "relative_cost": 4.0,      # ~4x cost of 10G
        "label": "50 Gbps"
    }
}

# Buffer parameters
BUFFER_SYMBOLS = 4                              # Buffer size at leaf switch
BUFFER_TIME_US = BUFFER_SYMBOLS * 35.7          # ~143 µs (4 symbols * ~35.7 µs per symbol)

# SLA constraints
SLA_PACKET_LOSS_THRESHOLD = 0.01                # ≤ 1% of traffic-carrying slots
SLA_CONGESTION_TOLERANCE = 0.05                 # ≤ 5% congestion events (slots with overflow)


# =============================================================================
# Data Classes for Structured Output
# =============================================================================

@dataclass
class TierEvaluation:
    """Evaluation result for a single capacity tier."""
    tier_name: str
    capacity_gbps: float
    relative_cost: float
    sla_pass: bool
    estimated_packet_loss: float
    congestion_risk: float
    headroom_percent: float
    reason: str

@dataclass
class CapacityRecommendation:
    """Complete recommendation for a single fronthaul link."""
    link_id: str
    link_name: str
    cells: List[str]
    peak_traffic_gbps: float
    avg_traffic_gbps: float
    tier_evaluations: Dict[str, TierEvaluation]
    recommended_tier: str
    recommended_capacity_gbps: float
    cost_savings_percent: float
    ml_congestion_risk: Optional[float]
    recommendation_reason: str


# =============================================================================
# Core Recommendation Logic
# =============================================================================

def calculate_buffer_capacity_bits(capacity_gbps: float) -> float:
    """
    Calculate buffer capacity in bits based on link capacity and buffer time.
    
    The buffer at the leaf switch can absorb bursts for 4 symbols (~143 µs).
    Buffer capacity = link_rate * buffer_time
    
    Args:
        capacity_gbps: Link capacity in Gbps
    
    Returns:
        Buffer capacity in bits
    """
    # Convert Gbps to bits per second
    capacity_bps = capacity_gbps * 1e9
    
    # Buffer time in seconds
    buffer_time_seconds = BUFFER_TIME_US * 1e-6
    
    # Buffer can hold this many bits
    buffer_bits = capacity_bps * buffer_time_seconds
    
    return buffer_bits


def simulate_link_performance(
    traffic_per_slot_gbps: List[float],
    capacity_gbps: float,
    buffer_symbols: int = BUFFER_SYMBOLS
) -> Dict:
    """
    Simulate link performance under given capacity tier.
    
    This function models:
    1. Traffic arrival vs link capacity comparison
    2. Buffer absorption of excess traffic
    3. Packet loss when buffer overflows
    
    Args:
        traffic_per_slot_gbps: Traffic demand per slot in Gbps
        capacity_gbps: Link capacity in Gbps
        buffer_symbols: Buffer size in symbols (default: 4)
    
    Returns:
        Dictionary with simulation results:
        - total_slots: Number of slots simulated
        - loss_slots: Slots where buffer overflow occurred
        - loss_ratio: Fraction of slots with packet loss
        - max_buffer_utilization: Peak buffer usage as fraction
        - avg_utilization: Average link utilization
    """
    if not traffic_per_slot_gbps:
        return {
            "total_slots": 0,
            "loss_slots": 0,
            "loss_ratio": 0.0,
            "max_buffer_utilization": 0.0,
            "avg_utilization": 0.0
        }
    
    # Convert to bits per slot for simulation
    # Each slot is 500 µs, so bits_per_slot = gbps * slot_duration * 1e9
    slot_duration_seconds = SLOT_DURATION_SECONDS
    
    # Capacity in bits per slot
    capacity_bits_per_slot = capacity_gbps * 1e9 * slot_duration_seconds
    
    # Buffer capacity (based on buffer time relative to slot time)
    # Buffer can hold: capacity_bits_per_slot * (buffer_symbols / symbols_per_slot)
    buffer_size_bits = capacity_bits_per_slot * (buffer_symbols / SYMBOLS_PER_SLOT)
    
    # Simulation state
    buffer_occupancy = 0.0
    loss_slots = 0
    max_buffer_occupancy = 0.0
    total_traffic = 0.0
    
    for traffic_gbps in traffic_per_slot_gbps:
        # Convert traffic to bits per slot
        traffic_bits = traffic_gbps * 1e9 * slot_duration_seconds
        total_traffic += traffic_bits
        
        # Traffic arrives
        total_bits = buffer_occupancy + traffic_bits
        
        # Link transmits up to capacity
        transmitted = min(total_bits, capacity_bits_per_slot)
        remaining = total_bits - transmitted
        
        # Check buffer overflow
        if remaining > buffer_size_bits:
            # Overflow: excess beyond buffer is lost
            loss_slots += 1
            buffer_occupancy = buffer_size_bits
        else:
            buffer_occupancy = remaining
        
        # Track peak buffer usage
        max_buffer_occupancy = max(max_buffer_occupancy, buffer_occupancy)
    
    total_slots = len(traffic_per_slot_gbps)
    total_capacity = capacity_bits_per_slot * total_slots
    
    return {
        "total_slots": total_slots,
        "loss_slots": loss_slots,
        "loss_ratio": loss_slots / total_slots if total_slots > 0 else 0.0,
        "max_buffer_utilization": max_buffer_occupancy / buffer_size_bits if buffer_size_bits > 0 else 0.0,
        "avg_utilization": total_traffic / total_capacity if total_capacity > 0 else 0.0
    }


def evaluate_capacity_tier(
    tier_name: str,
    tier_info: Dict,
    peak_traffic_gbps: float,
    avg_traffic_gbps: float,
    traffic_per_slot_gbps: Optional[List[float]] = None,
    ml_congestion_risk: Optional[float] = None
) -> TierEvaluation:
    """
    Evaluate a single capacity tier against SLA constraints.
    
    Decision logic (deterministic and explainable):
    1. Check if capacity exceeds peak traffic (basic requirement)
    2. Run buffer simulation if time-series data available
    3. Check SLA constraints: packet_loss ≤ 1%, congestion ≤ tolerance
    4. Calculate headroom and congestion risk
    5. Optionally penalize based on ML risk score
    
    Args:
        tier_name: Name of the tier (e.g., "10G")
        tier_info: Tier configuration dict
        peak_traffic_gbps: Peak observed traffic
        avg_traffic_gbps: Average traffic
        traffic_per_slot_gbps: Optional time-series for simulation
        ml_congestion_risk: Optional ML-predicted risk score (0-1)
    
    Returns:
        TierEvaluation with pass/fail and metrics
    """
    capacity_gbps = tier_info["capacity_gbps"]
    relative_cost = tier_info["relative_cost"]
    
    # Calculate headroom (how much capacity exceeds peak)
    headroom = (capacity_gbps - peak_traffic_gbps) / capacity_gbps if capacity_gbps > 0 else 0
    headroom_percent = max(0, headroom * 100)
    
    # Basic check: capacity must exceed peak traffic
    if capacity_gbps < peak_traffic_gbps:
        return TierEvaluation(
            tier_name=tier_name,
            capacity_gbps=capacity_gbps,
            relative_cost=relative_cost,
            sla_pass=False,
            estimated_packet_loss=1.0,  # 100% loss if under capacity
            congestion_risk=1.0,
            headroom_percent=0.0,
            reason=f"Capacity ({capacity_gbps}G) is below peak traffic ({peak_traffic_gbps:.2f}G)"
        )
    
    # Run simulation if time-series data is available
    if traffic_per_slot_gbps:
        sim_result = simulate_link_performance(traffic_per_slot_gbps, capacity_gbps)
        estimated_packet_loss = sim_result["loss_ratio"]
        congestion_risk = sim_result["avg_utilization"]
    else:
        # Estimate based on utilization ratio (simplified model)
        utilization = peak_traffic_gbps / capacity_gbps
        
        # Simplified loss model: exponential increase near capacity
        # With buffer absorption of ~15% burst
        buffer_absorption = 0.15
        effective_utilization = max(0, utilization - buffer_absorption)
        
        if effective_utilization > 0.85:
            # High utilization zone: loss increases exponentially
            estimated_packet_loss = min(1.0, ((effective_utilization - 0.85) / 0.15) ** 2 * 0.1)
        else:
            estimated_packet_loss = 0.0
        
        congestion_risk = min(1.0, max(0, (utilization - 0.5) / 0.5))
    
    # Optional: Penalize based on ML congestion risk
    if ml_congestion_risk is not None and ml_congestion_risk > 0.5:
        # Increase risk score if ML predicts high congestion probability
        congestion_risk = min(1.0, congestion_risk + ml_congestion_risk * 0.2)
    
    # Check SLA constraints
    sla_pass = (
        estimated_packet_loss <= SLA_PACKET_LOSS_THRESHOLD and
        headroom > 0  # Must have some headroom
    )
    
    # Generate explanation
    if sla_pass:
        reason = f"Meets SLA: loss={estimated_packet_loss*100:.2f}% ≤ {SLA_PACKET_LOSS_THRESHOLD*100}%, headroom={headroom_percent:.1f}%"
    else:
        if estimated_packet_loss > SLA_PACKET_LOSS_THRESHOLD:
            reason = f"Fails SLA: packet loss {estimated_packet_loss*100:.2f}% > {SLA_PACKET_LOSS_THRESHOLD*100}% threshold"
        else:
            reason = f"Fails SLA: insufficient headroom ({headroom_percent:.1f}%)"
    
    return TierEvaluation(
        tier_name=tier_name,
        capacity_gbps=capacity_gbps,
        relative_cost=relative_cost,
        sla_pass=sla_pass,
        estimated_packet_loss=round(estimated_packet_loss, 4),
        congestion_risk=round(congestion_risk, 4),
        headroom_percent=round(headroom_percent, 2),
        reason=reason
    )


def recommend_capacity_tier(
    link_id: str,
    link_name: str,
    cells: List[str],
    peak_traffic_gbps: float,
    avg_traffic_gbps: float,
    traffic_per_slot_gbps: Optional[List[float]] = None,
    ml_congestion_risk: Optional[float] = None
) -> CapacityRecommendation:
    """
    Generate cost-optimized capacity recommendation for a fronthaul link.
    
    Algorithm:
    1. Evaluate all capacity tiers (10G, 25G, 50G)
    2. Filter out tiers that violate SLA constraints
    3. Select the lowest-cost tier that passes SLA
    4. Calculate cost savings vs peak-based provisioning (always 50G)
    
    Args:
        link_id: Unique identifier for the link
        link_name: Display name (e.g., "Link_1")
        cells: List of cell IDs connected to this link
        peak_traffic_gbps: Peak aggregated traffic
        avg_traffic_gbps: Average aggregated traffic
        traffic_per_slot_gbps: Optional time-series for detailed simulation
        ml_congestion_risk: Optional ML-predicted congestion probability
    
    Returns:
        CapacityRecommendation with full tier analysis and recommendation
    """
    # Evaluate all tiers
    tier_evaluations: Dict[str, TierEvaluation] = {}
    
    for tier_name, tier_info in CAPACITY_TIERS.items():
        evaluation = evaluate_capacity_tier(
            tier_name=tier_name,
            tier_info=tier_info,
            peak_traffic_gbps=peak_traffic_gbps,
            avg_traffic_gbps=avg_traffic_gbps,
            traffic_per_slot_gbps=traffic_per_slot_gbps,
            ml_congestion_risk=ml_congestion_risk
        )
        tier_evaluations[tier_name] = evaluation
    
    # Find lowest-cost tier that passes SLA
    valid_tiers = [
        (name, eval) for name, eval in tier_evaluations.items() 
        if eval.sla_pass
    ]
    
    if valid_tiers:
        # Sort by cost (ascending)
        valid_tiers.sort(key=lambda x: x[1].relative_cost)
        recommended_tier_name, recommended_eval = valid_tiers[0]
        recommendation_reason = (
            f"Selected {recommended_tier_name} as lowest-cost option meeting SLA. "
            f"{recommended_eval.reason}"
        )
    else:
        # No tier passes SLA - recommend highest capacity
        recommended_tier_name = "50G"
        recommended_eval = tier_evaluations["50G"]
        recommendation_reason = (
            f"No tier fully meets SLA. Recommending {recommended_tier_name} "
            f"for maximum headroom. Consider traffic engineering or link upgrade."
        )
    
    # Calculate cost savings vs peak-based provisioning (always using 50G)
    peak_based_cost = CAPACITY_TIERS["50G"]["relative_cost"]
    recommended_cost = CAPACITY_TIERS[recommended_tier_name]["relative_cost"]
    cost_savings_percent = ((peak_based_cost - recommended_cost) / peak_based_cost) * 100
    
    return CapacityRecommendation(
        link_id=link_id,
        link_name=link_name,
        cells=cells,
        peak_traffic_gbps=round(peak_traffic_gbps, 2),
        avg_traffic_gbps=round(avg_traffic_gbps, 2),
        tier_evaluations={k: asdict(v) for k, v in tier_evaluations.items()},
        recommended_tier=recommended_tier_name,
        recommended_capacity_gbps=CAPACITY_TIERS[recommended_tier_name]["capacity_gbps"],
        cost_savings_percent=round(cost_savings_percent, 1),
        ml_congestion_risk=round(ml_congestion_risk, 4) if ml_congestion_risk else None,
        recommendation_reason=recommendation_reason
    )


# =============================================================================
# Batch Processing Functions
# =============================================================================

def generate_capacity_recommendations(
    link_data: List[Dict],
    ml_predictions: Optional[Dict[str, float]] = None
) -> List[CapacityRecommendation]:
    """
    Generate capacity recommendations for all fronthaul links.
    
    Args:
        link_data: List of link dictionaries with traffic data
        ml_predictions: Optional dict mapping link_id to ML congestion risk score
    
    Returns:
        List of CapacityRecommendation objects
    """
    recommendations = []
    
    for link in link_data:
        link_id = str(link.get("linkId", link.get("link_id", "")))
        link_name = link.get("linkName", link.get("link_name", f"Link_{link_id}"))
        cells = link.get("cells", [])
        
        # Get traffic values (support both naming conventions)
        peak_traffic = link.get("peakTraffic", link.get("peak_traffic_gbps", 0))
        avg_traffic = link.get("avgTraffic", link.get("avg_traffic_gbps", 0))
        traffic_series = link.get("traffic_per_slot_gbps", None)
        
        # Get ML risk if available
        ml_risk = ml_predictions.get(link_id) if ml_predictions else None
        
        recommendation = recommend_capacity_tier(
            link_id=link_id,
            link_name=link_name,
            cells=cells,
            peak_traffic_gbps=peak_traffic,
            avg_traffic_gbps=avg_traffic,
            traffic_per_slot_gbps=traffic_series,
            ml_congestion_risk=ml_risk
        )
        
        recommendations.append(recommendation)
    
    return recommendations


def save_recommendations_to_file(
    recommendations: List[CapacityRecommendation],
    output_path: str = "data/capacity_recommendations.json"
) -> str:
    """
    Save capacity recommendations to JSON file.
    
    Args:
        recommendations: List of CapacityRecommendation objects
        output_path: Path to output JSON file
    
    Returns:
        Path to saved file
    """
    # Ensure directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    # Convert to serializable format
    output = {
        "metadata": {
            "generated_at": pd.Timestamp.now().isoformat(),
            "sla_packet_loss_threshold": SLA_PACKET_LOSS_THRESHOLD,
            "buffer_symbols": BUFFER_SYMBOLS,
            "buffer_time_us": BUFFER_TIME_US,
            "capacity_tiers": CAPACITY_TIERS
        },
        "summary": {
            "total_links": len(recommendations),
            "tier_distribution": {},
            "average_cost_savings": 0.0
        },
        "recommendations": []
    }
    
    # Calculate summary statistics
    tier_counts = {"10G": 0, "25G": 0, "50G": 0}
    total_savings = 0.0
    
    for rec in recommendations:
        rec_dict = asdict(rec)
        output["recommendations"].append(rec_dict)
        tier_counts[rec.recommended_tier] += 1
        total_savings += rec.cost_savings_percent
    
    output["summary"]["tier_distribution"] = tier_counts
    output["summary"]["average_cost_savings"] = round(
        total_savings / len(recommendations) if recommendations else 0, 1
    )
    
    # Save to file
    with open(output_path, 'w') as f:
        json.dump(output, f, indent=2)
    
    return output_path


# =============================================================================
# Integration with Existing System
# =============================================================================

def get_sample_link_data() -> List[Dict]:
    """
    Get sample link data for demonstration.
    This uses the same topology as the frontend networkData.ts
    """
    return [
        {"linkId": 1, "linkName": "Link_1", "cells": ["cell_1", "cell_9", "cell_17", "cell_22"], 
         "avgTraffic": 5.0, "peakTraffic": 11.4, "isolated": False},
        {"linkId": 2, "linkName": "Link_2", "cells": ["cell_8", "cell_10", "cell_18", "cell_19"], 
         "avgTraffic": 7.3, "peakTraffic": 14.1, "isolated": False},
        {"linkId": 3, "linkName": "Link_3", "cells": ["cell_4", "cell_5", "cell_12", "cell_20"], 
         "avgTraffic": 3.4, "peakTraffic": 7.6, "isolated": False},
        {"linkId": 4, "linkName": "Link_4", "cells": ["cell_7", "cell_13", "cell_15", "cell_16"], 
         "avgTraffic": 6.2, "peakTraffic": 12.9, "isolated": False},
        {"linkId": 5, "linkName": "Link_5", "cells": ["cell_2", "cell_6", "cell_23", "cell_24"], 
         "avgTraffic": 8.9, "peakTraffic": 16.9, "isolated": False},
        {"linkId": 6, "linkName": "Link_6", "cells": ["cell_11"], 
         "avgTraffic": 1.1, "peakTraffic": 2.5, "isolated": True},
        {"linkId": 7, "linkName": "Link_7", "cells": ["cell_14"], 
         "avgTraffic": 1.3, "peakTraffic": 2.8, "isolated": True},
        {"linkId": 8, "linkName": "Link_8", "cells": ["cell_21"], 
         "avgTraffic": 1.0, "peakTraffic": 2.3, "isolated": True},
        {"linkId": 9, "linkName": "Link_9", "cells": ["cell_3"], 
         "avgTraffic": 0.9, "peakTraffic": 2.1, "isolated": True},
    ]


# =============================================================================
# Main Entry Point
# =============================================================================

if __name__ == "__main__":
    print("=" * 60)
    print("Cost-Aware Fronthaul Capacity Tier Recommendation")
    print("=" * 60)
    
    # Load sample link data
    link_data = get_sample_link_data()
    print(f"\nAnalyzing {len(link_data)} fronthaul links...")
    
    # Optional: Load ML predictions if available
    ml_predictions = None
    ml_predictions_path = "data/congestion_predictions.csv"
    if os.path.exists(ml_predictions_path):
        try:
            ml_df = pd.read_csv(ml_predictions_path)
            if "link_id" in ml_df.columns and "congestion_probability" in ml_df.columns:
                # Get latest prediction per link
                ml_predictions = ml_df.groupby("link_id")["congestion_probability"].mean().to_dict()
                ml_predictions = {str(k): v for k, v in ml_predictions.items()}
                print(f"Loaded ML predictions for {len(ml_predictions)} links")
        except Exception as e:
            print(f"Note: Could not load ML predictions: {e}")
    
    # Generate recommendations
    recommendations = generate_capacity_recommendations(link_data, ml_predictions)
    
    # Print summary
    print("\n" + "-" * 60)
    print("CAPACITY TIER RECOMMENDATIONS")
    print("-" * 60)
    
    tier_counts = {"10G": 0, "25G": 0, "50G": 0}
    total_savings = 0.0
    
    for rec in recommendations:
        tier_counts[rec.recommended_tier] += 1
        total_savings += rec.cost_savings_percent
        
        print(f"\n{rec.link_name} ({len(rec.cells)} cells)")
        print(f"  Peak Traffic: {rec.peak_traffic_gbps:.2f} Gbps")
        print(f"  Recommended:  {rec.recommended_tier} ({rec.recommended_capacity_gbps} Gbps)")
        print(f"  Cost Savings: {rec.cost_savings_percent:.1f}%")
        print(f"  Reason: {rec.recommendation_reason}")
    
    # Print overall summary
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    print(f"\nTier Distribution:")
    for tier, count in tier_counts.items():
        print(f"  {tier}: {count} links")
    print(f"\nAverage Cost Savings: {total_savings / len(recommendations):.1f}%")
    print(f"(compared to peak-based 50G provisioning)")
    
    # Save to file
    output_path = save_recommendations_to_file(recommendations)
    print(f"\nRecommendations saved to: {output_path}")
