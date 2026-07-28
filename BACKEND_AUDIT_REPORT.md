# 📦 BACKEND AUDIT REPORT

**Project:** EduConnect Backend Service  
**Audit Date:** July 18, 2026  
**Auditor:** Senior Software Architect & Code Auditor  
**Codebase Location:** `c:\Users\Admin\Desktop\Website_Fr\server`  

---

## 📌 Authentication & Session Management (`features/auth`)

Status: ✅ Complete

### Implemented

* `POST /api/v1/auth/register`: Transactional registration for `STUDENT` and `TUTOR` roles. Email verification integrated.
* `POST /api/v1/auth/login`: Authenticates user against hashed passwords, verifies email status, and issues JWT access & refresh tokens.
* `POST /api/v1/auth/refresh`: Single-use JWT refresh token rotation with family tracking in MySQL `refresh_tokens` table. Implements automatic session revocation across all devices upon detection of token reuse attacks.
* `POST /api/v1/auth/logout`: Revokes active refresh token from MySQL database.
* `GET /api/v1/auth/me`: Current user profile & session inspection endpoint.
* Password Reset Flow: `POST /api/v1/auth/forgot-password` and `POST /api/v1/auth/reset-password` implemented.
* Password Update Endpoint: `PUT /api/v1/auth/change-password` implemented.
* Email Verification: `POST /api/v1/auth/verify-email` and `POST /api/v1/auth/resend-verification` implemented.
* Rate Limiting: Strict 10 requests / 15-minute window via `authLimiter` middleware.
* Zod Schema Validation: Thorough input validation for all endpoints.

### Missing

* None identified.

### Issues

* None identified.

---

## 📌 Tutor Profiles & Verification (`features/tutors`)

Status: ✅ Complete

### Implemented

* `GET /api/v1/tutors/public` & `GET /api/v1/tutors/public/:profileId`: Public tutor directory endpoints.
* `GET /api/v1/tutors/profile`: Retrieves tutor profile details.
* `PUT /api/v1/tutors/profile`: Updates bio and qualifications.
* `POST /api/v1/tutors/competency-tests`: Allows tutors to request a subject evaluation test. Now properly accepts `submissionFileUrl` and `submissionFileKey`.
* `GET /api/v1/tutors/competency-tests`: Role-gated listing.
* `POST /api/v1/tutors/competency-tests/:testId/grade`: Admin endpoint to grade competency tests.
* `POST /api/v1/tutors/:profileId/verify`: Admin endpoint to approve/verify tutors.

### Missing

* None identified.

### Issues

* Qualifications are stored as raw URL strings in `tutor_profiles.qualifications` without robust validation tying them to the `storage` module.

---

## 📌 Courses & Curriculum Management (`features/courses`)

Status: ⚠️ Partial

### Implemented

* `POST /api/v1/courses/subjects`: Admin endpoint to define course subjects.
* `GET /api/v1/courses/subjects`: Public list of subjects.
* `GET /api/v1/courses/catalog`: Public course catalog supporting search, filtering, sorting, and pagination.
* `POST /api/v1/courses`: Verified tutor endpoint to create course drafts.
* `PUT /api/v1/courses/:courseId`: Updates course metadata and publishing status.
* `POST /api/v1/courses/modules`: Adds modules to a course.
* `POST /api/v1/courses/materials`: Attaches learning resources to course modules.
* `GET /api/v1/courses/:courseId`: Returns course outline and module structure.

### Missing

* `DELETE /api/v1/courses/:courseId`: Soft-delete or archive course endpoint.
* `DELETE /api/v1/courses/modules/:moduleId`: Delete module resource endpoint.

### Issues

* **N+1 Query Risk**: In `getCourseDetails`, executes a query for modules, followed by a sequential `for` loop executing a separate SQL query for each module's materials.

---

## 📌 Assessments & Student Submissions (`features/assessments`)

Status: ✅ Complete

### Implemented

* `POST /api/v1/assessments`: Tutor endpoint to create assessments.
* `POST /api/v1/assessments/:assessmentId/submissions`: Enrolled student endpoint to submit/resubmit coursework.
* `POST /api/v1/assessments/submissions/:submissionId/grade`: Tutor/Admin endpoint to grade coursework and trigger async HTML email notification.
* `GET /api/v1/assessments/:assessmentId/submissions`: Tutor/Admin view of all student submissions for an assessment.
* `GET /api/v1/assessments/:assessmentId`: Dedicated endpoint for students to view single assessment instructions and max score.
* `GET /api/v1/assessments/my-submissions`: Student endpoint to track all submitted and graded assignments.

### Missing

* None identified.

### Issues

* None identified (The previous async email unhandled promise rejection has been resolved with a `.catch()`).

---

## 📌 M-Pesa Payments & Reconciliations (`features/payments`)

Status: ⚠️ Partial

### Implemented

* `POST /api/v1/payments/stk-push`: Initiates Safaricom Daraja STK Push payment trigger.
* `POST /api/v1/payments/mpesa-callback`: Webhook callback handler. Performs atomic database updates.
* `MpesaService.reconcilePayment`: MySQL-backed background task querying Safaricom status endpoint if callback is delayed or lost.

### Missing

* `GET /api/v1/payments/history`: Student & Admin transaction history endpoint.
* Refund / Tutor Payout B2C integration.

### Issues

* Webhook callback authentication checks `req.query.token === mpesaConfig.passKey`. Exposing the M-Pesa PassKey in GET/POST URL query strings risks exposing sensitive credentials in HTTP access logs.

---

## 📌 File Storage & Media Uploads (`features/storage`)

Status: 🚫 Broken

### Implemented

* `POST /api/v1/storage/upload`: Validates file MIME types and size limits and returns pre-signed local upload keys.
* `PUT /api/v1/storage/upload/*`: Handles direct binary file upload via Multer memory storage and writes to local disk.
* `GET /api/v1/storage/download/:materialId`: Protected download route gated by `checkMaterialAccess` middleware.

### Missing

* Cloud Object Storage (AWS S3) integration.
* `DELETE /api/v1/storage/*`: File cleanup/deletion endpoint.

### Issues

* 🚨 **CRITICAL SECURITY VULNERABILITY**: `app.ts` includes `app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')))`. This exposes all uploaded course materials, student submissions, and tutor qualification files publicly without authentication or enrollment checks, completely bypassing the protected download route.

---

## 📌 User Management & Admin Controls (`features/admin`)

Status: ⚠️ Partial

### Implemented

* `POST /api/v1/admin/users/:userId/suspend`: Admin endpoint to freeze/activate user login accounts.
* `GET /api/v1/admin/users`: Admin endpoint to list registered platform users.

### Missing

* `GET /api/v1/admin/users/:userId`: Detailed single user view.
* `PUT /api/v1/admin/users/:userId/role`: User role modification endpoint.
* Audit Logging system for admin actions.

### Issues

* No audit log table exists to track which admin suspended a user or modified roles.

---

## 📌 System Analytics & Reporting (`features/analytics`)

Status: ⚠️ Partial

### Implemented

* `GET /api/v1/analytics/admin`: System-wide metrics (total revenue, enrollment counts, etc).
* `GET /api/v1/analytics/tutor`: Tutor-specific metrics.

### Missing

* Custom date range filtering (`startDate`, `endDate`).

### Issues

* None identified.

---

## 📌 Background Jobs & Workers (`jobs`)

Status: ⚠️ Partial

### Implemented

* Custom MySQL-backed scheduled jobs system polling the `scheduled_jobs` table using a single `setInterval` in `job-processor.ts`. Replaces BullMQ/Redis.
* Payment reconciliation handler is fully implemented.
* Active background cleanup of expired `refresh_tokens`.

### Missing

* Dedicated handlers for `notificationQueue` and `cleanupQueue`.

### Issues

* `notificationQueue` and `cleanupQueue` jobs will log a warning and be marked as 'COMPLETED' without actual processing since no handlers exist.

---

## 📌 Tutoring Sessions & 1-on-1 Meetings (`sessions` table)

Status: ❌ Missing

### Implemented

* Database schema `sessions` table defined in `init.sql`.

### Missing

* Entire module! No routes, controllers, or services implemented in `server/src`.

### Issues

* `sessions` table exists as dead schema.

---

# 🔌 API INVENTORY

| Method | Endpoint | Status | Notes |
| ------ | -------- | ------ | ----- |
| GET | `/health` | ✅ | Server health check |
| POST | `/api/v1/auth/register` | ✅ | User registration with email verification flow |
| POST | `/api/v1/auth/login` | ✅ | User authentication returning JWT tokens |
| POST | `/api/v1/auth/refresh` | ✅ | Single-use refresh token rotation |
| POST | `/api/v1/auth/logout` | ✅ | Revokes refresh token in MySQL |
| POST | `/api/v1/auth/verify-email` | ✅ | Verifies email using token |
| POST | `/api/v1/auth/resend-verification` | ✅ | Resends email verification link |
| POST | `/api/v1/auth/forgot-password` | ✅ | Initiates password reset |
| POST | `/api/v1/auth/reset-password` | ✅ | Resets password using token |
| PUT | `/api/v1/auth/change-password` | ✅ | Authenticated user password update |
| GET | `/api/v1/auth/me` | ✅ | Current user profile |
| GET | `/api/v1/tutors/public` | ✅ | Public tutor directory |
| GET | `/api/v1/tutors/public/:profileId` | ✅ | Public individual tutor profile |
| GET | `/api/v1/tutors/profile` | ✅ | Fetches tutor profile for authenticated tutor |
| PUT | `/api/v1/tutors/profile` | ✅ | Updates tutor bio and qualifications JSON |
| POST | `/api/v1/tutors/competency-tests` | ✅ | Requests competency test for a subject |
| GET | `/api/v1/tutors/competency-tests` | ✅ | Lists competency tests |
| POST | `/api/v1/tutors/competency-tests/:testId/grade` | ✅ | Admin grades tutor competency test |
| POST | `/api/v1/tutors/:profileId/verify` | ✅ | Admin sets tutor verification status |
| POST | `/api/v1/courses/subjects` | ✅ | Admin creates course subject |
| GET | `/api/v1/courses/subjects` | ✅ | Lists all available subjects |
| GET | `/api/v1/courses/catalog` | ✅ | Filterable & searchable public course catalog |
| POST | `/api/v1/courses` | ✅ | Verified tutor creates course draft |
| PUT | `/api/v1/courses/:courseId` | ✅ | Updates course metadata |
| POST | `/api/v1/courses/modules` | ✅ | Adds module to course |
| POST | `/api/v1/courses/materials` | ✅ | Attaches material to module |
| GET | `/api/v1/courses/:courseId` | ✅ | Course outline + enrollment status |
| POST | `/api/v1/assessments` | ✅ | Tutor creates assessment under module |
| POST | `/api/v1/assessments/:assessmentId/submissions` | ✅ | Student submits coursework |
| POST | `/api/v1/assessments/submissions/:submissionId/grade` | ✅ | Tutor grades submission |
| GET | `/api/v1/assessments/:assessmentId/submissions` | ✅ | Lists submissions |
| GET | `/api/v1/assessments/my-submissions` | ✅ | Student tracks submitted assignments |
| GET | `/api/v1/assessments/:assessmentId` | ✅ | Single assessment instructions |
| POST | `/api/v1/payments/stk-push` | ✅ | Initiates M-Pesa STK Push |
| POST | `/api/v1/payments/mpesa-callback` | ⚠️ | M-Pesa webhook (Exposes passKey) |
| POST | `/api/v1/storage/upload` | ✅ | Returns fileKey for upload |
| PUT | `/api/v1/storage/upload/*` | ✅ | Binary file upload to local disk |
| GET | `/api/v1/storage/download/:materialId` | 🚫 | Protected download (Bypassed by public `/uploads`) |
| POST | `/api/v1/admin/users/:userId/suspend` | ✅ | Admin suspends user account |
| GET | `/api/v1/admin/users` | ✅ | Admin lists users |
| GET | `/api/v1/analytics/admin` | ✅ | System-wide analytics |
| GET | `/api/v1/analytics/tutor` | ✅ | Tutor earnings & student counts |

---

# 🗄 DATABASE AUDIT

### Models Verified

* `users`, `tutor_profiles`, `subjects`, `courses`, `modules`, `materials`, `enrollments`, `payments`, `assessments`, `submissions`, `tutor_competency_tests`, `refresh_tokens`, `verification_tokens`, `scheduled_jobs`.

### Migration Issues

* Initialization relies solely on `server/src/db/init.sql`. No formal migration framework exists to manage incremental schema changes over time.

### Schema Mismatches

* `sessions` table is created in `init.sql` but has no corresponding entity, controller, or service in the application backend.

### Performance Concerns

* **N+1 Query Pattern in `CoursesService.getCourseDetails`**: Loops through fetched modules and executes `SELECT ... FROM materials WHERE module_id = ?` for every module sequentially. Should use a single `WHERE module_id IN (...)` or a `JOIN`.
* Missing composite index on `materials(module_id, created_at)`.

---

# 🔐 AUTHENTICATION & AUTHORIZATION AUDIT

### Authentication Status

* JWT Access Token and Refresh Token implemented securely.
* Migration from Redis to MySQL for `refresh_tokens` is fully functional.
* Robust session revocation upon token reuse attacks implemented properly.
* Email verification step is tightly enforced before login.

### Authorization Status

* Role-Based Access Control (RBAC) securely implemented for `STUDENT`, `TUTOR`, and `ADMIN`.
* Resource Ownership checks verified across Courses, Modules, Materials, Assessments, and Submissions.

### Security Gaps

* **Unprotected `/uploads` Static Directory**: Direct HTTP access to `/uploads/<fileKey>` bypasses JWT authentication and enrollment checks.

---

# 🔗 INTEGRATION ISSUES

* **Safaricom M-Pesa Daraja**:
  * Callback URL uses `?token=MPESA_PASSKEY`. Exposing the production PassKey in URL query strings risks credential exposure in proxy access logs and network traces.
* **MySQL Job Queue**:
  * Functional, but misses handlers for `notificationQueue` and `cleanupQueue`.

---

# ⚠️ CRITICAL PROBLEMS

### 1. Public Static Exposure of Protected Uploaded Files
* **Severity**: 🔴 Critical
* **Location**: `server/src/app.ts:L50`
* **Impact**: Anyone can access course materials, homework submissions, and private tutor documents directly via `http://localhost:5000/uploads/...` without logging in, rendering `checkMaterialAccess` completely useless.
* **Recommended Fix**: Remove `app.use('/uploads', express.static(...))`. Require all file access to pass exclusively through the authenticated `GET /api/v1/storage/download/:materialId` route.

### 2. Exposure of M-Pesa PassKey in Callback URL Query String
* **Severity**: 🟠 High
* **Location**: `server/src/features/payments/payments.controller.ts:L39`
* **Impact**: The M-Pesa PassKey (used to sign STK push requests) is sent in cleartext as a URL query parameter (`?token=...`).
* **Recommended Fix**: Use a dedicated random secret token (`MPESA_WEBHOOK_SECRET`) stored in `.env` for webhook callback validation instead of the production PassKey.

### 3. Invalid CORS Configuration for Credentials
* **Severity**: 🟠 High
* **Location**: `server/src/app.ts:L17-L22`
* **Impact**: `cors({ origin: '*', credentials: true })` is invalid according to W3C CORS specifications. Browsers will silently reject authenticated requests.
* **Recommended Fix**: Replace `origin: '*'` with an explicit array of allowed frontend origins based on environment configuration.

---

# 📈 COMPLETION SUMMARY

### Overall Backend Completion

Estimated: **90%**

### Module Statistics

* Complete Modules: **3** (Auth, Tutors, Assessments)
* Partial Modules: **5** (Courses, Payments, Admin, Analytics, Jobs)
* Broken Modules: **1** (Storage - Static File Security Bypass)
* Missing Modules: **1** (Sessions / 1-on-1 Tutoring)

### Production Readiness

* **Partially Ready** (Requires fixing the critical file exposure vulnerability, invalid CORS configuration, and PassKey leak before deployment).

---

# 🛠 RECOMMENDED NEXT STEPS

## High Priority

1. **Remove `/uploads` Static Directory**: Eliminate public static file serving in `app.ts`.
2. **Secure M-Pesa Webhook Callback**: Replace PassKey in callback URL with a custom webhook token.
3. **Fix CORS Configuration**: Configure specific allowed origins instead of wildcard `*`.

## Medium Priority

1. **Optimize N+1 Queries**: Refactor `CoursesService.getCourseDetails` to fetch all module materials efficiently.
2. **Implement Missing Handlers for Job Queues**: Create worker handlers for `cleanupQueue` and `notificationQueue`.
3. **Implement Tutoring Sessions Module**: Build API endpoints for scheduling 1-on-1 sessions.

## Low Priority

1. **Add Missing Endpoints**: Implement `DELETE` for courses/modules and add Admin user detail endpoints.
2. **Implement Database Migration Framework**: Add Knex or Prisma migration tools.
3. **Add Audit Logging**: Track administrative actions.

---

# 🚀 BONUS ANALYSIS

### Redundant Code
* `app.ts` contains redundant 404 handler block before `errorMiddleware` which duplicates default Express routing behavior.

### Dead Code
* `sessions` table in `init.sql` is completely unused.

### Anti-Patterns
* Hardcoded manual SQL queries built with `string[]` concatenations in `CoursesService.updateCourse` over proper ORM/Query Builder abstractions.

### Quick Wins
* Remove `app.use('/uploads', express.static(...))` (1 line change).
* Add explicit handler throwing an error or correctly processing the missing jobs in `job-processor.ts`.
