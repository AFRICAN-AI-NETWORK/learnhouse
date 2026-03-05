import sys
import os

# Ensure src/ is on the Python path for all tests
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

# Set testing environment variable to use SQLite
os.environ["TESTING"] = "true"

# Suppress logfire warnings in tests
os.environ["LOGFIRE_IGNORE_NO_CONFIG"] = "1"

# Set required encryption key for referral system tests
# Generated test key - not for production use
os.environ["BANK_DATA_ENCRYPTION_KEY"] = "test-key-for-testing-only-do-not-use-in-production-32bytes==" 