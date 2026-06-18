#!/usr/bin/env python3
"""
CI gate for Snyk Python dependency scans.

Fails the build on any high/critical vulnerability EXCEPT for packages that have
been formally risk-accepted because they cannot be upgraded under the project's
current constraints (see ``SUPPRESSED_PACKAGES``). This is package-scoped on
purpose: it means a newly-published CVE for an already-accepted package does not
silently break CI again, while a vulnerability in any *other* package still does.

Usage:
    snyk test ... --json-file-output=snyk-python.json || true
    python3 .github/scripts/snyk_gate.py snyk-python.json
"""

import json
import sys

# Packages whose high/critical vulnerabilities are knowingly accepted.
# Keep this set as small as possible and document every entry.
SUPPRESSED_PACKAGES = {
    # starlette: the only fixed releases are 1.x, which require fastapi>=0.128.3
    # and pydantic>=2.7. This project is pinned to pydantic<2.0.0, and the app is
    # incompatible with starlette 1.x (FastAPI 0.125 still calls
    # Router(on_startup=...), which starlette 1.x removed). The vulnerable
    # surfaces are unused: no StaticFiles mounts and no request.form() calls.
    "starlette",
}

BLOCKING_SEVERITIES = {"high", "critical"}


def main(path: str) -> int:
    try:
        with open(path, encoding="utf-8") as handle:
            data = json.load(handle)
    except (OSError, ValueError) as exc:
        # A missing or unparsable report means the scan did not run as expected.
        # Fail closed rather than masking a real Snyk error behind ``|| true``.
        print(f"snyk_gate: could not read Snyk report '{path}': {exc}", file=sys.stderr)
        return 2

    # `snyk test --json` emits an object for one project or a list for several.
    projects = data if isinstance(data, list) else [data]

    blocking: list[str] = []
    suppressed: set[str] = set()
    for project in projects:
        for vuln in project.get("vulnerabilities", []):
            if vuln.get("severity") not in BLOCKING_SEVERITIES:
                continue
            package = vuln.get("packageName")
            if package in SUPPRESSED_PACKAGES:
                suppressed.add(package)
                continue
            blocking.append(
                f"{vuln.get('id')}  {package}@{vuln.get('version')}  ({vuln.get('severity')})"
            )

    if suppressed:
        print(
            "snyk_gate: suppressing risk-accepted package(s): "
            + ", ".join(sorted(suppressed))
        )

    if blocking:
        print("snyk_gate: blocking high/critical vulnerabilities found:")
        for line in sorted(set(blocking)):
            print(f"  - {line}")
        return 1

    print("snyk_gate: no blocking vulnerabilities.")
    return 0


if __name__ == "__main__":
    report = sys.argv[1] if len(sys.argv) > 1 else "snyk-python.json"
    sys.exit(main(report))
