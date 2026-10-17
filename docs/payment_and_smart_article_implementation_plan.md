# Payment Pipeline & Smart Article Implementation Plan

## 1. Production Runtime Issues & Root Cause Analysis

### Issue A: Checkout 500 Internal Server Error (`AttributeError: 'ProviderSpecificData' object has no attribute 'model_dump'`)

- **Log Location**: `apps/api/src/services/payments/payments_users.py:103` in `create_payment_user`.
- **Runtime Trace**:
  ```python
  payment_user = PaymentsUser(
      user_id=user_id,
      org_id=org_id,
      payment_product_id=product_id,
      provider_specific_data=provider_specific_data.model_dump(),  # <--- CRASH
      status=status,
      referral_code_id=referral_code_id,
  )
  ```
- **Root Cause**: Production runs with a Pydantic version where models expose `.dict()` rather than `.model_dump()`, or `ProviderSpecificData` inherits from a base model lacking `model_dump`. When any student clicks **"Click to Pay"** on any product (e.g. `POST /api/v1/payments/1/checkout/product/11`), this uncaught exception causes an immediate 500 error.
- **Fix**: Use backward-compatible serialization:
  ```python
  if hasattr(provider_specific_data, "model_dump"):
      psd = provider_specific_data.model_dump()
  elif hasattr(provider_specific_data, "dict"):
      psd = provider_specific_data.dict()
  else:
      psd = dict(provider_specific_data)
  ```

---

### Issue B: Production Alembic Migration Abort (`psycopg2.errors.InFailedSqlTransaction`)

- **Log Location**: `apps/api/migrations/versions/e3d4c5b6a7f8_add_missing_payment_columns.py`.
- **Runtime Trace**:
  ```sql
  UPDATE alembic_version SET version_num='e3d4c5b6a7f8' WHERE alembic_version.version_num = '9f4a1b2c3d5e'
  psycopg2.errors.InFailedSqlTransaction: current transaction is aborted, commands ignored until end of transaction block
  ```
- **Root Cause**: In PostgreSQL, the `notification_type` column is of type enum (`notificationtypeenum`). In migration `e3d4c5b6a7f8`, line 76 runs:
  `UPDATE notification SET notification_type = lower(notification_type)`
  In Postgres, calling `lower()` on a non-string enum raises `function lower(notificationtypeenum) does not exist`. In transactional DDL, once a SQL statement throws an error, Postgres aborts the entire transaction block. Python's `except Exception:` cannot salvage the aborted Postgres transaction, causing the subsequent `UPDATE alembic_version` to fail.
- **Fix**: Cast to text or use a safe check:
  ```sql
  UPDATE notification SET notification_type = lower(notification_type::text)::notificationtypeenum WHERE notification_type IS NOT NULL;
  ```
  And isolate the enum cleanup outside the core DDL transaction.

---

### Issue C: 404 on Marketing Landing Page Checkout (`/checkout/course_uuid/aina-pro-subscription`)

- **Log Location**:
  `POST /api/v1/payments/1/checkout/course_uuid/aina-pro-subscription?redirect_uri=... 404 Not Found`
- **Root Cause**: The marketing landing pages had hardcoded links to a course slug (`aina-pro-subscription`) that does not exist in the database or does not have an active `PaymentsProduct` mapped via `PaymentsCourse`. When the user clicked "Click to Pay" on the landing page, the backend searched for a course with slug/uuid `aina-pro-subscription`, found none, and returned a 404 ("This course is not available for purchase yet").
- **Fix**: Ensure marketing landing page checkout buttons dynamically map to the real database course UUID and its associated `PaymentsProduct` ID (or fallback to the verified product checkout endpoint `/api/v1/payments/{org_id}/checkout/product/{product_id}`).

---

### Issue D: Course Flow Unification (Ensuring Image 1 -> Image 2 -> Image 3 for All Courses)

- **The Symptom**:
  - In the student dashboard, clicking **AI Automation for Content Creators** showed the Course Overview banner (Image 1: _"Upgrade to AI Automation for Content Creators"_), and clicking "View Packages" opened its dedicated marketing landing page (Image 2).
  - However, clicking **Applied Data Science** threw the student straight into the activity viewer with a locked paywall error (Image 4: _"Paid Content: This content requires a course purchase"_), completely skipping Images 1 and 2.
- **Root Cause**:
  1. In `apps/web/app/orgs/[orgslug]/(withmenu)/course/[courseuuid]/page.tsx`, a forced bypass (`// Direct-to-Content Routing: Bypass the Syllabus page entirely`) was redirecting any course with an activity directly into `activity/[activityid]`. Because Applied Data Science had activities created, it triggered this bypass and trapped unpaid students in Image 4. AI Automation for Content Creators did not trigger it because its first chapter activities were unpublished or empty, leaving it on `course.tsx` (Image 1).
  2. In `BundleUpsellBanner.tsx`, the banner was conditionally suppressed if `bundles.length === 0`, meaning single-product courses wouldn't show the "Upgrade to..." banner even if visited directly.
  3. On the marketing landing pages (`ai-fundamentals`, `ai-automation-content-creators`, etc.), `ClickToPayButton` was passing a non-existent placeholder slug (`courseId="aina-pro-subscription"`), causing the checkout backend to return 404 ("This course is not available for purchase yet").
- **Implemented Solution**:
  1. **Removed Forced Direct-to-Content Bypass**: In `course/[courseuuid]/page.tsx`, the forced activity redirect is removed so visiting `/course/[courseuuid]` always lands students on the Course Overview (Image 1).
  2. **Banner Coverage for All Paid Courses**: Updated `BundleUpsellBanner.tsx` so the "Upgrade to [Course Name]" banner (Image 1) displays for every paid course, with "View Packages ->" routing directly to its dedicated marketing page (`/ai-fundamentals`, `/ai-automation`, `/ai-automation-content-creators`, `/nodejs-backend`, `/frontend-dev`, `/career-accelerator`).
  3. **Real Course Slugs & Backend Token Resolution**:
     - Updated all landing page `ClickToPayButton` components with their actual course identifiers (`ai-fundamentals`, `ai-automation-content-creators`, etc.).
     - Enhanced backend `resolve_payment_product_and_course` in `apps/api/ee/routers/payments.py` with token matching and subscription fallbacks so that checkout requests reliably match their courses and products without 404s.

---

### Completed: Complete Checkout & Enrollment Lifecycle (Steps 1 to 4)

- **Step 1: Universal Course Access & Resolution API**:
  - `GET /api/v1/payments/{org_id}/courses/{course_id}/access` accepts course slugs (`ai-fundamentals`), numeric IDs (`21`), and UUIDs (`course_...`).
  - Returns `course` (`id`, `course_uuid`, `name`), live database `product` (`amount`, `currency`, `product_type`), and `has_access`.
- **Step 2: Universal Payment Status Listener & Modals**:
  - `apps/web/components/Objects/Payments/PaymentResultModal.tsx` provides status modals for `successful`, `cancelled`, and `failed`.
  - In `ClickToPayButton.tsx` and `courses.tsx`, incoming Flutterwave callbacks are verified via `verifyTransaction`, URLs are sanitized via `window.history.replaceState`, and appropriate modals are rendered.
- **Step 3: Instant 100% Free Discount Code Bypass (`AAN100`)**:
  - `access_code === 'free_bypass'` is intercepted immediately in `triggerPayment` with zero page reload.
  - The Celebration Pop-up appears instantly with **[Start Course Now →]** routing directly into `/orgs/[orgslug]/course/[course_uuid]`.
- **Step 4: Dynamic Button Lifecycle (Enrolled vs Unenrolled)**:
  - On page mount, `ClickToPayButton` verifies student enrollment.
  - Enrolled students see the emerald badge `✓ Enrolled & Active` and the button transforms from purple `CLICK TO PAY →` into emerald `START LEARNING →`.

---

## 2. Detailed Implementation Plan (For Your Review)

### Step 1: Smart Article Container & Layout Polish [COMPLETED]

- **Target Files**:
  - `apps/web/app/orgs/[orgslug]/(withmenu)/course/[courseuuid]/activity/[activityid]/activity.tsx`
  - `apps/web/components/Objects/Activities/SmartArticle/SmartArticleActivity.tsx`
- **Status**: Completed & Verified.
  1. Replaced the rigid `h-screen` container in `activity.tsx` with `min-h-[calc(100vh-4rem)] h-[calc(100vh-4rem)]` to perfectly offset the 64px navbar.
  2. Eliminated the nested double-scrollbar by setting `overflow-hidden` on the outer activity container, delegating smooth scrolling to `SmartArticleActivity`'s single dedicated reading pane.
  3. Formatted step retrieval to seamlessly accept both direct array `[...]` and object `{"steps": [...]}` structures, and preserved `pb-36` bottom padding so completion actions and exercises are never clipped.

---

### Step 2: Code Editor Fixes (Reset, Console & Execution Delay) [COMPLETED]

- **Target Files**:
  - `apps/web/components/Objects/Activities/SmartArticle/Blocks/CodeExerciseBlock.tsx`
  - `apps/api/src/services/code_execution.py`
- **Status**: Completed & Verified.
  1. **Reset Button**: Standardized starting code resolution across `step.startingCode || step.starterCode || step.code || ''` and added Monaco editor reference reset (`editorRef.current.setValue(...)`).
  2. **Output Console Tab**: Implemented expand/collapse toggle action with animated caret icons and clear feedback.
  3. **Execution Sandbox & Feedback**: Integrated animated spinner and "Executing in isolated sandbox..." message with fast 8s timeout and local fallback.

---

### Step 3: Assignment Sync for Frontend & Backend Challenges [COMPLETED]

- **Target File**:
  - `apps/api/src/services/courses/activities/smart_article.py`
- **Status**: Completed & Verified (4/4 tests passing in `test_smart_article_assignment_sync.py`).
  1. `sync_smart_article_assignment` safely parses `activity.content` as a JSON string, raw list `[...]`, or dict `{"steps": [...]}`.
  2. `CODE_EXERCISE` and `FRONTEND_EXERCISE` automatically create `AssignmentTask` records alongside `QUIZ`.
  3. Interactive exercises sync seamlessly into the instructor assignment dashboard.
