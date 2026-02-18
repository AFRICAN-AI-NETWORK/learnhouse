from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List, Dict
import httpx
import time
from config.config import LearnHouseConfig, get_learnhouse_config

router = APIRouter()

class CodeExecutionRequest(BaseModel):
    language: str
    code: str
    stdin: str = ""
    test_cases: List[Dict] = []

class CodeExecutionResponse(BaseModel):
    stdout: str
    stderr: str
    exit_code: int
    execution_time_ms: int
    test_results: Optional[List[Dict]] = None

# Default Piston URL - check if we should make this configurable via env
PISTON_URL = "http://localhost:2000"

@router.post("/execute", response_model=CodeExecutionResponse)
async def execute_code(
    request: CodeExecutionRequest,
    config: LearnHouseConfig = Depends(get_learnhouse_config)
):
    # Map languages if necessary (e.g. "python" -> "python3" or similar for Piston)
    # Piston uses specific language/version strings.
    # For now, we'll try to find the best runtime version.
    
    language = request.language
    
    # Simple version mapping - in production we should fetch this from Piston
    version_map = {
        "python": "3.10.0",
        "javascript": "18.15.0",
        "java": "15.0.2",
        "c": "10.2.1",
        "cpp": "10.2.1",
        "go": "1.16.2",
        "ruby": "3.0.1"
    }
    
    version = version_map.get(language, "*")

    piston_payload = {
        "language": language,
        "version": version,
        "files": [
            {
                "name": "main",
                "content": request.code
            }
        ],
        "stdin": request.stdin,
        "compile_timeout": 10000,
        "run_timeout": 5000,
        "piston_timeout": 3000
    }

    start_time = time.time()
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{PISTON_URL}/api/v2/execute", json=piston_payload, timeout=15.0)
            
            if response.status_code != 200:
                raise HTTPException(status_code=500, detail="Code execution server error")
            
            result = response.json()
            execution_time_ms = int((time.time() - start_time) * 1000)
            
            run_result = result.get("run", {})
            
            return CodeExecutionResponse(
                stdout=run_result.get("stdout", ""),
                stderr=run_result.get("stderr", ""),
                exit_code=run_result.get("code", 0),
                execution_time_ms=execution_time_ms
            )
            
    except httpx.RequestError as e:
        # Fallback for development if Piston is not running
        if config.general_config.development_mode:
            # Mock successful execution for development if Piston is missing
            # This allows frontend dev to continue
            return CodeExecutionResponse(
                stdout=f"Development Mode: Mock output for {language}\nCode:\n{request.code[:50]}...",
                stderr="",
                exit_code=0,
                execution_time_ms=10
            )
        raise HTTPException(status_code=503, detail=f"Code execution service unavailable: {str(e)}")
