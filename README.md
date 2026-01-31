# 5G Fronthaul Topology Inference

Academic prototype for Nokia Hackathon - Evaluation 1

## Problem

Infer hidden network topology from 5G fronthaul traffic logs. 24 cells share unknown Ethernet links — we detect which cells share links by analyzing congestion correlation.

## Solution

Deterministic pipeline (no ML):
1. **Load Data** — Parse 48 Nokia `.dat` files (2.2M rows)
2. **Detect Congestion** — Flag timestamps with packet loss
3. **Compute Correlation** — Pairwise congestion overlap between cells
4. **Infer Topology** — Group correlated cells into shared links

## Results

- **24 cells** → **9 inferred links**
- **32,126 congestion events** detected
- Cells on same link show **87-97% correlation**
- Cells on different links show **<1% correlation**

## Quick Start

```bash
cd backend
pip install -r requirements.txt
python demo_eval1.py
```

## Project Structure

```
backend/
├── app.py                 # Flask API
├── demo_eval1.py          # Evaluation demo script
├── services/
│   ├── data_loader.py     # Load CSV or .dat files
│   ├── raw_data_parser.py # Parse Nokia .dat format
│   ├── congestion.py      # Congestion detection
│   ├── correlation.py     # Pairwise correlation
│   └── topology.py        # Link inference
└── data/
    ├── raw/               # Nokia .dat files (not in git)
    └── eval1_results.json # Analysis output
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Project info |
| `/health` | GET | Health check |
| `/analyze` | GET | Run full pipeline |

## Team

Nokia Hackathon 2026
