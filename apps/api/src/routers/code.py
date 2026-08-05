import time
from collections import defaultdict
from typing import Dict, List

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from config.config import LearnHouseConfig, get_learnhouse_config
from src.services.code_execution import (PISTON_URL, CodeExecutionResponse,
                                         TestCaseResult, execute_and_grade,
                                         run_python_locally)

router = APIRouter()

# Simple in-memory rate limiter
_rate_limit_store = defaultdict(list)
RATE_LIMIT_MAX_REQUESTS = 20
RATE_LIMIT_WINDOW_SECONDS = 60


def rate_limit_dependency(request: Request) -> str:
    client_ip = request.client.host if request.client else "unknown"
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()

    current_time = time.time()

    timestamps = _rate_limit_store[client_ip]
    timestamps = [
        ts for ts in timestamps if current_time - ts < RATE_LIMIT_WINDOW_SECONDS
    ]

    if len(timestamps) >= RATE_LIMIT_MAX_REQUESTS:
        _rate_limit_store[client_ip] = timestamps
        raise HTTPException(
            status_code=429,
            detail="Too many code execution requests. Limit is 20 per minute.",
        )

    timestamps.append(current_time)
    _rate_limit_store[client_ip] = timestamps
    return client_ip


class CodeExecutionRequest(BaseModel):
    language: str
    code: str
    stdin: str = ""
    test_cases: List[Dict] = []
    dataset_files: List[Dict] = []


@router.post("/execute", response_model=CodeExecutionResponse)
async def execute_code(
    request: CodeExecutionRequest,
    client_ip: str = Depends(rate_limit_dependency),
    config: LearnHouseConfig = Depends(get_learnhouse_config),
):
    try:
        # Check if Piston is available
        piston_available = False
        try:
            async with httpx.AsyncClient() as client:
                await client.get(PISTON_URL, timeout=5.0)
                piston_available = True
        except (httpx.ConnectError, httpx.TimeoutException, httpx.HTTPError):
            pass

        # If Piston is available, use it
        if piston_available:
            res = await execute_and_grade(
                request.language,
                request.code,
                request.test_cases,
                request.stdin,
                client_ip,
                request.dataset_files,
            )
            if res:
                return res

        # Fallback: run Python locally in dev mode
        if config.general_config.development_mode and request.language == "python":
            start_time = time.time()

            # 1. Main execution (with stdin if provided)
            main_run = run_python_locally(request.code, request.stdin)
            elapsed_ms = int((time.time() - start_time) * 1000)

            test_results = []
            passed_count = 0

            # 2. Run each test case
            if request.test_cases:
                for tc in request.test_cases:
                    tc_run = run_python_locally(request.code, tc.get("input", ""))
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
                total_count=len(request.test_cases),
            )

        # If not Python or not dev mode and Piston is down
        raise HTTPException(
            status_code=503,
            detail="Code execution service unavailable. Piston is not running and local fallback only supports Python.",
        )
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        import traceback

        print(f"[CodeExecution] Error executing {request.language} code: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Code execution failed: {e!s}")
