"""Make the worker package importable as top-level (config, models, pipeline...)
when running `pytest` from apps/worker/ or the repo root."""
import sys
from pathlib import Path

WORKER_DIR = Path(__file__).resolve().parent
if str(WORKER_DIR) not in sys.path:
    sys.path.insert(0, str(WORKER_DIR))
