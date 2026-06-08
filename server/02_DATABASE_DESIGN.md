# Database Requirements

Generate a complete Prisma schema.

Entities:

- users
- tutor_profiles
- subjects
- courses
- modules
- materials
- enrollments
- payments
- assessments
- submissions
- tutor_competency_tests
- sessions

Requirements:

- UUID primary keys
- Proper foreign keys
- Cascade deletes where specified
- Indexes on lookup fields
- Soft-delete strategy where applicable
- CreatedAt and UpdatedAt timestamps

Generate:
- prisma/schema.prisma
- migrations
- ERD documentation