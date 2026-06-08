# EduConnect Backend

## Mission
Build a production-ready backend for EduConnect, a tutoring platform connecting students and verified tutors.

## Core Users

### Student
- Register/login
- Browse courses
- Pay via M-Pesa
- Access learning materials
- Submit assessments
- Track progress

### Tutor
- Upload qualifications
- Complete competency tests
- Create courses
- Upload materials
- Grade submissions
- Schedule sessions

### Admin
- Verify tutors
- Grade competency tests
- Manage subjects
- Monitor revenue
- View analytics
- Manage platform health

## Technology Stack

- Node.js 20
- Express.js
- PostgreSQL 16
- Prisma ORM
- Redis
- BullMQ
- AWS S3 / Cloudflare R2
- JWT Authentication
- M-Pesa Daraja API
- SendGrid
- Docker

## Architecture Principles

- Feature-first architecture
- Thin controllers
- Service-layer business logic
- Repository pattern where appropriate
- Dependency injection ready
- Testability first
- Security by default