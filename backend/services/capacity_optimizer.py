"""
Capacity Optimizer - Cost-Aware Capacity Tier Recommendation
============================================================

A deterministic, SLA-aware decision module that recommends the lowest-cost
Ethernet capacity tier satisfying SLA constraints.

This is NOT ML. This is constraint-based optimization.

Capacity Tiers:
    - 10 Gbps (lowest cost)
    - 25 Gbps (medium cost)  
    - 50 Gbps (highest cost)

SLA Constraints:
    - Packet loss ≤ 1% of traffic-carrying slots
    - Buffer: 4 symbols (143 µs)

Algorithm:
    1. For each link, simulate traffic through each capacity tier
    2. Model FIFO buffer behavior
    3. Count packet loss events
    4. Reject tiers that violate SLA
    5. Select lowest-cost tier that passes SLA
"""

from typing import Dict, List, Tuple


# =============================================================================
# CONSTANTS
# =============================================================================

# Capacity tiers in Gbps (ordered by cost, lowest first)
CAPACITY_TIERS = [10, 25, 50]

# Cost indices (relative cost)
TIER_COSTS = {10: 1.0, 25: 2.5, 50: 5.0}

# SLA Parameters
SLA_MAX_LOSS_PERCENT = 1.0  # Maximum 1% packet loss allowed
BUFFER_SYMBOLS = 4          # Buffer size in symbols
SYMBOLS_PER_SLOT = 14       # 14 symbols per slot
SLOT_DURATION_US = 500      # 500 microseconds per slot


# =============================================================================
# CORE SIMULATION
# =============================================================================

def gbps_to_bits_per_slot(gbps: float) -> float:
    """
    Convert Gbps to bits per slot.
    
    1 slot = 500 µs = 0.0005 seconds
    bits_per_slot = gbps * 1e9 * 0.0005
    """
    return gbps * 1e9 * (SLOT_DURATION_US / 1e6)


def simulate_link(traffic_bits_per_slot: List[float], capacity_gbps: int) -> dict:
    """
    Simulate traffic flow through a link with FIFO buffer.
    
    Args:
        traffic_bits_per_slot: List of traffic in bits for each slot
        capacity_gbps: Link capacity in Gbps
        
    Returns:
        Simulation results including loss percentage and SLA status
    """
    # Convert capacity to bits per slot
    capacity_bits = gbps_to_bits_per_slot(capacity_gbps)
    
    # Buffer can hold: capacity * (buffer_symbols / symbols_per_slot)
    buffer_capacity = capacity_bits * (BUFFER_SYMBOLS / SYMBOLS_PER_SLOT)
    
    # Simulation state
    buffer_fill = 0.0
    loss_slots = 0
    traffic_slots = 0  # Slots with actual traffic
    
    for traffic in traffic_bits_per_slot:
        # Skip empty slots
        if traffic <= 0:
            # Drain buffer even in empty slots
            buffer_fill = max(0, buffer_fill - capacity_bits)
            continue
            
        traffic_slots += 1
        
        # Add incoming traffic to buffer
        buffer_fill += traffic
        
        # Transmit up to capacity
        transmitted = min(buffer_fill, capacity_bits)
        buffer_fill -= transmitted
        
        # Check for overflow (loss)
        if buffer_fill > buffer_capacity:
            loss_slots += 1
            buffer_fill = buffer_capacity  # Excess is dropped
    
    # Calculate loss percentage over traffic-carrying slots only
    loss_percent = (loss_slots / traffic_slots * 100) if traffic_slots > 0 else 0.0
    sla_pass = loss_percent <= SLA_MAX_LOSS_PERCENT
    
    return {
        "capacity_gbps": capacity_gbps,
        "total_slots": len(traffic_bits_per_slot),
        "traffic_slots": traffic_slots,
        "loss_slots": loss_slots,
        "loss_percent": round(loss_percent, 2),
        "sla_pass": sla_pass
    }


def evaluate_link(link_id: str, cells: List[str], traffic_bits_per_slot: List[float]) -> dict:
    """
    Evaluate all capacity tiers for a single link and recommend the best one.
    
    Args:
        link_id: Link identifier
        cells: List of cell IDs connected to this link
        traffic_bits_per_slot: Aggregated traffic in bits per slot
        
    Returns:
        Complete evaluation with recommendation
    """
    # Calculate traffic statistics
    peak_bits = max(traffic_bits_per_slot) if traffic_bits_per_slot else 0
    peak_gbps = peak_bits / gbps_to_bits_per_slot(1)  # Convert back to Gbps
    
    avg_bits = sum(traffic_bits_per_slot) / len(traffic_bits_per_slot) if traffic_bits_per_slot else 0
    avg_gbps = avg_bits / gbps_to_bits_per_slot(1)
    
    # Evaluate each tier
    tier_results = {}
    for tier in CAPACITY_TIERS:
        result = simulate_link(traffic_bits_per_slot, tier)
        tier_results[tier] = result
    
    # Find lowest-cost tier that passes SLA
    recommended_tier = None
    for tier in CAPACITY_TIERS:  # Already sorted by cost
        if tier_results[tier]["sla_pass"]:
            recommended_tier = tier
            break
    
    # If no tier passes, use the highest (50G)
    if recommended_tier is None:
        recommended_tier = CAPACITY_TIERS[-1]
        reason = f"No tier meets SLA. Using {recommended_tier}G (highest available)."
    else:
        loss = tier_results[recommended_tier]["loss_percent"]
        if loss == 0:
            reason = f"Zero packet loss with {BUFFER_SYMBOLS}-symbol buffer"
        else:
            reason = f"Meets SLA with {loss}% loss (≤{SLA_MAX_LOSS_PERCENT}%)"
    
    # Calculate what peak-based provisioning would choose
    peak_based_tier = CAPACITY_TIERS[-1]  # Naive: always use 50G
    for tier in CAPACITY_TIERS:
        if tier >= peak_gbps:
            peak_based_tier = tier
            break
    
    # Cost savings vs peak-based
    rec_cost = TIER_COSTS[recommended_tier]
    peak_cost = TIER_COSTS[peak_based_tier]
    savings = ((peak_cost - rec_cost) / peak_cost * 100) if peak_cost > 0 else 0
    
    return {
        "link_id": link_id,
        "cells": cells,
        "peak_traffic_gbps": round(peak_gbps, 2),
        "avg_traffic_gbps": round(avg_gbps, 2),
        "recommended_tier": f"{recommended_tier}G",
        "recommended_tier_gbps": recommended_tier,
        "reason": reason,
        "cost_savings_percent": round(max(0, savings), 0),
        "peak_based_tier": f"{peak_based_tier}G",
        "tier_evaluation": {
            f"{t}G": {
                "loss_percent": tier_results[t]["loss_percent"],
                "sla_pass": tier_results[t]["sla_pass"],
                "loss_slots": tier_results[t]["loss_slots"],
                "traffic_slots": tier_results[t]["traffic_slots"]
            }
            for t in CAPACITY_TIERS
        }
    }


def optimize_all_links(topology: Dict[str, str], link_traffic: Dict[str, List[float]]) -> dict:
    """
    Generate capacity recommendations for all links.
    
    Args:
        topology: Mapping of cell_id -> link_id
        link_traffic: Mapping of link_id -> traffic bits per slot
        
    Returns:
        Complete recommendations for all links
    """
    # Group cells by link
    link_cells = {}
    for cell_id, link_id in topology.items():
        if link_id not in link_cells:
            link_cells[link_id] = []
        link_cells[link_id].append(cell_id)
    
    # Evaluate each link
    links = []
    total_rec_cost = 0
    total_peak_cost = 0
    
    for link_id in sorted(link_cells.keys()):
        cells = sorted(link_cells[link_id])
        traffic = link_traffic.get(link_id, [])
        
        if not traffic:
            continue
            
        result = evaluate_link(link_id, cells, traffic)
        links.append(result)
        
        # Accumulate costs
        total_rec_cost += TIER_COSTS[result["recommended_tier_gbps"]]
        peak_tier = int(result["peak_based_tier"].replace("G", ""))
        total_peak_cost += TIER_COSTS[peak_tier]
    
    # Overall savings
    overall_savings = 0
    if total_peak_cost > 0:
        overall_savings = (total_peak_cost - total_rec_cost) / total_peak_cost * 100
    
    return {
        "links": links,
        "summary": {
            "total_links": len(links),
            "overall_cost_savings_percent": round(overall_savings, 0),
            "sla_parameters": {
                "max_loss_percent": SLA_MAX_LOSS_PERCENT,
                "buffer_symbols": BUFFER_SYMBOLS,
                "buffer_time_us": round(BUFFER_SYMBOLS * SLOT_DURATION_US / SYMBOLS_PER_SLOT, 0)
            },
            "tiers_evaluated": [f"{t}G" for t in CAPACITY_TIERS]
        }
    }
