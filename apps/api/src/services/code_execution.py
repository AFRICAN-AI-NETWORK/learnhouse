import asyncio
import os
import subprocess  # nosec B404
import tempfile
import time
from typing import Dict, List, Optional

import httpx
from pydantic import BaseModel

PISTON_URL = os.getenv("PISTON_URL", "http://localhost:2000")


class TestCaseResult(BaseModel):
    testUUID: str
    input: str
    expected_output: str
    actual_output: str
    passed: bool
    status: str


class CodeExecutionResponse(BaseModel):
    stdout: str
    stderr: str
    exit_code: int = 0
    execution_time_ms: int = 0
    test_results: Optional[List[TestCaseResult]] = None
    passed_count: int = 0
    total_count: int = 0


def run_python_locally(code: str, stdin: str = "", timeout: int = 10) -> dict:
    """Run Python code locally using subprocess. Returns dict with stdout, stderr, exit_code."""
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".py", delete=False, encoding="utf-8"
    ) as f:
        f.write(code)
        tmp_path = f.name
    try:
        result = subprocess.run(
            ["python", tmp_path],
            input=stdin.replace("\\n", "\n") if stdin else "",
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "exit_code": result.returncode,
        }
    except subprocess.TimeoutExpired:
        return {"stdout": "", "stderr": "Execution timed out", "exit_code": 1}
    except Exception as e:
        return {"stdout": "", "stderr": str(e), "exit_code": 1}
    finally:
        os.unlink(tmp_path)


async def run_piston_execution(
    language: str,
    version: str,
    code: str,
    stdin: str = "",
    client_ip: str = "unknown",
    additional_files: List[Dict] = [],
):
    # Map language to proper file extension
    ext_map = {
        "python": "py",
        "javascript": "js",
        "java": "java",
        "c": "c",
        "cpp": "cpp",
        "go": "go",
        "ruby": "rb",
    }
    file_ext = ext_map.get(language, language)

    files = [{"name": f"main.{file_ext}", "content": code}]
    if additional_files:
        files.extend(additional_files)

    piston_payload = {
        "language": language,
        "version": version,
        "files": files,
        "stdin": stdin.replace("\\n", "\n") if stdin else "",
        "compile_timeout": 15000,
        "run_timeout": 15000,
    }

    # Retry logic for network flakiness
    max_retries = 2
    headers = {"X-Forwarded-For": client_ip, "X-LearnHouse-Client": client_ip}
    for attempt in range(max_retries):
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{PISTON_URL}/api/v2/execute",
                    json=piston_payload,
                    headers=headers,
                    timeout=35.0,
                )
                if response.status_code != 200:
                    print(
                        f"[Piston] Non-200 response ({response.status_code}) on attempt {attempt + 1}: {response.text}"
                    )
                    if attempt < max_retries - 1:
                        continue
                    return None
                return response.json()
            except Exception as e:
                print(
                    f"[Piston] Execution error for {language} on attempt {attempt + 1}: {e}"
                )
                if attempt < max_retries - 1:
                    await asyncio.sleep(1)  # Small delay before retry
                    continue
                return None


async def execute_and_grade(
    language: str,
    code: str,
    test_cases: List[Dict] = [],
    stdin: str = "",
    client_ip: str = "unknown",
    dataset_files: List[Dict] = [],
):
    version_map = {
        "python": "3.10.0",
        "javascript": "*",
        "java": "*",
        "c": "*",
        "cpp": "*",
        "go": "*",
        "ruby": "*",
    }
    version = version_map.get(language, "*")

    # 1. Main execution via Piston
    main_res = await run_piston_execution(
        language, version, code, stdin, client_ip, dataset_files
    )

    # Piston succeeded
    if main_res:
        run_result = main_res.get("run", {})
        response = CodeExecutionResponse(
            stdout=run_result.get("stdout", ""),
            stderr=run_result.get("stderr", ""),
            exit_code=run_result.get("code", 0) or 0,
            test_results=[],
            passed_count=0,
            total_count=len(test_cases),
        )

        # 2. Run Test Cases via Piston
        if test_cases:
            for tc in test_cases:
                tc_res = await run_piston_execution(
                    language,
                    version,
                    code,
                    tc.get("input", ""),
                    client_ip,
                    dataset_files,
                )
                if tc_res:
                    tc_run = tc_res.get("run", {})
                    actual = tc_run.get("stdout", "").strip()
                    expected = tc.get("expectedOutput", "").strip()
                    passed = actual == expected
                    if passed:
                        response.passed_count += 1

                    response.test_results.append(
                        TestCaseResult(
                            testUUID=tc.get("testUUID", ""),
                            input=tc.get("input", ""),
                            expected_output=expected,
                            actual_output=actual,
                            passed=passed,
                            status="passed" if passed else "failed",
                        )
                    )

        return response

    # Piston failed — fallback to local Python execution
    if language == "python":
        start_time = time.time()
        main_run = run_python_locally(code, stdin)
        elapsed_ms = int((time.time() - start_time) * 1000)

        test_results = []
        passed_count = 0

        if test_cases:
            for tc in test_cases:
                tc_run = run_python_locally(code, tc.get("input", ""))
                actual = tc_run["stdout"].strip()
                expected = tc.get("expectedOutput", "").strip()
                passed = actual == expected
                if passed:
                    passed_count += 1
                test_results.append(
                    TestCaseResult(
                        testUUID=tc.get("testUUID", ""),
                        input=tc.get("input", ""),
                        expected_output=expected,
                        actual_output=actual,
                        passed=passed,
                        status="passed" if passed else "failed",
                    )
                )

        return CodeExecutionResponse(
            stdout=main_run["stdout"],
            stderr=main_run["stderr"],
            exit_code=main_run["exit_code"],
            execution_time_ms=elapsed_ms,
            test_results=test_results,
            passed_count=passed_count,
            total_count=len(test_cases),
        )

    # Non-Python + no Piston = can't execute
    return None
