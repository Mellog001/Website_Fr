# System Architecture

## Backend Layers

Presentation Layer
- Routes
- Controllers
- Middleware

Business Layer
- Services
- Domain Logic
- Payment Logic
- Enrollment Logic

Infrastructure Layer
- Prisma
- Redis
- S3
- BullMQ
- SendGrid
- Daraja

## Modules

auth
students
courses
subjects
enrollments
payments
assessments
submissions
tutors
competency-tests
sessions
admin
analytics

## Design Rules

Controllers:
- Validate input
- Call service
- Return response

Services:
- Contain all business rules

Repositories:
- Database operations only

Never place business logic in controllers.