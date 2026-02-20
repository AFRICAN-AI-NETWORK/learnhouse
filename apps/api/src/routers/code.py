from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict
import httpx
import time
from config.config import LearnHouseConfig, get_learnhouse_config

router = APIRouter()

from src.services.code_execution import execute_and_grade, run_python_locally, TestCaseResult, CodeExecutionResponse, PISTON_URL

class CodeExecutionRequest(BaseModel):
    language: str
    code: str
    stdin: str = ""
    test_cases: List[Dict] = []


@router.post("/execute", response_model=CodeExecutionResponse)
async def execute_code(
    request: CodeExecutionRequest,
    config: LearnHouseConfig = Depends(get_learnhouse_config)
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
            res = await execute_and_grade(request.language, request.code, request.test_cases, request.stdin)
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

                    test_results.append(TestCaseResult(
                        testUUID=tc.get("testUUID", ""),
                        input=tc.get("input", ""),
                        expected_output=expected,
                        actual_output=actual,
                        passed=passed,
                        status="passed" if passed else "failed"
                    ))

            return CodeExecutionResponse(
                stdout=main_run["stdout"],
                stderr=main_run["stderr"],
                exit_code=main_run["exit_code"],
                execution_time_ms=elapsed_ms,
                test_results=test_results,
                passed_count=passed_count,
                total_count=len(request.test_cases)
            )

        # If not Python or not dev mode and Piston is down
        raise HTTPException(
            status_code=503,
            detail=f"Code execution service unavailable. Piston is not running and local fallback only supports Python."
        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[CodeExecution] Error executing {request.language} code: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Code execution failed: {str(e)}")
