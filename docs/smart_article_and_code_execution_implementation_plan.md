# Implementation Plan: Smart Article Direct JSON Ingestion & Piston Code Execution

## 1. Executive Summary
This implementation enhances the **Smart Article** learning activity and the **Piston Code Execution** engine within LearnHouse. It enables instructors to author lessons using ChatGPT directly in LearnHouse's native step schema (with interactive quizzes, YouTube embeds, and code exercises) and upload them as either `.json` or `.pdf` files without secondary AI re-chunking or content loss. Additionally, it integrates and verifies the Node.js / JavaScript execution runtime in Piston and wires live code execution into the Smart Article student interface.

---

## 2. Problem Statement & Motivation
1. **Loss of Interactive Elements in Smart Articles:**
   * Previously, uploading a PDF always forced the backend to pass the extracted text to an LLM (`gpt-4o-mini` or `gemini-2.5-flash`) for chunking.
   * The AI chunking prompt only recognized 6 reading block types, meaning that any quizzes, YouTube links, image URLs, or code exercises generated in the lesson were stripped or altered.
2. **Piston Runtimes Missing & Language Mapping Gaps:**
   * The Piston container (`learnhouse-piston-dev`) had zero runtimes installed out of the box, preventing JavaScript/TypeScript code execution.
   * Language identifiers such as `node`, `nodejs`, `node.js`, `express`, and `js` were not normalized to Piston's registered `javascript` runtime, causing execution errors.
   * The Smart Article code exercise component (`CodeExerciseBlock.tsx`) contained simulated/mocked output rather than executing real code.

---

## 3. Scope of Changes

### A. Smart Article Pipeline (`apps/api` & `apps/web`)
* **Dual-Format Detection ([smart_article.py](file:///C:/Users/hp/Documents/GitHub/learnhouse/apps/api/src/services/courses/activities/smart_article.py)):**
  * Updated `create_smart_article_activity` to accept both `.pdf` and `.json` file formats.
  * Added automated JSON schema detection: If the uploaded file (or text within the PDF) is already valid JSON adhering to the steps schema (`list[dict]` or `{"steps": [...]}`), it bypasses the secondary AI completely.
  * Bypassing the AI achieves instant rendering (zero latency), preserves exact wording and test cases, avoids secondary token costs, and enables automated quizzes (`QUIZ`), video players (`EMBED`), and code blocks (`CODE_EXERCISE`).
  * Text-based PDFs continue to fall back to the AI chunking flow gracefully.
* **Upload Modal UI ([SmartActivityModal.tsx](file:///C:/Users/hp/Documents/GitHub/learnhouse/apps/web/components/Objects/Modals/Activities/Create/NewActivityModal/SmartActivityModal.tsx) & [constants.ts](file:///C:/Users/hp/Documents/GitHub/learnhouse/apps/web/lib/constants.ts)):**
  * Added `json: 'application/json'` to `ACCEPTED_FILE_FORMATS`.
  * Updated `SUPPORTED_FILES` in `SmartActivityModal` to accept both PDF and JSON.

### B. Code Execution & Piston Runtime Integration (`apps/api` & `apps/web`)
* **Piston Node.js Installation:**
  * Installed `node` v20.11.1 into the Piston package store (`/piston/packages/node/20.11.1`).
* **Language Normalization & Mappings ([code_execution.py](file:///C:/Users/hp/Documents/GitHub/learnhouse/apps/api/src/services/code_execution.py)):**
  * Added `LANGUAGE_NORMALIZATION` dictionary mapping aliases (`js`, `node`, `nodejs`, `node.js`, `express` -> `javascript`; `ts` -> `typescript`; `py`, `python3` -> `python`; `golang` -> `go`; `c++` -> `cpp`; `c#`, `cs` -> `csharp`; `sh`, `shell` -> `bash`).
  * Configured proper source file extension mapping in `EXT_MAP` (`.js`, `.ts`, `.py`, `.java`, `.cpp`, `.go`, `.rs`, `.php`, `.sh`, `.cs`).
* **Development Mode Local Fallback ([code_execution.py](file:///C:/Users/hp/Documents/GitHub/learnhouse/apps/api/src/services/code_execution.py) & [code.py](file:///C:/Users/hp/Documents/GitHub/learnhouse/apps/api/src/routers/code.py)):**
  * Implemented `run_node_locally` using Python's `subprocess` with timeout and cleanup, mirroring `run_python_locally`.
  * If Piston is unreachable in development mode, both Python and Node.js automatically execute locally.
* **Live Interactive Code Runner in Smart Article ([CodeExerciseBlock.tsx](file:///C:/Users/hp/Documents/GitHub/learnhouse/apps/web/components/Objects/Activities/SmartArticle/Blocks/CodeExerciseBlock.tsx)):**
  * Replaced the hardcoded simulated timeout with an asynchronous call to `/code/execute`.
  * Added real-time output terminal rendering displaying actual `stdout`, `stderr`, and execution errors with status indicators.

### C. Course Authoring Documentation ([smart_article_content_guide.md](file:///C:/Users/hp/Documents/GitHub/learnhouse/docs/smart_article_content_guide.md))
* Detailed the difference between Option B (Direct JSON) and Option A (Plain Text PDF).
* Provided a ready-to-use ChatGPT prompt template configured to output complete lessons with quizzes, video embeds, and code exercises.
* Documented the schema for all 10 supported block types.

---

## 4. Verification & Testing

### 1. Piston API & Runtime Execution
Tested end-to-end execution against the Piston container via `execute_and_grade`:
* **JavaScript:**
  ```python
  execute_and_grade('javascript', 'console.log("Piston Node.js Execution Success: " + (20 + 22));')
  # Output: stdout='Piston Node.js Execution Success: 42\n', exit_code=0
  ```
* **Language Alias (`node`):**
  ```python
  execute_and_grade('node', 'const arr = [1, 2, 3].map(x => x * 10); console.log("Mapped:", arr.join(", "));')
  # Output: stdout='Mapped: 10, 20, 30\n', exit_code=0
  ```
* **Language Alias (`express`):**
  ```python
  execute_and_grade('express', 'console.log("Express/JS test passed!");')
  # Output: stdout='Express/JS test passed!\n', exit_code=0
  ```

### 2. Static Analysis & Type Checking
* **Python Backend:** `ruff check` on modified backend files (`smart_article.py`, `code_execution.py`, `code.py`) returned `All checks passed!` with 0 errors.
* **Frontend Web:** `npx tsc --noEmit -p .` on `apps/web` exited with code 0 (0 TypeScript errors across the codebase).

---

## 5. Deployment / Production Checklist (Coolify)
To ensure Piston has Node.js installed in production:
1. Access the Coolify server where Piston is hosted or SSH into the server:
   ```bash
   docker exec -it <piston_container_name> /bin/bash
   ```
2. Or trigger package installation via Piston's HTTP API:
   ```bash
   curl -X POST http://<piston_internal_url>:2000/api/v2/packages \
     -H "Content-Type: application/json" \
     -d '{"language": "node", "version": "20.11.1"}'
   ```
3. Restart the container if needed to register the runtime in `/piston/packages`.
