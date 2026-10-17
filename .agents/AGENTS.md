# Project-Scoped Rules

## Stable State Checkpoint Protocol

Whenever a significant feature, refactor, or bugfix is successfully completed and stabilized, you MUST proactively update the stable state checkpoint document.

- Checkpoint location: `apps/mobile/docs/stable_state_checkpoint.md` (or the equivalent root docs if working elsewhere).
- Update the document to reflect the current known stable state, routing, and architectural decisions.
- This ensures we always have a reference of what was working, where we stopped, and what the latest stable implementation entails before moving on to new features.

## Protocol: Creating a New Course & Dedicated Marketing Landing Page

Whenever a new course is created or needs a dedicated marketing landing page:

1. **Dashboard Setup (Zero Code):**
   - Create the course in the dashboard (`/dash/courses`).
   - In `/dash/payments/paid-products`, link the course to the appropriate payment product:
     - For monthly tracks ($10/mo): Link the course to the recurring subscription product. Ensure the product has the Flutterwave plan ID in `provider_product_id`.
     - For one-time programs (e.g. Career Accelerator): Link to the fixed-price one-time product.
2. **Dedicated Landing Page (`apps/web`):**
   - Scaffold the landing page at `apps/web/app/orgs/[orgslug]/(withmenu)/[track-slug]/page.tsx`.
   - Embed `<ClickToPayButton courseId="[track-slug]" courseName="[Course Name]" priceAmount={10} currency="USD" />`.
   - The backend (`resolve_payment_product_and_course`) uses intelligent token fuzzy matching to automatically link the checkout request to the database course and its payment product with the exact Flutterwave `payment_plan` ID.
3. **Route Mapping in Course Overview:**
   - In `apps/web/components/Objects/BundleUpsellBanner.tsx` and `CoursesActions.tsx` / `CourseActionsMobile.tsx`, add one line to the route matcher:
     ```tsx
     else if (name.includes('[track-keyword]')) {
       path = `/[track-slug]`
     }
     ```
   - This ensures that clicking "Purchase Course" or "View Packages ->" on the Course Overview page immediately routes students to the dedicated marketing page.
4. **Fallback for Courses Without a Dedicated Page:**
   - If a course does NOT have a custom landing page, leave it unmapped. It will automatically open the built-in `<CoursePaidOptions />` modal on the Course Overview page to purchase directly without any errors.

