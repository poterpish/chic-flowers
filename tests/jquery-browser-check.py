"""Compatibility entry point for the newer Endterm browser interaction test."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name('endterm-browser-check.py')),run_name='__main__')
