"""
Quick Test Runner for Waitlist Tests

This script runs a subset of critical tests to verify the test suite works.
"""

import sys
import os

# Add the project root to Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

# Set testing environment
os.environ["TESTING"] = "true"
os.environ["LOGFIRE_IGNORE_NO_CONFIG"] = "1"

# Import pytest
import pytest

if __name__ == "__main__":
    # Run tests with minimal output
    sys.exit(pytest.main([
        'src/tests/waitlist/',
        '-v',
        '--tb=short',
        '--maxfail=5',  # Stop after 5 failures
        '-x',  # Stop on first failure
    ]))
