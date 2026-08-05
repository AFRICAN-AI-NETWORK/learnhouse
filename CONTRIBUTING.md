# Contributing to LearnHouse

## Getting Started

To set up your development environment, please follow our [Development Guide](/docs/DEVELOPMENT.md). This guide includes step-by-step instructions for:

- Setting up the backend (FastAPI, uv, PostgreSQL, Redis)
- Setting up the frontend (Next.js, pnpm)
- Using the development script
- Managing environment variables
- Running migrations and tests

## Linting Best Practices

To keep the codebase consistent and CI green, please adhere to the following linting guidelines (enforced by `ruff`):

- **Timezone-Aware Datetimes**: Always use timezone-aware datetimes. Prefer `datetime.now(timezone.utc)` instead of `datetime.utcnow()` or `datetime.now()`. (Rules `DTZ003`, `DTZ005`)
- **Specific Exceptions**: Avoid catching bare `Exception`. Catch specific exceptions instead (e.g., `ValueError`, `httpx.RequestError`). If you must write a generic catch-all (like in top-level handlers or background jobs), append `# noqa: BLE001` and ensure you use `logger.exception("...")` to log the traceback. (Rules `BLE001`, `G201`)
- **String Formatting**: For f-strings containing exception objects, use the explicit string conversion flag: `f"{e!s}"` rather than `f"{str(e)}"`. (Rule `RUF010`)
- **Run Linter Locally**: Before pushing, run `uv run ruff check .` in the backend directory to catch issues early.

## Submitting Contributions

This project follows [GitHub's standard forking model](https://guides.github.com/activities/forking/). Please fork the project to submit pull requests.

### Submitting a bug/fix

- Start an issue [here](https://github.com/learnhouse/learnhouse/issues) to report the bug.
- Please include a detailed description of the bug and how it can be reproduced.
- Someone from the team will review the issue and will give you a go ahead.

### Submitting a feature / idea

- Start a Discussion [here](https://github.com/learnhouse/learnhouse/discussions/categories/ideas) to propose your idea and how it should be implemented.
- Someone from the team will review your idea and will give you a go ahead.
- Start an issue & link the discussion to it.
- Clone your fork locally
- Create a new branch and make your commits
- Push your commits to your forked repo
- Make a Pull request
- Code will be added after review
