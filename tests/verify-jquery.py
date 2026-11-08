"""Compatibility entry point: use current Endterm verification for active scripts."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name('verify-endterm.py')),run_name='__main__')
