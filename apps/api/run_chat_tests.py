"""
Chat System Test Runner

Run comprehensive tests for the chat system with various options.

Usage:
    python run_chat_tests.py                    # Run all tests
    python run_chat_tests.py --critical         # Run only critical tests
    python run_chat_tests.py --coverage         # Run with coverage report
    python run_chat_tests.py --verbose          # Run with detailed output
    python run_chat_tests.py --fast             # Run in parallel
"""

import sys
import subprocess
import argparse
from pathlib import Path


def run_command(cmd, description):
    """Run a command and handle output."""
    print(f"\n{'=' * 60}")
    print(f"  {description}")
    print(f"{'=' * 60}\n")

    result = subprocess.run(cmd)

    if result.returncode != 0:
        print(f"\n❌ {description} FAILED")
        return False
    else:
        print(f"\n✅ {description} PASSED")
        return True


def main():
    parser = argparse.ArgumentParser(description="Run chat system tests")
    parser.add_argument(
        "--critical", action="store_true", help="Run only critical tests"
    )
    parser.add_argument(
        "--coverage", action="store_true", help="Run with coverage report"
    )
    parser.add_argument(
        "--verbose", action="store_true", help="Run with verbose output"
    )
    parser.add_argument(
        "--fast",
        action="store_true",
        help="Run tests in parallel (requires pytest-xdist)",
    )
    parser.add_argument(
        "--file", type=str, help="Run specific test file (e.g., test_authorization.py)"
    )
    parser.add_argument(
        "--test",
        type=str,
        help="Run specific test (e.g., test_authorization.py::TestVerifyChatPermission::test_student_can_chat_with_instructor)",
    )

    args = parser.parse_args()

    # Base directory
    Path(__file__).parent

    # Build pytest command
    cmd_parts = ["pytest", "src/tests/chat/"]

    # Add specific file or test
    if args.test:
        cmd_parts = ["pytest", f"src/tests/chat/{args.test}"]
    elif args.file:
        cmd_parts = ["pytest", f"src/tests/chat/{args.file}"]
    elif args.critical:
        cmd_parts = [
            "pytest",
            "src/tests/chat/test_critical_scenarios.py::TestCriticalErrorScenarios",
            "src/tests/chat/test_authorization.py::TestVerifyChatPermission::test_student_cannot_chat_with_student",
        ]

    # Add verbosity
    if args.verbose:
        cmd_parts.append("-vv")
    else:
        cmd_parts.append("-v")

    # Add coverage
    if args.coverage:
        cmd_parts.extend(
            [
                "--cov=src/services/chat",
                "--cov=src/routers/chat",
                "--cov-report=html",
                "--cov-report=term-missing",
            ]
        )

    # Add parallel execution
    if args.fast:
        cmd_parts.extend(["-n", "auto"])

    # Add color output
    cmd_parts.append("--color=yes")

    # Run tests
    success = run_command(cmd_parts, "Chat System Tests")

    if args.coverage and success:
        print("\n" + "=" * 60)
        print("  Coverage report generated in htmlcov/index.html")
        print("=" * 60)

    if args.critical and success:
        print("\n" + "=" * 60)
        print("  ✅ All critical tests passed!")
        print("  The chat system is safe to deploy.")
        print("=" * 60)

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
