/**
 * Redis has been removed from this project.
 *
 * Session management  →  MySQL `refresh_tokens` table
 * Background jobs     →  MySQL `scheduled_jobs` table + src/jobs/job-processor.ts
 *
 * This file is kept as an empty placeholder so any stale import produces a
 * clear compile-time error rather than a silent runtime failure.
 */
export {};
