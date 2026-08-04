import os
import sys

# Ensure src/ is on the Python path for all tests
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

# Set testing environment variable to use SQLite
os.environ["TESTING"] = "true"

# Suppress logfire warnings in tests
os.environ["LOGFIRE_IGNORE_NO_CONFIG"] = "1"

os.environ["BANK_DATA_ENCRYPTION_KEY"] = "dar6V6G6qCBu7d_wO0CRIOyVZ7UxfNonSP_eRN7zHlc="
