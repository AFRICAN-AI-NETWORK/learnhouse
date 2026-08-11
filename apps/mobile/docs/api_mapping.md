# LearnHouse API Mapping Guide

This document maps out the available endpoints from the backend API (`apps/api/src/routers/`) and how they should be consumed by the Mobile App, to avoid 404/405 method errors.

## 1. Authentication (`/api/v1/auth`)

- `POST /api/v1/auth/token`: Logs in the user and returns an access token.
- `POST /api/v1/auth/signup`: Registers a new user.
- _Note: There is NO `/api/v1/auth/me` endpoint in this project._

## 2. Users (`/api/v1/users`)

- `GET /api/v1/users/profile`: Fetches the currently authenticated user's profile information. (Requires `Authorization: Bearer <token>`).
- `GET /api/v1/users/session`: Fetches the current user's session data.
- `PUT /api/v1/users/{user_id}`: Updates the user's personal information (name, bio, phone, etc.).
- `PUT /api/v1/users/update_avatar/{user_id}`: Uploads a new avatar for the user (multipart/form-data).
- `PUT /api/v1/users/change_password/{user_id}`: Updates the user's password.
- `GET /api/v1/users/{user_id}/courses`: Fetches courses made or contributed to by this user.

## 3. Courses (`/api/v1/courses`)

- `GET /api/v1/courses/org_slug/{orgSlug}/page/{page}/limit/{limit}`: Fetches courses for the catalog and home screen.
- `GET /api/v1/courses/{course_uuid}/meta`: Fetches metadata for a specific course (e.g., chapters/modules).

## 4. Trails / Progress (`/api/v1/trail`)

- `GET /api/v1/trail/org/{org_id}/trail`: Fetches the user's enrolled courses (trails) and their progress within an organization.
- `GET /api/v1/trail/`: Fetches trails across all orgs if no specific org ID is provided.

## 5. Media & Thumbnails (`/api/v1/content`)

- Images and thumbnails are typically served statically or via a dedicated media service using the `org_uuid` and `course_uuid`.
- User Avatars: Served via `/content/users/{userUUID}/avatars/{fileId}`.

## 6. Organizations (`/api/v1/orgs`)

- `GET /api/v1/orgs/slug/{orgSlug}`: Fetches the organization context (to get the real `org_uuid` and `id`).

---

**Rule of Thumb:**
When guessing an endpoint, always check `apps/api/src/routers/` first. FastAPI routers are mapped directly to `/api/v1/{router_name}` (except `auth` which is mounted in `app.py`).
