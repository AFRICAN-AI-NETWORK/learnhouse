import asyncio
import os
import subprocess  # nosec B404
import tempfile
import time

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
    test_results: list[TestCaseResult] | None = None
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
    except Exception as e:  # noqa: BLE001
        return {"stdout": "", "stderr": str(e), "exit_code": 1}
    finally:
        os.unlink(tmp_path)


LANGUAGE_NORMALIZATION = {
    "js": "javascript",
    "javascript": "javascript",
    "node": "javascript",
    "nodejs": "javascript",
    "node.js": "javascript",
    "express": "javascript",
    "ts": "typescript",
    "typescript": "typescript",
    "py": "python",
    "python": "python",
    "python3": "python",
    "java": "java",
    "c": "c",
    "cpp": "cpp",
    "c++": "cpp",
    "golang": "go",
    "go": "go",
    "ruby": "ruby",
    "rust": "rust",
    "rs": "rust",
    "php": "php",
    "bash": "bash",
    "sh": "bash",
    "shell": "bash",
    "csharp": "csharp",
    "c#": "csharp",
    "cs": "csharp",
}

EXT_MAP = {
    "python": "py",
    "javascript": "js",
    "typescript": "ts",
    "java": "java",
    "c": "c",
    "cpp": "cpp",
    "go": "go",
    "ruby": "rb",
    "rust": "rs",
    "php": "php",
    "bash": "sh",
    "csharp": "cs",
}

VERSION_MAP = {
    "python": "*",
    "javascript": "*",
    "typescript": "*",
    "java": "*",
    "c": "*",
    "cpp": "*",
    "go": "*",
    "ruby": "*",
    "rust": "*",
    "php": "*",
    "bash": "*",
    "csharp": "*",
}


def run_node_locally(code: str, stdin: str = "", timeout: int = 10) -> dict:
    """Run Node.js / JavaScript code locally using subprocess. Returns dict with stdout, stderr, exit_code."""
    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".js", delete=False, encoding="utf-8"
    ) as f:
        f.write(code)
        tmp_path = f.name
    try:
        result = subprocess.run(
            ["node", tmp_path],
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
    except Exception as e:  # noqa: BLE001
        return {"stdout": "", "stderr": str(e), "exit_code": 1}
    finally:
        os.unlink(tmp_path)


async def run_piston_execution(
    language: str,
    version: str,
    code: str,
    stdin: str = "",
    client_ip: str = "unknown",
    additional_files: list[dict] | None = None,
):
    if additional_files is None:
        additional_files = []

    normalized_lang = LANGUAGE_NORMALIZATION.get(language.lower(), language.lower())
    file_ext = EXT_MAP.get(normalized_lang, normalized_lang)

    files = [{"name": f"main.{file_ext}", "content": code}]
    if additional_files:
        files.extend(additional_files)

    piston_payload = {
        "language": normalized_lang,
        "version": version or "*",
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
            except Exception as e:  # noqa: BLE001
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
    test_cases: list[dict] | None = None,
    stdin: str = "",
    client_ip: str = "unknown",
    dataset_files: list[dict] | None = None,
):
    if dataset_files is None:
        dataset_files = []
    if test_cases is None:
        test_cases = []

    normalized_lang = LANGUAGE_NORMALIZATION.get(language.lower(), language.lower())
    version = VERSION_MAP.get(normalized_lang, "*")

    # 1. Main execution via Piston
    main_res = await run_piston_execution(
        normalized_lang, version, code, stdin, client_ip, dataset_files
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
                    normalized_lang,
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

    # Piston failed — fallback to local execution for Python and Node.js
    if normalized_lang in ["python", "javascript"]:
        runner = run_python_locally if normalized_lang == "python" else run_node_locally
        start_time = time.time()
        main_run = runner(code, stdin)
        elapsed_ms = int((time.time() - start_time) * 1000)

        test_results = []
        passed_count = 0

        if test_cases:
            for tc in test_cases:
                tc_run = runner(code, tc.get("input", ""))
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

    return None
